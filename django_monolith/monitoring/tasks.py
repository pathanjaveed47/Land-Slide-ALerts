"""
Celery Background Tasks for Geotechnical Telemetry Polling and AI Evaluation.

Tasks:
1. `fetch_and_evaluate_sensor_telemetry`: Periodic 10-minute task fetching weather/sensor
   readings, calculating multi-horizon ML risk scores, saving to MongoDB, and broadcasting over Channels.
2. `process_sos_report_nlp`: Asynchronous evaluation of citizen SOS submissions via
   Hugging Face Flan-T5, flagging spam and triggering localized alerts.
"""

import random
import logging
from datetime import datetime, timezone
from celery import shared_task
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from monitoring.models import SensorData, SOSReport
from monitoring.ml_service import ml_service
from monitoring.nlp_service import nlp_filter

logger = logging.getLogger("monitoring.tasks")


def _mock_fetch_mountain_sensor_readings():
    """
    Simulates fetching in-situ slope telemetry from an external IoT/AWS/weather API.
    Provides data for a series of monitored mountain slope telemetry nodes.
    """
    stations = [
        {"station_id": "STATION-CHAMOLI-01", "lat": 30.155, "lon": 78.245, "slope_deg": 38.0},
        {"station_id": "STATION-WAYANAD-02", "lat": 11.685, "lon": 76.132, "slope_deg": 35.0},
        {"station_id": "STATION-NILGIRIS-03", "lat": 11.410, "lon": 76.695, "slope_deg": 32.0},
    ]

    sampled_station = random.choice(stations)

    # Simulate realistic meteorological condition with stochastic storm events
    is_storm = random.random() < 0.25
    if is_storm:
        cumulative_rainfall = round(random.uniform(90.0, 195.0), 1)
        soil_moisture = round(random.uniform(75.0, 96.0), 1)
        acceleration_rate = round(random.uniform(2.5, 7.8), 2)
    else:
        cumulative_rainfall = round(random.uniform(5.0, 45.0), 1)
        soil_moisture = round(random.uniform(20.0, 58.0), 1)
        acceleration_rate = round(random.uniform(0.1, 0.9), 2)

    return {
        "station_id": sampled_station["station_id"],
        "latitude": sampled_station["lat"],
        "longitude": sampled_station["lon"],
        "slope_angle_deg": sampled_station["slope_deg"],
        "cumulative_rainfall": cumulative_rainfall,
        "soil_moisture": soil_moisture,
        "acceleration_rate": acceleration_rate,
        "timestamp": datetime.now(timezone.utc)
    }


@shared_task(name="monitoring.tasks.fetch_and_evaluate_sensor_telemetry")
def fetch_and_evaluate_sensor_telemetry():
    """
    Scheduled Celery task executing every 10 minutes.
    1. Ingests weather & telemetry data.
    2. Executes Scikit-Learn Random Forest multi-horizon inference.
    3. Persists reading to MongoDB.
    4. Pushes real-time risk updates via Django Channels.
    """
    logger.info("Executing scheduled 10-minute sensor telemetry polling...")
    raw_data = _mock_fetch_mountain_sensor_readings()

    # Calculate multi-horizon risk (T+1h and T+6h) using Random Forest model
    ml_result = ml_service.predict_risk(
        cumulative_rainfall=raw_data["cumulative_rainfall"],
        soil_moisture=raw_data["soil_moisture"],
        acceleration_rate=raw_data["acceleration_rate"],
        slope_angle_deg=raw_data["slope_angle_deg"]
    )

    # Save to MongoDB via MongoEngine
    try:
        sensor_doc = SensorData(
            station_id=raw_data["station_id"],
            cumulative_rainfall=raw_data["cumulative_rainfall"],
            soil_moisture=raw_data["soil_moisture"],
            acceleration_rate=raw_data["acceleration_rate"],
            timestamp=raw_data["timestamp"],
            latitude=raw_data["latitude"],
            longitude=raw_data["longitude"],
            risk_score_t1h=ml_result["risk_score_t1h"],
            risk_score_t6h=ml_result["risk_score_t6h"],
            risk_level=ml_result["risk_level"]
        )
        sensor_doc.save()
        logger.info(f"Persisted sensor document {sensor_doc.id} with risk level '{ml_result['risk_level']}'.")
    except Exception as e:
        logger.warning(f"MongoDB persistence warning: {e}")

    # Broadcast risk level update to all active dashboard subscribers via Django Channels
    channel_layer = get_channel_layer()
    if channel_layer:
        broadcast_payload = {
            "type": "risk_update_broadcast",
            "payload": {
                "station_id": raw_data["station_id"],
                "latitude": raw_data["latitude"],
                "longitude": raw_data["longitude"],
                "cumulative_rainfall": raw_data["cumulative_rainfall"],
                "soil_moisture": raw_data["soil_moisture"],
                "acceleration_rate": raw_data["acceleration_rate"],
                "risk_score_t1h": ml_result["risk_score_t1h"],
                "risk_score_t6h": ml_result["risk_score_t6h"],
                "risk_level": ml_result["risk_level"],
                "timestamp": raw_data["timestamp"].isoformat(),
            }
        }
        try:
            async_to_sync(channel_layer.group_send)(
                "landslide_global_alerts",
                broadcast_payload
            )
            logger.info(f"Broadcasted risk level {ml_result['risk_level']} over Channels.")
        except Exception as e:
            logger.error(f"Channels broadcast error: {e}")

    return {
        "status": "success",
        "station_id": raw_data["station_id"],
        "risk_level": ml_result["risk_level"],
        "risk_score_t1h": ml_result["risk_score_t1h"]
    }


@shared_task(name="monitoring.tasks.process_sos_report_nlp")
def process_sos_report_nlp(report_id: str):
    """
    Evaluates incoming citizen SOS report using Hugging Face Flan-T5 pipeline.
    Flags spam/irrelevant inputs and triggers localized WebSocket broadcasts.
    """
    logger.info(f"Processing NLP evaluation for SOS Report {report_id}...")
    try:
        report = SOSReport.objects.get(id=report_id)
    except Exception as e:
        logger.error(f"SOS report {report_id} not found: {e}")
        return {"status": "error", "message": "Report not found"}

    # Run Hugging Face NLP Classification
    nlp_res = nlp_filter.evaluate_sos_text(report.text_description)
    report.is_spam = nlp_res["is_spam"]
    report.spam_confidence = nlp_res["spam_confidence"]
    report.detected_category = nlp_res["detected_category"]
    report.save()

    logger.info(
        f"SOS {report_id} classified: is_spam={report.is_spam} "
        f"({report.detected_category}, conf={report.spam_confidence:.2f})"
    )

    # If authentic hazard precursor, broadcast localized alert
    if not report.is_spam:
        channel_layer = get_channel_layer()
        if channel_layer:
            alert_payload = {
                "type": "localized_sos_broadcast",
                "payload": report.to_dict()
            }
            try:
                async_to_sync(channel_layer.group_send)(
                    "landslide_global_alerts",
                    alert_payload
                )
                logger.info(f"Broadcasted localized SOS alert for report {report_id}")
            except Exception as e:
                logger.error(f"Failed broadcasting SOS alert: {e}")

    return {
        "report_id": report_id,
        "is_spam": report.is_spam,
        "category": report.detected_category
    }
