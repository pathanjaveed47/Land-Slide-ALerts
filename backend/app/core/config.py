import os
from typing import List

class Settings:
    PROJECT_NAME: str = "GeoSentinel AI & LandSlide Sentinel - Unified Landslide Early Warning System"
    VERSION: str = "2.0.0"
    API_PREFIX: str = "/api"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False

    # Global host/origin configuration
    GLOBAL_HOST: str = os.getenv("GLOBAL_HOST", "http://127.0.0.1:8000")
    GLOBAL_HOST_NO_PORT: str = GLOBAL_HOST.replace(":8000", "") if GLOBAL_HOST.endswith(":8000") else GLOBAL_HOST
    CORS_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            ",".join([
                GLOBAL_HOST,
                "http://127.0.0.1:8000",
                "http://localhost:8000",
                "http://127.0.0.1:5173",
                "http://localhost:5173",
                "http://127.0.0.1",
                "http://localhost"
            ])
        ).split(",")
        if origin.strip()
    ]

    # Base paths
    APP_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    BACKEND_DIR: str = os.path.dirname(APP_DIR)
    ROOT_DIR: str = os.path.dirname(BACKEND_DIR)
    DATABASE_PATH: str = os.path.join(APP_DIR, "database", "landslide_sentinel.db")
    DATABASE_URL: str = f"sqlite:///{DATABASE_PATH}"

    # Simulation defaults
    SIMULATION_INTERVAL_SECONDS: float = 2.5
    DEFAULT_WARNING_THRESHOLD: float = 55.0
    DEFAULT_CRITICAL_THRESHOLD: float = 80.0

    # Geotechnical limit-equilibrium & empirical thresholds (from SIH2)
    CRITICAL_RAINFALL_72H_MM: float = 120.0
    CRITICAL_RAINFALL_1H_MM: float = 35.0
    CRITICAL_SOIL_MOISTURE_RATIO: float = 0.82
    CRITICAL_PORE_PRESSURE_KPA: float = 12.5
    CRITICAL_SLOPE_ANGLE_DEG: float = 28.0

    # ML Model Artifacts
    ML_ARTIFACTS_DIR: str = os.path.join(APP_DIR, "ml", "artifacts")
    LANDSLIDE_MODEL_PATH: str = os.path.join(ML_ARTIFACTS_DIR, "landslide_model.joblib")
    METRICS_PATH: str = os.path.join(ML_ARTIFACTS_DIR, "metrics.json")
    RF_T1H_PATH: str = os.path.join(ML_ARTIFACTS_DIR, "rf_model_risk_T_plus_1h.joblib")
    RF_T6H_PATH: str = os.path.join(ML_ARTIFACTS_DIR, "rf_model_risk_T_plus_6h.joblib")
    NLP_MODEL_NAME: str = "google/flan-t5-base"

settings = Settings()
