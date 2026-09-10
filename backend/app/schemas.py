import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ---------------------------------------------------------
# Telemetry & Readings
# ---------------------------------------------------------

class SensorReadingBase(BaseModel):
    rainfall_rate: float = Field(..., description="Rainfall rate in mm/hr")
    cumulative_rainfall_24h: float = Field(..., description="24-hour antecedent rainfall in mm")
    soil_moisture: float = Field(..., description="Volumetric soil moisture percentage (0-100%)")
    slope_angle: float = Field(..., description="Slope inclination angle in degrees")
    vibration_frequency: float = Field(..., description="Ground vibration / micro-tremor frequency in Hz")
    pore_water_pressure: float = Field(..., description="Subsurface pore water pressure in kPa")
    temperature: float = Field(..., description="Ambient temperature in °C")


class SensorReadingCreate(SensorReadingBase):
    station_id: int


class SensorReadingResponse(SensorReadingBase):
    id: int
    station_id: int
    timestamp: datetime.datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------
# ML Predictions & Physics
# ---------------------------------------------------------

class PredictionResponse(BaseModel):
    id: Optional[int] = None
    station_id: int
    reading_id: Optional[int] = None
    timestamp: datetime.datetime
    risk_score: float = Field(..., description="Continuous landslide risk index (0.0 to 100.0)")
    risk_level: str = Field(..., description="Categorical threat tier: Safe, Watch, Warning, Critical")
    confidence: float
    factor_of_safety: float = Field(..., description="Physical Infinite Slope Stability limit-equilibrium Factor of Safety")
    risk_t1h: float = Field(..., description="Forecasted 1-hour failure probability (0.0 to 1.0)")
    risk_t6h: float = Field(..., description="Forecasted 6-hour failure probability (0.0 to 1.0)")
    contributing_factors: List[str]

    class Config:
        from_attributes = True


class PredictRequest(SensorReadingBase):
    cohesion_kpa: Optional[float] = 8.5
    friction_angle_deg: Optional[float] = 32.0
    failure_depth_m: Optional[float] = 2.5


class PredictResponse(BaseModel):
    risk_score: float
    risk_level: str
    confidence: float
    factor_of_safety: float
    risk_t1h: float
    risk_t6h: float
    class_probabilities: Dict[str, float]
    contributing_factors: List[str]


# ---------------------------------------------------------
# Stations
# ---------------------------------------------------------

class StationBase(BaseModel):
    code: str
    name: str
    region: str
    latitude: float
    longitude: float
    elevation: float
    base_slope: float
    soil_type: str = "Colluvial Silt-Gravel"
    cohesion_kpa: float = 8.5
    friction_angle_deg: float = 32.0
    failure_depth_m: float = 2.5
    warning_threshold: float = 55.0
    critical_threshold: float = 80.0
    is_active: bool = True


class StationResponse(StationBase):
    id: int
    created_at: datetime.datetime
    current_reading: Optional[SensorReadingResponse] = None
    current_prediction: Optional[PredictionResponse] = None
    hazard_polygon: Optional[List[List[float]]] = None

    class Config:
        from_attributes = True


class StationThresholdUpdate(BaseModel):
    warning_threshold: Optional[float] = None
    critical_threshold: Optional[float] = None


# ---------------------------------------------------------
# Alerts & Notifications
# ---------------------------------------------------------

class AlertLogResponse(BaseModel):
    id: int
    station_id: int
    timestamp: datetime.datetime
    risk_level: str
    risk_score: float
    message: str
    contributing_factors: List[str]
    suggested_action: str
    status: str
    acknowledged_at: Optional[datetime.datetime] = None
    resolved_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class NotificationLogResponse(BaseModel):
    id: int
    alert_id: int
    channel: str
    recipient: str
    message: str
    status: str
    timestamp: datetime.datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------
# Crowdsourced Citizen SOS Reports (SIH2)
# ---------------------------------------------------------

class SOSReportIn(BaseModel):
    reporter_id: Optional[str] = "CITIZEN_ANON"
    text: str = Field(..., min_length=5, description="Citizen text description of observed slope anomaly")
    latitude: float = Field(..., description="GPS Latitude")
    longitude: float = Field(..., description="GPS Longitude")


class SOSReportResponse(BaseModel):
    report_uuid: str
    is_valid_hazard: bool
    is_spam: bool
    confidence: float
    detected_category: str
    verification_status: str
    message: str
    alert_broadcasted: bool


class SOSReportItem(BaseModel):
    id: int
    report_uuid: str
    reporter_id: str
    text: str
    latitude: float
    longitude: float
    timestamp: datetime.datetime
    is_valid_hazard: bool
    is_spam: bool
    confidence: float
    detected_category: str
    verification_status: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class SOSVerifyRequest(BaseModel):
    verification_status: str = Field(..., description="VERIFIED or REJECTED")
    reviewer: str = Field(default="CIVIL_DEFENSE_AUTHORITY")


# ---------------------------------------------------------
# Authority & Mass Evacuation (SIH2)
# ---------------------------------------------------------

class EvacuationTriggerRequest(BaseModel):
    station_id: Optional[int] = None
    sector_name: str
    latitude: float
    longitude: float
    radius_km: float = 12.0
    reason: str
    authorized_by: str = "CHIEF_DISASTER_COMMISSIONER"


class EvacuationOrderResponse(BaseModel):
    order_uuid: str
    sector_name: str
    station_id: Optional[int] = None
    center_latitude: float
    center_longitude: float
    radius_km: float
    polygon_coordinates: List[List[float]]
    evacuation_level: str
    reason: str
    issued_by: str
    issued_at: datetime.datetime
    status: str

    class Config:
        from_attributes = True


# ---------------------------------------------------------
# External IoT Ingestion API (SIH2)
# ---------------------------------------------------------

class SensorTelemetryIn(BaseModel):
    sensor_id: str
    latitude: float
    longitude: float
    slope_angle_deg: float
    rainfall_1h_mm: float
    rainfall_72h_mm: float
    volumetric_water_content: float
    pore_water_pressure_kpa: float


class SensorIngestResponse(BaseModel):
    status: str
    sensor_id: str
    ingested_at: datetime.datetime
    risk_level: str
    factor_of_safety_proxy: float
    alert_triggered: bool
    message: str


# ---------------------------------------------------------
# Simulation Control
# ---------------------------------------------------------

class SimulationStatusResponse(BaseModel):
    is_running: bool
    interval_seconds: float
    active_scenario: Optional[str] = None
    ticks: int


class SimulationScenarioRequest(BaseModel):
    scenario: str = Field(..., description="CLOUDBURST, PORE_SURGE, TREMOR, DISASTER_DEMO, or NORMAL")
    station_id: Optional[int] = None
    duration_seconds: Optional[float] = 180.0
