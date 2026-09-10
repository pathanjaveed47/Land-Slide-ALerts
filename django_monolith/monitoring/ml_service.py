"""
Scikit-Learn Random Forest Multi-Horizon Risk Inference Engine.

Loads pre-trained Random Forest models (.joblib) to forecast failure probabilities:
- T+1h (Immediate cloudburst and acute shear displacement)
- T+6h (Progressive saturation wetting front)
"""

import os
import logging
from typing import Tuple, Dict, Any
import joblib
import numpy as np

logger = logging.getLogger("monitoring.ml_service")


class LandslideMLService:
    def __init__(self, artifacts_dir: str = "ml/artifacts"):
        self.artifacts_dir = artifacts_dir
        self.model_t1h = None
        self.model_t6h = None
        self._load_models()

    def _load_models(self):
        t1_path = os.path.join(self.artifacts_dir, "rf_model_risk_T_plus_1h.joblib")
        t6_path = os.path.join(self.artifacts_dir, "rf_model_risk_T_plus_6h.joblib")

        try:
            if os.path.exists(t1_path):
                self.model_t1h = joblib.load(t1_path)
                logger.info(f"Loaded T+1h Random Forest model from {t1_path}")
            if os.path.exists(t6_path):
                self.model_t6h = joblib.load(t6_path)
                logger.info(f"Loaded T+6h Random Forest model from {t6_path}")
        except Exception as e:
            logger.warning(f"Failed loading ML joblib artifacts: {e}. Fallback heuristics active.")

    def predict_risk(
        self,
        cumulative_rainfall: float,
        soil_moisture: float,
        acceleration_rate: float,
        slope_angle_deg: float = 34.0
    ) -> Dict[str, Any]:
        """
        Calculates multi-horizon risk scores and assigns categorical risk level:
        Safe, Advisory, Watch, Warning, or Critical.
        """
        # Normalize soil moisture fraction if passed as percentage
        moisture_frac = soil_moisture / 100.0 if soil_moisture > 1.0 else soil_moisture

        # If models loaded, perform model inference
        p_t1 = 0.0
        p_t6 = 0.0

        if self.model_t1h is not None and self.model_t6h is not None:
            try:
                # Approximate proxy features consistent with trained model feature shape:
                # [slope_angle_deg, cohesion_kpa, friction_angle_deg, depth_m,
                #  rainfall_72h_mm, rainfall_1h_mm, volumetric_water_content, pore_water_pressure_kpa, factor_of_safety_physical]
                pore_pressure_proxy = max(0.0, (moisture_frac - 0.65) * 30.0 + acceleration_rate * 2.0)
                rainfall_1h_proxy = acceleration_rate * 4.0
                fs_proxy = max(0.4, 1.45 - (moisture_frac * 0.8) - (acceleration_rate * 0.08))

                feature_vec = np.array([[
                    slope_angle_deg,
                    10.0,
                    31.0,
                    2.5,
                    cumulative_rainfall,
                    rainfall_1h_proxy,
                    moisture_frac,
                    pore_pressure_proxy,
                    fs_proxy
                ]])

                p_t1 = float(self.model_t1h.predict_proba(feature_vec)[0, 1])
                p_t6 = float(self.model_t6h.predict_proba(feature_vec)[0, 1])
            except Exception as e:
                logger.error(f"Inference error in Random Forest: {e}. Using calibrated heuristics.")
                p_t1, p_t6 = self._heuristic_fallback(cumulative_rainfall, moisture_frac, acceleration_rate)
        else:
            p_t1, p_t6 = self._heuristic_fallback(cumulative_rainfall, moisture_frac, acceleration_rate)

        # Categorize risk level
        risk_level = self._classify_risk_level(p_t1, p_t6, acceleration_rate)

        return {
            "risk_score_t1h": round(p_t1, 4),
            "risk_score_t6h": round(p_t6, 4),
            "risk_level": risk_level,
            "acceleration_rate": acceleration_rate,
            "cumulative_rainfall": cumulative_rainfall,
            "soil_moisture": round(moisture_frac * 100.0, 1)
        }

    def _heuristic_fallback(self, rainfall: float, moisture: float, accel: float) -> Tuple[float, float]:
        """Calibrated fallback proxy when joblib artifact is not mounted."""
        score_t1 = min(0.99, (rainfall / 180.0) * 0.35 + (moisture * 0.35) + (accel / 8.0) * 0.30)
        score_t6 = min(0.99, (rainfall / 140.0) * 0.55 + (moisture * 0.45))
        return round(float(score_t1), 4), round(float(score_t6), 4)

    def _classify_risk_level(self, p_t1: float, p_t6: float, accel: float) -> str:
        """Assigns civil defense warning tiers."""
        if p_t1 >= 0.80 or accel >= 5.0:
            return "Critical"
        elif p_t1 >= 0.65 or p_t6 >= 0.70 or accel >= 3.0:
            return "Warning"
        elif p_t1 >= 0.45 or p_t6 >= 0.50 or accel >= 1.5:
            return "Watch"
        elif p_t1 >= 0.25 or p_t6 >= 0.30:
            return "Advisory"
        return "Safe"


ml_service = LandslideMLService()
