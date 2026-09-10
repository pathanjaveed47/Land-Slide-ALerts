import os
import json
import joblib
import numpy as np
import logging

from ..core.config import settings
from ..services.geotechnical_engine import geotechnical_engine

logger = logging.getLogger("landslide_sentinel.ml")


class LandslidePredictor:
    _instance = None
    _bundle = None

    def __init__(self):
        self.load_model()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = LandslidePredictor()
        return cls._instance

    def load_model(self):
        if not os.path.exists(settings.LANDSLIDE_MODEL_PATH):
            raise FileNotFoundError(f"Model file not found at: {settings.LANDSLIDE_MODEL_PATH}")

        self._bundle = joblib.load(settings.LANDSLIDE_MODEL_PATH)
        self.clf = self._bundle["classifier"]
        self.reg = self._bundle["regressor"]
        self.scaler = self._bundle["scaler"]
        self.feature_columns = self._bundle["feature_columns"]
        self.label_map = self._bundle["label_map"]
        self.metrics = self._bundle.get("metrics", {})
        logger.info("Loaded primary Random Forest Classifier & Gradient Boosting Regressor.")

    def reload(self):
        self.load_model()

    def identify_contributing_factors(self, data: dict, fs: float = 1.5) -> list[str]:
        factors = []
        rainfall = data.get("rainfall_rate", 0.0)
        cum_rain = data.get("cumulative_rainfall_24h", 0.0)
        moisture = data.get("soil_moisture", 0.0)
        slope = data.get("slope_angle", 0.0)
        pore_pressure = data.get("pore_water_pressure", 0.0)
        vibration = data.get("vibration_frequency", 0.0)

        if fs < 1.05:
            factors.append(f"LIMIT EQUILIBRIUM BREACH: Factor of Safety FS={fs:.2f} < 1.05 (Driving shear exceeds resistance)")
        elif fs < 1.30:
            factors.append(f"Marginal slope equilibrium: Factor of Safety FS={fs:.2f}")

        if rainfall > 45.0:
            factors.append(f"Intense precipitation: {rainfall:.1f} mm/hr (Cloudburst trigger)")
        elif rainfall > 25.0:
            factors.append(f"Elevated rainfall rate: {rainfall:.1f} mm/hr")

        if cum_rain > 160.0:
            factors.append(f"High 24h antecedent rainfall: {cum_rain:.1f} mm (Deep saturation)")
        elif cum_rain > 90.0:
            factors.append(f"Significant cumulative rainfall: {cum_rain:.1f} mm")

        if pore_pressure > 50.0:
            factors.append(f"Severe pore water pressure: {pore_pressure:.1f} kPa (Hydraulic uplift hazard)")
        elif pore_pressure > 32.0:
            factors.append(f"Pore water pressure above baseline: {pore_pressure:.1f} kPa")

        if moisture > 85.0:
            factors.append(f"Near-saturated regolith: soil moisture {moisture:.1f}%")
        elif moisture > 70.0:
            factors.append(f"Elevated soil moisture content: {moisture:.1f}%")

        if slope > 36.0:
            factors.append(f"Steep topographical slope: {slope:.1f}°")

        if vibration > 2.0:
            factors.append(f"Severe ground vibration / tremor detected: {vibration:.2f} Hz")
        elif vibration > 1.0:
            factors.append(f"Elevated micro-seismic activity: {vibration:.2f} Hz")

        if not factors:
            factors.append(f"Geotechnical parameters within normal nominal bounds (FS={fs:.2f}).")

        return factors

    def predict(self, features: dict, station_params: dict = None) -> dict:
        """
        Takes dictionary of sensor features and optional station parameters.
        Returns unified predictions:
        - risk_score (0-100)
        - risk_level (Safe, Watch, Warning, Critical)
        - factor_of_safety (FS)
        - risk_t1h (T+1h hazard probability)
        - risk_t6h (T+6h hazard probability)
        - confidence
        - class_probabilities
        - contributing_factors
        """
        stn = station_params or {}
        cohesion = stn.get("cohesion_kpa", 8.5)
        phi_deg = stn.get("friction_angle_deg", 32.0)
        depth = stn.get("failure_depth_m", 2.5)

        slope_angle = float(features.get("slope_angle", 30.0))
        pore_pressure = float(features.get("pore_water_pressure", 20.0))
        soil_moisture = float(features.get("soil_moisture", 50.0))
        rain_24h = float(features.get("cumulative_rainfall_24h", 20.0))
        rain_rate = float(features.get("rainfall_rate", 5.0))

        # 1. Geotechnical Limit Equilibrium Factor of Safety (FS)
        fs = geotechnical_engine.compute_factor_of_safety(
            slope_angle_deg=slope_angle,
            pore_pressure_kpa=pore_pressure,
            soil_moisture_percent=soil_moisture,
            cohesion_kpa=cohesion,
            friction_angle_deg=phi_deg,
            failure_depth_m=depth
        )

        # 2. Multi-horizon Forecast Projections (T+1h and T+6h)
        horizons = geotechnical_engine.predict_multi_horizons(
            slope_angle_deg=slope_angle,
            rainfall_24h_mm=rain_24h,
            rainfall_rate_mm_hr=rain_rate,
            soil_moisture_percent=soil_moisture,
            pore_pressure_kpa=pore_pressure,
            factor_of_safety=fs,
            cohesion_kpa=cohesion,
            friction_angle_deg=phi_deg,
            failure_depth_m=depth
        )
        risk_t1h = horizons["risk_t1h"]
        risk_t6h = horizons["risk_t6h"]

        # 3. Dual Model (Classifier & Regressor)
        raw_vals = [float(features.get(col, 0.0)) for col in self.feature_columns]
        X = np.array([raw_vals])
        X_scaled = self.scaler.transform(X)

        raw_score = float(self.reg.predict(X_scaled)[0])
        # If FS indicates failure (FS < 1.05), boost risk score if ML was conservative
        if fs < 1.05 and raw_score < 75.0:
            raw_score = max(raw_score, 82.0 + (1.05 - fs) * 20.0)
        risk_score = round(max(0.0, min(100.0, raw_score)), 1)

        class_idx = int(self.clf.predict(X_scaled)[0])
        probs = self.clf.predict_proba(X_scaled)[0]
        confidence = float(np.max(probs))

        inv_label_map = {v: k for k, v in self.label_map.items()}
        risk_level = inv_label_map.get(class_idx, "Safe")

        # Reconcile risk level with FS and risk score
        if risk_score >= 80.0 or fs < 1.05:
            risk_level = "Critical"
        elif (risk_score >= 55.0 or fs < 1.30) and risk_level not in ["Critical"]:
            risk_level = "Warning"
        elif risk_score >= 35.0 and risk_level == "Safe":
            risk_level = "Watch"

        class_probabilities = {
            inv_label_map.get(i, f"Class_{i}"): round(float(p), 4)
            for i, p in enumerate(probs)
        }

        factors = self.identify_contributing_factors(features, fs)

        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "factor_of_safety": fs,
            "risk_t1h": risk_t1h,
            "risk_t6h": risk_t6h,
            "confidence": round(confidence, 3),
            "class_probabilities": class_probabilities,
            "contributing_factors": factors
        }
