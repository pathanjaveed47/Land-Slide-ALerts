"""
Comprehensive Automated Verification Test Suite for Unified Landslide Early Warning System.
Combines and verifies all capabilities from SIH (LandSlide Sentinel) and SIH2 (GeoSentinel AI).
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import Base, engine
from backend.app.database.seed import seed_database
from backend.app.services.geotechnical_engine import geotechnical_engine
from backend.app.services.nlp_spam_filter import nlp_classifier
from backend.app.services.geofence import calculate_haversine_distance, generate_hazard_polygon, is_within_geofence

# Ensure tables and seed data exist before running tests
Base.metadata.create_all(bind=engine)
seed_database()


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_system_health(client):
    """Verify system health endpoint and operational status."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert "simulation" in data
    assert "endpoints" in data
    print("\n[PASS] System health operational.")


def test_stations_registry_and_physics(client):
    """Verify all 6 Himalayan & Western Ghats stations with geotechnical physics FS and multi-horizons."""
    response = client.get("/api/stations")
    assert response.status_code == 200
    stations = response.json()
    assert len(stations) == 6, f"Expected 6 stations, got {len(stations)}"

    for s in stations:
        assert "code" in s
        assert "name" in s
        assert "latitude" in s
        assert "longitude" in s
        assert "elevation" in s
        assert "current_reading" in s and s["current_reading"] is not None
        assert "current_prediction" in s and s["current_prediction"] is not None

        pred = s["current_prediction"]
        assert "risk_score" in pred
        assert "risk_level" in pred
        assert "factor_of_safety" in pred
        assert pred["factor_of_safety"] > 0.0
        assert "risk_t1h" in pred
        assert "risk_t6h" in pred

    print(f"\n[PASS] All {len(stations)} monitoring stations verified with Factor of Safety and Multi-Horizon predictions.")


def test_geotechnical_infinite_slope_stability():
    """Verify limit-equilibrium Factor of Safety (FS) physics engine."""
    # Baseline dry slope (stable)
    fs_dry = geotechnical_engine.compute_factor_of_safety(
        slope_angle_deg=28.0,
        pore_pressure_kpa=8.0,
        soil_moisture_percent=35.0,
        cohesion_kpa=10.0,
        friction_angle_deg=33.0,
        failure_depth_m=2.5
    )
    assert fs_dry > 1.30, f"Expected stable slope (FS > 1.30), got {fs_dry}"

    # Critical storm cloudburst + pore water surge (imminent shear failure)
    fs_critical = geotechnical_engine.compute_factor_of_safety(
        slope_angle_deg=42.0,
        pore_pressure_kpa=55.0,
        soil_moisture_percent=94.0,
        cohesion_kpa=6.0,
        friction_angle_deg=28.0,
        failure_depth_m=3.0
    )
    assert fs_critical < 1.05, f"Expected shear failure (FS < 1.05), got {fs_critical}"
    print(f"\n[PASS] Geotechnical Physics Engine verified: Dry FS={fs_dry} -> Storm Cloudburst FS={fs_critical}")


def test_ml_model_metrics_and_ad_hoc_predict(client):
    """Verify ML model introspection metrics and ad-hoc inference."""
    metrics_res = client.get("/api/model/metrics")
    assert metrics_res.status_code == 200
    metrics = metrics_res.json()
    assert "accuracy" in metrics
    assert metrics["accuracy"] >= 0.90

    # Catastrophic telemetry input
    telemetry_payload = {
        "rainfall_rate": 85.0,
        "cumulative_rainfall_24h": 210.0,
        "soil_moisture": 95.0,
        "slope_angle": 44.0,
        "vibration_frequency": 3.8,
        "pore_water_pressure": 65.0,
        "temperature": 15.5
    }
    pred_res = client.post("/api/model/predict", json=telemetry_payload)
    assert pred_res.status_code == 200
    pred = pred_res.json()
    assert pred["risk_level"] == "Critical"
    assert pred["risk_score"] >= 80.0
    assert pred["factor_of_safety"] < 1.05
    assert len(pred["contributing_factors"]) >= 2
    print(f"\n[PASS] ML Predictor & Geotechnical Pipeline verified: Catastrophic score={pred['risk_score']}, FS={pred['factor_of_safety']:.2f}")


