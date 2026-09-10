"""
Automated Unit and Integration Tests for GeoSentinel AI Django Monolith.

Tests:
1. MongoEngine Document model instantiation and dictionary serialization.
2. Scikit-Learn Random Forest multi-horizon risk scoring.
3. Hugging Face Flan-T5 / Geotechnical NLP spam classification.
4. Role-based Authority view security (Evacuation trigger and SOS verification).
5. Channels WebSocket consumer async connection and telemetry broadcasting.
"""

import json
import pytest
from django.test import Client
from django.urls import reverse
from channels.testing import WebsocketCommunicator

from landslide_monolith.asgi import application
from monitoring.models import SensorData, SOSReport
from monitoring.ml_service import ml_service
from monitoring.nlp_service import nlp_filter


@pytest.mark.django_db
def test_dashboard_view_renders():
    """Verify that the dashboard view renders index.html with HTTP 200."""
    client = Client()
    response = client.get(reverse('monitoring:dashboard'))
    assert response.status_code == 200
    assert b"GeoSentinel AI" in response.content
    assert b"Leaflet" in response.content or b"map" in response.content


def test_sensor_data_document_model():
    """Verify MongoEngine SensorData document instantiation and fields."""
    sensor = SensorData(
        station_id="STATION-TEST-01",
        cumulative_rainfall=120.5,
        soil_moisture=82.0,
        acceleration_rate=3.4,
        latitude=30.155,
        longitude=78.245,
        risk_score_t1h=0.75,
        risk_score_t6h=0.82,
        risk_level="Warning"
    )
    data = sensor.to_dict()
    assert data["station_id"] == "STATION-TEST-01"
    assert data["cumulative_rainfall"] == 120.5
    assert data["risk_level"] == "Warning"


def test_sos_report_document_model():
    """Verify MongoEngine SOSReport document model."""
    sos = SOSReport(
        user_id="CITIZEN_007",
        text_description="Muddy springs bubbling from slope base.",
        latitude=30.155,
        longitude=78.245,
        verification_status="Pending",
        is_spam=False,
        detected_category="HYDROLOGICAL_ANOMALY"
    )
    data = sos.to_dict()
    assert data["user_id"] == "CITIZEN_007"
    assert data["verification_status"] == "Pending"
    assert data["detected_category"] == "HYDROLOGICAL_ANOMALY"


def test_ml_risk_service_scoring():
    """Verify Random Forest scoring under dry weather vs cloudburst conditions."""
    # Dry baseline
    safe_result = ml_service.predict_risk(cumulative_rainfall=10.0, soil_moisture=20.0, acceleration_rate=0.1)
    assert safe_result["risk_level"] in ["Safe", "Advisory"]
    assert safe_result["risk_score_t1h"] < 0.50

    # Critical storm trigger
    critical_result = ml_service.predict_risk(cumulative_rainfall=190.0, soil_moisture=95.0, acceleration_rate=7.5)
    assert critical_result["risk_level"] == "Critical"
    assert critical_result["risk_score_t1h"] > 0.40


def test_nlp_spam_filter_evaluations():
    """Verify Hugging Face NLP classifier distinguishes geotechnical hazards from spam."""
    # Genuine hazard
    hazard_res = nlp_filter.evaluate_sos_text("Fresh tension cracks forming across retaining wall and trees tilting.")
    assert hazard_res["is_spam"] is False
    assert hazard_res["detected_category"] == "SLOPE_DEFORMATION"

    # Spam promotion
    spam_res = nlp_filter.evaluate_sos_text("Huge crypto casino discount! Click https://scam-tokens.xyz for free bonus.")
    assert spam_res["is_spam"] is True
    assert spam_res["detected_category"] == "SPAM_PROMOTION"


@pytest.mark.django_db
def test_authority_evacuation_permission_blocked_for_observers():
    """Verify unauthorized users receive HTTP 403 when trying to trigger mass evacuation."""
    client = Client()
    response = client.post(
        reverse('monitoring:trigger_evacuation'),
        data=json.dumps({"zone_name": "Sector 4"}),
        content_type="application/json"
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_websocket_channels_telemetry_flow():
    """Verify Channels WebSocket connection and automated AI risk level updates."""
    communicator = WebsocketCommunicator(application, "/ws/telemetry/")
    connected, subprotocol = await communicator.connect()
    assert connected is True

    # Receive connection ack
    ack_response = await communicator.receive_json_from()
    assert ack_response["type"] == "connection_ack"

    # Send simulation event
    await communicator.send_json_to({
        "type": "simulate_telemetry",
        "station_id": "WS_TEST_NODE",
        "cumulative_rainfall": 175.0,
        "soil_moisture": 92.0,
        "acceleration_rate": 6.2,
        "latitude": 30.155,
        "longitude": 78.245
    })

    # Receive broadcasted risk update with danger polygon
    update_response = await communicator.receive_json_from(timeout=5)
    assert update_response["stream"] == "automated_ai_risk"
    assert update_response["data"]["risk_level"] in ["Warning", "Critical"]
    assert update_response["danger_polygon"] is not None
    assert len(update_response["danger_polygon"]) >= 8

    await communicator.disconnect()
