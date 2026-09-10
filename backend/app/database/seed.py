import datetime
import random
import uuid
from sqlalchemy.orm import Session
from .session import Base, engine, SessionLocal
from .models import Station, SensorReading, Prediction, AlertLog, NotificationLog, SOSReport
from ..ml.predictor import LandslidePredictor

SEED_STATIONS = [
    {
        "code": "STN-01",
        "name": "Meppadi Hill Slope",
        "region": "Western Ghats, Wayanad",
        "latitude": 11.5518,
        "longitude": 76.1265,
        "elevation": 940.0,
        "base_slope": 37.5,
        "soil_type": "Lateritic Colluvium",
        "cohesion_kpa": 9.2,
        "friction_angle_deg": 31.0,
        "failure_depth_m": 2.8,
        "warning_threshold": 55.0,
        "critical_threshold": 80.0,
        "base_rainfall": 12.0,
        "base_moisture": 62.0,
        "base_pore": 28.0,
        "base_vibe": 0.4
    },
    {
        "code": "STN-02",
        "name": "Joshimath Sector 4",
        "region": "Garhwal Himalayas, Chamoli",
        "latitude": 30.5562,
        "longitude": 79.5667,
        "elevation": 1890.0,
        "base_slope": 41.0,
        "soil_type": "Glacio-fluvial Moraine",
        "cohesion_kpa": 6.8,
        "friction_angle_deg": 34.0,
        "failure_depth_m": 3.2,
        "warning_threshold": 55.0,
        "critical_threshold": 78.0,
        "base_rainfall": 6.0,
        "base_moisture": 52.0,
        "base_pore": 24.0,
        "base_vibe": 0.5
    },
    {
        "code": "STN-03",
        "name": "Shimla Ridge Bypass",
        "region": "Himachal Shivalik Hills",
        "latitude": 31.1048,
        "longitude": 77.1734,
        "elevation": 2205.0,
        "base_slope": 34.0,
        "soil_type": "Fissured Schist & Silt",
        "cohesion_kpa": 11.5,
        "friction_angle_deg": 29.5,
        "failure_depth_m": 2.2,
        "warning_threshold": 55.0,
        "critical_threshold": 80.0,
        "base_rainfall": 4.0,
        "base_moisture": 45.0,
        "base_pore": 18.0,
        "base_vibe": 0.3
    },
    {
        "code": "STN-04",
        "name": "Darjeeling North Spur",
        "region": "Eastern Himalayas, West Bengal",
        "latitude": 27.0410,
        "longitude": 88.2663,
        "elevation": 2042.0,
        "base_slope": 39.0,
        "soil_type": "Weathered Phyllite & Clay",
        "cohesion_kpa": 8.0,
        "friction_angle_deg": 30.5,
        "failure_depth_m": 2.5,
        "warning_threshold": 55.0,
        "critical_threshold": 82.0,
        "base_rainfall": 24.0,
        "base_moisture": 76.0,
        "base_pore": 42.0,
        "base_vibe": 0.7
    },
    {
        "code": "STN-05",
        "name": "Munnar Gap Road Pass",
        "region": "Idukki Western Ghats",
        "latitude": 10.0889,
        "longitude": 77.0595,
        "elevation": 1530.0,
        "base_slope": 36.0,
        "soil_type": "Charnockite Colluvial Debris",
        "cohesion_kpa": 10.0,
        "friction_angle_deg": 33.0,
        "failure_depth_m": 2.6,
        "warning_threshold": 55.0,
        "critical_threshold": 80.0,
        "base_rainfall": 15.0,
        "base_moisture": 68.0,
        "base_pore": 32.0,
        "base_vibe": 0.45
    },
    {
        "code": "STN-06",
        "name": "Rishikesh-Badrinath Highway KM-42",
        "region": "Garhwal Shivaliks, Tehri",
        "latitude": 30.1450,
        "longitude": 78.3610,
        "elevation": 540.0,
        "base_slope": 44.0,
        "soil_type": "Fractured Sandstone & Talus",
        "cohesion_kpa": 5.5,
        "friction_angle_deg": 35.0,
        "failure_depth_m": 3.5,
        "warning_threshold": 50.0,
        "critical_threshold": 75.0,
        "base_rainfall": 8.0,
        "base_moisture": 58.0,
        "base_pore": 26.0,
        "base_vibe": 0.6
    }
]


