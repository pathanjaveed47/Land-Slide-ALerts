"""
Geotechnical Physics & Stability Assessment Engine.

Implements the classical Infinite Slope Stability Model with pore-pressure coupling:
    FS = [c' + (gamma * z * cos^2(beta) - u) * tan(phi')] / [gamma * z * sin(beta) * cos(beta)]

Evaluates combined trigger criteria:
1. Limit-equilibrium Factor of Safety (FS).
2. Multi-horizon Random Forest hazard predictions (T+1h, T+6h).
3. Empirical intensity-duration rainfall thresholds (Caine 1980 / Guzzetti 2008).
"""

import os
import math
import logging
from typing import Tuple, List, Dict, Any, Optional
import numpy as np
import joblib

from ..core.config import settings

logger = logging.getLogger("landslide_sentinel.geotech")


class GeotechnicalEngine:
    def __init__(
        self,
        cohesion_kpa: float = 8.5,            # Residual cohesion for weathered colluvium
        friction_angle_deg: float = 32.0,      # Internal angle of shearing resistance phi'
        soil_unit_weight_kn_m3: float = 18.5,  # Bulk unit weight gamma
        failure_plane_depth_m: float = 2.5     # Critical slip surface depth z
    ):
        self.c_prime = cohesion_kpa
        self.phi_rad = math.radians(friction_angle_deg)
        self.gamma = soil_unit_weight_kn_m3
        self.z = failure_plane_depth_m

        # ML Model References
        self.ml_model_t1h = None
        self.ml_model_t6h = None
        self._load_ml_models()

    def _load_ml_models(self) -> None:
        """Loads trained multi-horizon Random Forest models if artifacts exist."""
        try:
            if os.path.exists(settings.RF_T1H_PATH):
                self.ml_model_t1h = joblib.load(settings.RF_T1H_PATH)
                logger.info(f"Loaded ML model for T+1h from {settings.RF_T1H_PATH}")
            if os.path.exists(settings.RF_T6H_PATH):
                self.ml_model_t6h = joblib.load(settings.RF_T6H_PATH)
                logger.info(f"Loaded ML model for T+6h from {settings.RF_T6H_PATH}")
        except Exception as e:
            logger.warning(f"Could not load multi-horizon ML artifacts: {e}. Defaulting to physical limit equilibrium.")

    def compute_factor_of_safety(
        self,
        slope_angle_deg: float,
        pore_pressure_kpa: float,
        soil_moisture_percent: float,
        cohesion_kpa: Optional[float] = None,
        friction_angle_deg: Optional[float] = None,
        failure_depth_m: Optional[float] = None
    ) -> float:
        """
        Computes geotechnical limit-equilibrium Factor of Safety (FS).
        FS > 1.30: Stable (Safe)
        1.05 <= FS <= 1.30: Marginally stable (Watch / Advisory)
        FS < 1.05: Imminent shear failure / active sliding (Warning / Critical)
        """
        c = cohesion_kpa if cohesion_kpa is not None else self.c_prime
        phi = math.radians(friction_angle_deg) if friction_angle_deg is not None else self.phi_rad
        z = failure_depth_m if failure_depth_m is not None else self.z

        beta_rad = math.radians(max(8.0, min(80.0, slope_angle_deg)))

        # Unit weight adjustment: soil_moisture_percent is 0-100%
        # volumetric fraction approx theta = moisture / 100
        theta = max(0.05, min(0.95, soil_moisture_percent / 100.0))
        gamma_adj = self.gamma + (theta * 9.81)

        # Effective normal stress sigma' = total normal stress - pore pressure u
        cos_beta = math.cos(beta_rad)
        total_normal = gamma_adj * z * (cos_beta ** 2)
        effective_normal = max(0.2, total_normal - pore_pressure_kpa)

        # Resisting shear strength (Mohr-Coulomb)
        resisting_shear = c + (effective_normal * math.tan(phi))

        # Driving shear stress
        driving_shear = gamma_adj * z * math.sin(beta_rad) * cos_beta
        driving_shear = max(0.2, driving_shear)

        fs = resisting_shear / driving_shear
        return round(float(fs), 2)

    def predict_multi_horizons(
        self,
        slope_angle_deg: float,
        rainfall_24h_mm: float,
        rainfall_rate_mm_hr: float,
        soil_moisture_percent: float,
        pore_pressure_kpa: float,
        factor_of_safety: float,
        cohesion_kpa: Optional[float] = None,
        friction_angle_deg: Optional[float] = None,
        failure_depth_m: Optional[float] = None
    ) -> Dict[str, float]:
        """Runs multi-horizon inference on RF models for T+1h and T+6h."""
        c = cohesion_kpa if cohesion_kpa is not None else self.c_prime
        phi_deg = friction_angle_deg if friction_angle_deg is not None else math.degrees(self.phi_rad)
        z = failure_depth_m if failure_depth_m is not None else self.z
        theta = max(0.05, min(0.95, soil_moisture_percent / 100.0))

        # Fallback estimation if models not loaded
        if self.ml_model_t1h is None or self.ml_model_t6h is None:
            # Physical heuristic proxy
            t1_prob = max(0.01, min(0.99, round(1.0 / (1.0 + math.exp(2.5 * (factor_of_safety - 1.15))), 3)))
            t6_prob = max(0.01, min(0.99, round(1.0 / (1.0 + math.exp(2.0 * (factor_of_safety - 1.25))), 3)))
            return {"risk_t1h": t1_prob, "risk_t6h": t6_prob}

        try:
            feature_vector = np.array([[
                slope_angle_deg,
                c,
                phi_deg,
                z,
                rainfall_24h_mm,
                rainfall_rate_mm_hr,
                theta,
                pore_pressure_kpa,
                factor_of_safety
            ]])
            p_t1 = float(self.ml_model_t1h.predict_proba(feature_vector)[0, 1])
            p_t6 = float(self.ml_model_t6h.predict_proba(feature_vector)[0, 1])
            return {"risk_t1h": round(p_t1, 3), "risk_t6h": round(p_t6, 3)}
        except Exception as e:
            logger.error(f"Multi-horizon ML prediction error: {e}")
            t1_prob = max(0.01, min(0.99, round(1.0 / (1.0 + math.exp(2.5 * (factor_of_safety - 1.15))), 3)))
            t6_prob = max(0.01, min(0.99, round(1.0 / (1.0 + math.exp(2.0 * (factor_of_safety - 1.25))), 3)))
            return {"risk_t1h": t1_prob, "risk_t6h": t6_prob}


geotechnical_engine = GeotechnicalEngine()
