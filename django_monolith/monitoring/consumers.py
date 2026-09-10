"""
Django Channels Asynchronous WebSocket Consumer.

Handles two concurrent real-time streams:
1. Automated AI Risk Level Updates (Advisory, Watch, Warning, Critical) with dynamic danger zone geometry.
2. Localized SOS Alerts filtered dynamically by spherical Haversine distance radius (geofencing).
"""

import math
import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from asgiref.sync import sync_to_async

from monitoring.ml_service import ml_service
from monitoring.models import SensorData

logger = logging.getLogger("monitoring.consumers")


def calculate_haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in kilometers."""
    radius_earth_km = 6371.0

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return radius_earth_km * c


def generate_hazard_polygon(center_lat: float, center_lon: float, radius_meters: float = 800.0):
    """Generates a closed polygonal danger boundary around a critical failure zone."""
    points = []
    # 8-vertex polygonal approximation of critical runout / debris fan zone
    for angle in range(0, 360, 45):
        rad = math.radians(angle)
        # 1 deg latitude ~ 111.32 km, 1 deg longitude ~ 111.32 km * cos(lat)
        offset_lat = (radius_meters / 111320.0) * math.sin(rad)
        offset_lon = (radius_meters / (111320.0 * math.cos(math.radians(center_lat)))) * math.cos(rad)
        points.append([round(center_lat + offset_lat, 6), round(center_lon + offset_lon, 6)])
    points.append(points[0])  # Close polygon
    return points


class LandslideTelemetryConsumer(AsyncJsonWebsocketConsumer):
    GLOBAL_GROUP_NAME = "landslide_global_alerts"

    async def connect(self):
        """Accepts connection, registers client in broadcast group, and stores default location."""
        self.client_lat = None
        self.client_lon = None
        self.alert_radius_km = 25.0  # Default 25km notification radius

        # Join the global alerts channel layer group
        await self.channel_layer.group_add(
            self.GLOBAL_GROUP_NAME,
            self.channel_name
        )
        await self.accept()
        logger.info(f"WebSocket client connected: {self.channel_name}")

        await self.send_json({
            "type": "connection_ack",
            "message": "Connected to GeoSentinel real-time early warning stream.",
            "available_streams": ["automated_ai_risk", "localized_sos_alert"]
        })

    async def disconnect(self, close_code):
        """Leaves channel group on client disconnect."""
        await self.channel_layer.group_discard(
            self.GLOBAL_GROUP_NAME,
            self.channel_name
        )
        logger.info(f"WebSocket client disconnected: {self.channel_name}")

    async def receive_json(self, content):
        """
        Handles incoming messages from frontend client or simulator:
        - `register_location`: Sets client coordinates for localized Haversine filtering.
        - `simulate_telemetry`: Ingests simulated telemetry reading and broadcasts AI risk.
        """
        msg_type = content.get("type")

        # 1. Register Client Geolocation for localized geofencing
        if msg_type == "register_location":
            self.client_lat = float(content.get("latitude", 30.155))
            self.client_lon = float(content.get("longitude", 78.245))
            self.alert_radius_km = float(content.get("radius_km", 25.0))
            await self.send_json({
                "type": "location_registered",
                "status": "success",
                "client_coordinates": [self.client_lat, self.client_lon],
                "alert_radius_km": self.alert_radius_km
            })

        # 2. Interactive Telemetry Ingestion / Simulator Event
        elif msg_type == "simulate_telemetry":
            rain = float(content.get("cumulative_rainfall", 20.0))
            moisture = float(content.get("soil_moisture", 30.0))
            accel = float(content.get("acceleration_rate", 0.3))
            lat = float(content.get("latitude", 30.155))
            lon = float(content.get("longitude", 78.245))
            station_id = content.get("station_id", "STATION-SIMULATED-01")

            ml_result = ml_service.predict_risk(rain, moisture, accel)

            # 1. Broadcast immediately to all clients in group (<5ms latency)
            payload = {
                "station_id": station_id,
                "latitude": lat,
                "longitude": lon,
                "cumulative_rainfall": rain,
                "soil_moisture": moisture,
                "acceleration_rate": accel,
                "risk_score_t1h": ml_result["risk_score_t1h"],
                "risk_score_t6h": ml_result["risk_score_t6h"],
                "risk_level": ml_result["risk_level"]
            }
            await self.channel_layer.group_send(
                self.GLOBAL_GROUP_NAME,
                {
                    "type": "risk_update_broadcast",
                    "payload": payload
                }
            )

            # 2. Persist to MongoDB asynchronously in background
            try:
                await sync_to_async(self._save_sensor_doc)(
                    station_id, rain, moisture, accel, lat, lon, ml_result
                )
            except Exception as e:
                logger.warning(f"Background mongo persist failed: {e}")

    def _save_sensor_doc(self, station_id, rain, moisture, accel, lat, lon, ml_result):
        try:
            doc = SensorData(
                station_id=station_id,
                cumulative_rainfall=rain,
                soil_moisture=moisture,
                acceleration_rate=accel,
                latitude=lat,
                longitude=lon,
                risk_score_t1h=ml_result["risk_score_t1h"],
                risk_score_t6h=ml_result["risk_score_t6h"],
                risk_level=ml_result["risk_level"]
            )
            doc.save()
        except Exception as e:
            logger.warning(f"Error saving sensor doc from WebSocket: {e}")

    # --------------------------------------------------------------------------
    # STREAM 1: Automated AI Risk Level Updates
    # --------------------------------------------------------------------------
    async def risk_update_broadcast(self, event):
        """
        Receives group broadcast of AI risk score updates.
        Pushes formatted payload to client with dynamic hazard polygon if Critical Warning.
        """
        payload = event["payload"]
        risk_level = payload.get("risk_level", "Safe")

        # Dynamically append danger zone polygon geometry for Critical / Warning states
        danger_polygon = None
        if risk_level in ["Warning", "Critical"]:
            danger_polygon = generate_hazard_polygon(
                center_lat=payload["latitude"],
                center_lon=payload["longitude"],
                radius_meters=1200.0 if risk_level == "Critical" else 600.0
            )

        response_data = {
            "stream": "automated_ai_risk",
            "type": "risk_level_update",
            "data": payload,
            "danger_polygon": danger_polygon,
            "is_critical": risk_level == "Critical",
            "evacuation_recommended": risk_level == "Critical"
        }
        await self.send_json(response_data)

    # --------------------------------------------------------------------------
    # STREAM 2: Localized SOS Alerts (Haversine Geofenced)
    # --------------------------------------------------------------------------
    async def localized_sos_broadcast(self, event):
        """
        Filters and forwards SOS alerts to clients based on Haversine distance geofencing.
        """
        report_data = event["payload"]
        report_lat = report_data.get("latitude")
        report_lon = report_data.get("longitude")

        distance_km = None
        is_within_radius = True

        if self.client_lat is not None and self.client_lon is not None and report_lat and report_lon:
            distance_km = calculate_haversine_distance_km(
                self.client_lat, self.client_lon, report_lat, report_lon
            )
            is_within_radius = distance_km <= self.alert_radius_km

        # Deliver alert if client is within localized geofence or has no registered position (global monitor)
        if is_within_radius:
            await self.send_json({
                "stream": "localized_sos_alert",
                "type": "sos_incident",
                "data": report_data,
                "distance_km": round(distance_km, 2) if distance_km is not None else None,
                "localized_notification": distance_km is not None
            })