def seed_database():
    db: Session = SessionLocal()
    try:
        # Check if already seeded
        existing_count = db.query(Station).count()
        if existing_count >= len(SEED_STATIONS):
            return

        predictor = LandslidePredictor.get_instance()
        now = datetime.datetime.now(datetime.timezone.utc)

        for s_data in SEED_STATIONS:
            station = Station(
                code=s_data["code"],
                name=s_data["name"],
                region=s_data["region"],
                latitude=s_data["latitude"],
                longitude=s_data["longitude"],
                elevation=s_data["elevation"],
                base_slope=s_data["base_slope"],
                soil_type=s_data["soil_type"],
                cohesion_kpa=s_data["cohesion_kpa"],
                friction_angle_deg=s_data["friction_angle_deg"],
                failure_depth_m=s_data["failure_depth_m"],
                warning_threshold=s_data["warning_threshold"],
                critical_threshold=s_data["critical_threshold"],
                created_at=now - datetime.timedelta(hours=24)
            )
            db.add(station)
            db.flush()

            # Seed 30 minutes of historical readings (every 2.5 mins = 12 points)
            for i in range(12, -1, -1):
                timestamp = now - datetime.timedelta(seconds=i * 150)
                reading_data = {
                    "rainfall_rate": round(max(0.0, s_data["base_rainfall"] + random.uniform(-2.5, 3.5)), 1),
                    "cumulative_rainfall_24h": round(max(5.0, s_data["base_rainfall"] * 3.5 + random.uniform(-4.0, 5.0)), 1),
                    "soil_moisture": round(max(20.0, min(95.0, s_data["base_moisture"] + random.uniform(-3.0, 3.0))), 1),
                    "slope_angle": round(s_data["base_slope"] + random.uniform(-0.3, 0.4), 1),
                    "vibration_frequency": round(max(0.1, s_data["base_vibe"] + random.uniform(-0.1, 0.15)), 2),
                    "pore_water_pressure": round(max(5.0, s_data["base_pore"] + random.uniform(-2.5, 3.0)), 1),
                    "temperature": round(21.0 - (s_data["elevation"] / 200.0) + random.uniform(-0.5, 0.5), 1)
                }

                reading = SensorReading(
                    station_id=station.id,
                    timestamp=timestamp,
                    **reading_data
                )
                db.add(reading)
                db.flush()

                stn_params = {
                    "cohesion_kpa": station.cohesion_kpa,
                    "friction_angle_deg": station.friction_angle_deg,
                    "failure_depth_m": station.failure_depth_m
                }
                pred_result = predictor.predict(reading_data, stn_params)

                prediction = Prediction(
                    reading_id=reading.id,
                    station_id=station.id,
                    timestamp=timestamp,
                    risk_score=pred_result["risk_score"],
                    risk_level=pred_result["risk_level"],
                    confidence=pred_result["confidence"],
                    factor_of_safety=pred_result["factor_of_safety"],
                    risk_t1h=pred_result["risk_t1h"],
                    risk_t6h=pred_result["risk_t6h"],
                    contributing_factors=pred_result["contributing_factors"]
                )
                db.add(prediction)

        # Seed Sample Citizen SOS Reports (from SIH2 crowdsource taxonomy)
        sample_reports = [
            {
                "reporter_id": "CITIZEN_WAYANAD_04",
                "text": "Muddy springs bubbling from slope toe near coffee plantation, water turned dark brown.",
                "latitude": 11.5580,
                "longitude": 76.1310,
                "is_valid_hazard": True,
                "is_spam": False,
                "confidence": 0.94,
                "detected_category": "HYDROLOGICAL_ANOMALY",
                "verification_status": "VERIFIED",
                "reviewed_by": "CIVIL_DEFENSE_AUTHORITY",
                "reviewed_at": now - datetime.timedelta(minutes=45)
            },
            {
                "reporter_id": "OBSERVER_CHAMOLI_12",
                "text": "Fresh tension cracks widening behind the secondary highway retaining wall and roadside trees tilting.",
                "latitude": 30.5600,
                "longitude": 79.5700,
                "is_valid_hazard": True,
                "is_spam": False,
                "confidence": 0.96,
                "detected_category": "SLOPE_DEFORMATION",
                "verification_status": "PENDING",
                "reviewed_by": None,
                "reviewed_at": None
            },
            {
                "reporter_id": "SPAM_BOT_99",
                "text": "Get massive crypto casino bonus 500% discount visit https://fake-tokens.io today!",
                "latitude": 30.1450,
                "longitude": 78.3610,
                "is_valid_hazard": False,
                "is_spam": True,
                "confidence": 0.99,
                "detected_category": "SPAM_IRRELEVANT",
                "verification_status": "REJECTED",
                "reviewed_by": "AUTOMATED_NLP_PREFILTER",
                "reviewed_at": now - datetime.timedelta(hours=2)
            }
        ]

        for rep in sample_reports:
            sos = SOSReport(
                report_uuid=str(uuid.uuid4()),
                reporter_id=rep["reporter_id"],
                text=rep["text"],
                latitude=rep["latitude"],
                longitude=rep["longitude"],
                timestamp=now - datetime.timedelta(minutes=random.randint(10, 120)),
                is_valid_hazard=rep["is_valid_hazard"],
                is_spam=rep["is_spam"],
                confidence=rep["confidence"],
                detected_category=rep["detected_category"],
                verification_status=rep["verification_status"],
                reviewed_by=rep["reviewed_by"],
                reviewed_at=rep["reviewed_at"],
                alert_broadcasted=rep["is_valid_hazard"]
            )
            db.add(sos)

        db.commit()
    finally:
        db.close()
