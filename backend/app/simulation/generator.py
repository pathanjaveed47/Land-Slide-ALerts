import asyncio
import datetime
import logging
import random
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from ..database.session import SessionLocal
from ..database.models import Station, SensorReading, Prediction, EvacuationOrder
from ..ml.predictor import LandslidePredictor
from ..services.alert_dispatcher import evaluate_station_risk
from ..services.geofence import generate_hazard_polygon
from ..websocket_manager import ws_manager

logger = logging.getLogger("landslide_sentinel.simulation")


class SensorSimulator:
    def __init__(self, interval_seconds: float = 2.5):
        self.interval_seconds = interval_seconds
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
        self.tick_counter = 0
        self.station_states: Dict[int, Dict[str, float]] = {}
        self.active_scenarios: Dict[int, Dict[str, Any]] = {}
        self.predictor = LandslidePredictor.get_instance()

    def _init_station_states(self, db: Session):
        stations = db.query(Station).filter(Station.is_active == True).all()
        for s in stations:
            latest_reading = (
                db.query(SensorReading)
                .filter(SensorReading.station_id == s.id)
                .order_by(SensorReading.timestamp.desc())
                .first()
            )
            if latest_reading:
                self.station_states[s.id] = {
                    "rainfall_rate": latest_reading.rainfall_rate,
                    "cumulative_rainfall_24h": latest_reading.cumulative_rainfall_24h,
                    "soil_moisture": latest_reading.soil_moisture,
                    "slope_angle": latest_reading.slope_angle,
                    "vibration_frequency": latest_reading.vibration_frequency,
                    "pore_water_pressure": latest_reading.pore_water_pressure,
                    "temperature": latest_reading.temperature,
                    "base_slope": s.base_slope
                }
            else:
                self.station_states[s.id] = {
                    "rainfall_rate": 8.0,
                    "cumulative_rainfall_24h": 35.0,
                    "soil_moisture": 50.0,
                    "slope_angle": s.base_slope,
                    "vibration_frequency": 0.35,
                    "pore_water_pressure": 22.0,
                    "temperature": 18.0,
                    "base_slope": s.base_slope
                }

    def trigger_scenario(self, station_id: Optional[int], scenario_type: str, duration_seconds: int = 180, intensity: float = 1.0):
        """
        Injects scenario into a single station or all stations.
        scenario_type: 'normal', 'cloudburst', 'pore_surge', 'seismic', 'escalating_demo'
        """
        db = SessionLocal()
        try:
            target_ids = [station_id] if station_id is not None else [s.id for s in db.query(Station).all()]
            for s_id in target_ids:
                if scenario_type.lower() in ["normal", "clear"]:
                    if s_id in self.active_scenarios:
                        del self.active_scenarios[s_id]
                    if s_id in self.station_states:
                        state = self.station_states[s_id]
                        state["rainfall_rate"] = 6.0
                        state["soil_moisture"] = 48.0
                        state["pore_water_pressure"] = 20.0
                        state["vibration_frequency"] = 0.3
                else:
                    self.active_scenarios[s_id] = {
                        "type": scenario_type.lower(),
                        "elapsed": 0,
                        "duration": duration_seconds,
                        "intensity": intensity
                    }
            logger.info(f"Triggered scenario '{scenario_type}' on stations: {target_ids}")
        finally:
            db.close()

    def _apply_step(self, station_id: int, s_info: Station) -> Dict[str, float]:
        state = self.station_states[station_id]
        base_slope = state["base_slope"]
        scenario = self.active_scenarios.get(station_id)

        if scenario:
            scenario["elapsed"] += self.interval_seconds
            s_type = scenario["type"]
            elapsed = scenario["elapsed"]
            intensity = scenario.get("intensity", 1.0)

            if s_type == "cloudburst":
                target_rain = 75.0 * intensity
                state["rainfall_rate"] += (target_rain - state["rainfall_rate"]) * 0.15 + random.uniform(-2, 3)
                state["cumulative_rainfall_24h"] += (state["rainfall_rate"] / 3600.0) * self.interval_seconds * 15.0
                state["soil_moisture"] = min(98.0, state["soil_moisture"] + 0.35 * intensity + random.uniform(-0.1, 0.2))
                state["pore_water_pressure"] = min(85.0, state["pore_water_pressure"] + 0.28 * intensity + random.uniform(-0.2, 0.3))
                state["vibration_frequency"] = max(0.2, state["vibration_frequency"] + random.uniform(-0.05, 0.08))
                state["slope_angle"] = min(base_slope + 7.5, state["slope_angle"] + 0.02)

            elif s_type == "pore_surge":
                state["pore_water_pressure"] = min(92.0, state["pore_water_pressure"] + 0.8 * intensity + random.uniform(-0.3, 0.5))
                state["soil_moisture"] = min(96.0, state["soil_moisture"] + 0.3 * intensity)
                state["rainfall_rate"] = max(10.0, state["rainfall_rate"] + random.uniform(-1, 1.5))
                state["vibration_frequency"] = max(0.2, state["vibration_frequency"] + random.uniform(-0.02, 0.05))

            elif s_type in ["seismic", "tremor"]:
                state["vibration_frequency"] = min(5.5, state["vibration_frequency"] + 0.6 * intensity + random.uniform(-0.2, 0.4))
                state["slope_angle"] = min(base_slope + 10.0, state["slope_angle"] + 0.05)
                state["pore_water_pressure"] += random.uniform(-0.2, 0.4)

            elif s_type in ["escalating_demo", "disaster_demo"]:
                frac = min(1.0, elapsed / 180.0)
                state["rainfall_rate"] = 5.0 + (90.0 * (frac ** 1.5)) + random.uniform(-2, 2)
                state["cumulative_rainfall_24h"] = 30.0 + (220.0 * (frac ** 1.3))
                state["soil_moisture"] = 45.0 + (51.0 * frac) + random.uniform(-0.5, 0.5)
                state["pore_water_pressure"] = 18.0 + (64.0 * (frac ** 1.2)) + random.uniform(-0.5, 0.5)
                state["slope_angle"] = base_slope + (8.0 * (frac ** 2)) + random.uniform(-0.1, 0.1)
                state["vibration_frequency"] = 0.3 + (3.5 * (frac ** 2.2)) + random.uniform(-0.1, 0.2)

            if elapsed >= scenario.get("duration", 180):
                del self.active_scenarios[station_id]
                logger.info(f"Scenario expired for station {station_id}")

        else:
            state["rainfall_rate"] = max(0.0, min(120.0, state["rainfall_rate"] + random.uniform(-0.8, 0.8)))
            state["cumulative_rainfall_24h"] = max(5.0, min(350.0, state["cumulative_rainfall_24h"] + (state["rainfall_rate"] * 0.001) - 0.02))
            state["soil_moisture"] = max(15.0, min(99.0, state["soil_moisture"] + random.uniform(-0.2, 0.2)))
            state["slope_angle"] = max(base_slope - 1.0, min(base_slope + 12.0, state["slope_angle"] + random.uniform(-0.02, 0.02)))
            state["vibration_frequency"] = max(0.1, min(6.0, state["vibration_frequency"] + random.uniform(-0.03, 0.03)))
            state["pore_water_pressure"] = max(5.0, min(95.0, state["pore_water_pressure"] + random.uniform(-0.2, 0.2)))
            state["temperature"] = max(5.0, min(38.0, state["temperature"] + random.uniform(-0.05, 0.05)))

        return {
            "rainfall_rate": round(max(0.0, state["rainfall_rate"]), 1),
            "cumulative_rainfall_24h": round(max(0.0, state["cumulative_rainfall_24h"]), 1),
            "soil_moisture": round(max(5.0, min(100.0, state["soil_moisture"])), 1),
            "slope_angle": round(state["slope_angle"], 1),
            "vibration_frequency": round(max(0.05, state["vibration_frequency"]), 2),
            "pore_water_pressure": round(max(0.0, state["pore_water_pressure"]), 1),
            "temperature": round(state["temperature"], 1)
        }

    async def _run_loop(self):
        logger.info("Simulator background loop started.")
        while self.is_running:
            try:
                await self._tick()
            except Exception as e:
                logger.exception(f"Error during simulator tick: {e}")
            await asyncio.sleep(self.interval_seconds)

    async def _tick(self):
        self.tick_counter += 1
        db = SessionLocal()
        try:
            stations = db.query(Station).filter(Station.is_active == True).all()
            if not self.station_states:
                self._init_station_states(db)

            broadcast_stations = []

            for s in stations:
                sensor_data = self._apply_step(s.id, s)
                now = datetime.datetime.now(datetime.timezone.utc)

                reading = SensorReading(
                    station_id=s.id,
                    timestamp=now,
                    **sensor_data
                )
                db.add(reading)
                db.flush()

                # Unified ML Prediction + Physics Factor of Safety
                stn_params = {
                    "cohesion_kpa": s.cohesion_kpa,
                    "friction_angle_deg": s.friction_angle_deg,
                    "failure_depth_m": s.failure_depth_m
                }
                pred_result = self.predictor.predict(sensor_data, stn_params)

                prediction = Prediction(
                    reading_id=reading.id,
                    station_id=s.id,
                    timestamp=now,
                    risk_score=pred_result["risk_score"],
                    risk_level=pred_result["risk_level"],
                    confidence=pred_result["confidence"],
                    factor_of_safety=pred_result["factor_of_safety"],
                    risk_t1h=pred_result["risk_t1h"],
                    risk_t6h=pred_result["risk_t6h"],
                    contributing_factors=pred_result["contributing_factors"]
                )
                db.add(prediction)
                db.flush()

                # Evaluate alerts and notifications
                alert_obj, is_new = evaluate_station_risk(s, reading, prediction, db)

                # Compute dynamic danger polygon if in Warning/Critical
                danger_polygon = None
                if prediction.risk_level in ["Warning", "Critical"] or prediction.factor_of_safety < 1.15:
                    radius = 8.0 if prediction.risk_level == "Critical" else 4.5
                    danger_polygon = generate_hazard_polygon(s.latitude, s.longitude, radius_km=radius)

                broadcast_stations.append({
                    "id": s.id,
                    "code": s.code,
                    "name": s.name,
                    "region": s.region,
                    "latitude": s.latitude,
                    "longitude": s.longitude,
                    "elevation": s.elevation,
                    "base_slope": s.base_slope,
                    "soil_type": s.soil_type,
                    "warning_threshold": s.warning_threshold,
                    "critical_threshold": s.critical_threshold,
                    "current_reading": {
                        "rainfall_rate": reading.rainfall_rate,
                        "cumulative_rainfall_24h": reading.cumulative_rainfall_24h,
                        "soil_moisture": reading.soil_moisture,
                        "slope_angle": reading.slope_angle,
                        "vibration_frequency": reading.vibration_frequency,
                        "pore_water_pressure": reading.pore_water_pressure,
                        "temperature": reading.temperature,
                        "timestamp": reading.timestamp.isoformat()
                    },
                    "current_prediction": {
                        "risk_score": prediction.risk_score,
                        "risk_level": prediction.risk_level,
                        "confidence": prediction.confidence,
                        "factor_of_safety": prediction.factor_of_safety,
                        "risk_t1h": prediction.risk_t1h,
                        "risk_t6h": prediction.risk_t6h,
                        "contributing_factors": prediction.contributing_factors,
                        "timestamp": prediction.timestamp.isoformat()
                    },
                    "hazard_polygon": danger_polygon
                })

            db.commit()

            # Broadcast full telemetry packet
            await ws_manager.broadcast({
                "type": "telemetry_update",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "tick": self.tick_counter,
                "stations": broadcast_stations,
                "active_scenarios": {str(k): v["type"] for k, v in self.active_scenarios.items()}
            })

        finally:
            db.close()

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._run_loop())
            logger.info("Simulator task started.")

    def stop(self):
        if self.is_running:
            self.is_running = False
            if self._task:
                self._task.cancel()
            logger.info("Simulator task stopped.")

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_running": self.is_running,
            "interval_seconds": self.interval_seconds,
            "ticks": self.tick_counter,
            "active_scenarios": {str(k): v["type"] for k, v in self.active_scenarios.items()}
        }


simulator = SensorSimulator()