def test_citizen_sos_nlp_hazard_classification(client):
    """Verify Flan-T5 & geotechnical domain NLP accurately classifies morphological hazard reports."""
    report_data = {
        "reporter_id": "FIELD_OFFICER_CHAMOLI",
        "text": "Muddy springs bubbling from slope base near road and tension cracks widening visibly.",
        "latitude": 30.5562,
        "longitude": 79.5667
    }
    response = client.post("/api/sos/report", json=report_data)
    assert response.status_code == 201
    res = response.json()
    assert res["is_valid_hazard"] is True
    assert res["is_spam"] is False
    assert res["confidence"] >= 0.70
    assert res["detected_category"] in ["HYDROLOGICAL_ANOMALY", "SLOPE_DEFORMATION"]
    assert res["verification_status"] == "PENDING"
    print(f"\n[PASS] Citizen SOS NLP verified: Recognized '{res['detected_category']}' with {res['confidence']*100:.0f}% confidence.")


def test_citizen_sos_nlp_spam_filter(client):
    """Verify NLP pre-filter detects and discards commercial spam / noise."""
    spam_data = {
        "reporter_id": "SPAMMER_BOT",
        "text": "Claim your free crypto bonus casino discount 50% off visit http://scam-token.xyz now!",
        "latitude": 28.6139,
        "longitude": 77.2090
    }
    response = client.post("/api/sos/report", json=spam_data)
    assert response.status_code == 201
    res = response.json()
    assert res["is_valid_hazard"] is False
    assert res["is_spam"] is True
    assert res["detected_category"] == "SPAM_IRRELEVANT"
    assert res["verification_status"] == "REJECTED"
    print("\n[PASS] NLP Spam Filter verified: Discarded promotional noise.")


def test_authority_sos_verification_workflow(client):
    """Verify Authority mode toggle and report verification."""
    # 1. Fetch reports
    list_res = client.get("/api/sos/reports?status=PENDING")
    assert list_res.status_code == 200
    reports = list_res.json()
    if reports:
        target_id = reports[0]["id"]
        # 2. Verify report as authority
        verify_res = client.post(f"/api/sos/reports/{target_id}/verify", json={
            "verification_status": "VERIFIED",
            "reviewer": "DISTRICT_COLLECTOR"
        })
        assert verify_res.status_code == 200
        assert verify_res.json()["verification_status"] == "VERIFIED"
        print(f"\n[PASS] Authority SOS verification workflow verified on report {target_id}.")


def test_authority_mass_evacuation_trigger(client):
    """Verify Disaster Response Authority Mass Evacuation order."""
    evac_payload = {
        "sector_name": "Garhwal-Chamoli Test Sector",
        "latitude": 30.5562,
        "longitude": 79.5667,
        "radius_km": 12.0,
        "reason": "Limit equilibrium collapse threshold breached (FS=0.88). Immediate evacuation.",
        "authorized_by": "CHIEF_DISASTER_OFFICER"
    }
    response = client.post("/api/evacuation/trigger", json=evac_payload)
    assert response.status_code == 200
    evac = response.json()
    assert evac["sector_name"] == "Garhwal-Chamoli Test Sector"
    assert evac["evacuation_level"] == "IMMEDIATE_RED"
    assert len(evac["polygon_coordinates"]) >= 8
    print(f"\n[PASS] Authority Mass Evacuation verified: Created order {evac['order_uuid']} with 8-vertex danger polygon.")


def test_spatial_haversine_and_hazard_polygon():
    """Verify spherical Haversine formula and organic polygon generation."""
    dist = calculate_haversine_distance(30.155, 78.245, 30.5562, 79.5667)
    assert 40.0 < dist < 150.0
    assert is_within_geofence(30.155, 78.245, 30.160, 78.250, radius_km=25.0) is True
    assert is_within_geofence(30.155, 78.245, 11.5518, 76.1265, radius_km=25.0) is False

    polygon = generate_hazard_polygon(30.5562, 79.5667, radius_km=10.0, vertices=8)
    assert len(polygon) == 9  # 8 vertices + closed point
    print(f"\n[PASS] Spatial Haversine Geofencing verified (distance={dist}km) and danger polygon generated.")


def test_simulation_scenario_injection(client):
    """Verify injection of cloudburst and escalating demo scenarios."""
    scenarios = ["cloudburst", "pore_surge", "seismic", "normal"]
    for scn in scenarios:
        res = client.post("/api/simulation/scenario", json={
            "scenario": scn,
            "station_id": 1,
            "duration_seconds": 120
        })
        assert res.status_code == 200
        assert res.json()["status"] == "success"

    print("\n[PASS] Simulation engine scenario injection verified across all triggers.")
