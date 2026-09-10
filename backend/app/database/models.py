import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from .session import Base

class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    region = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    elevation = Column(Float, nullable=False)  # in meters
    base_slope = Column(Float, nullable=False)  # in degrees
    soil_type = Column(String(100), default="Colluvial Silt-Gravel")
    cohesion_kpa = Column(Float, default=8.5)
    friction_angle_deg = Column(Float, default=32.0)
    failure_depth_m = Column(Float, default=2.5)
    warning_threshold = Column(Float, default=55.0)
    critical_threshold = Column(Float, default=80.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    readings = relationship("SensorReading", back_populates="station", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="station", cascade="all, delete-orphan")
    alerts = relationship("AlertLog", back_populates="station", cascade="all, delete-orphan")


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    rainfall_rate = Column(Float, nullable=False)  # mm/hr
    cumulative_rainfall_24h = Column(Float, nullable=False)  # mm
    soil_moisture = Column(Float, nullable=False)  # %
    slope_angle = Column(Float, nullable=False)  # degrees
    vibration_frequency = Column(Float, nullable=False)  # Hz / acceleration
    pore_water_pressure = Column(Float, nullable=False)  # kPa
    temperature = Column(Float, nullable=False)  # °C

    station = relationship("Station", back_populates="readings")
    prediction = relationship("Prediction", back_populates="reading", uselist=False, cascade="all, delete-orphan")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    reading_id = Column(Integer, ForeignKey("sensor_readings.id"), nullable=False, unique=True)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    risk_score = Column(Float, nullable=False)  # 0.0 to 100.0
    risk_level = Column(String(20), nullable=False)  # Safe, Watch, Warning, Critical
    confidence = Column(Float, default=0.95)
    factor_of_safety = Column(Float, default=1.85)  # Physical Infinite Slope Stability FS
    risk_t1h = Column(Float, default=0.05)  # Multi-horizon 1h failure probability
    risk_t6h = Column(Float, default=0.08)  # Multi-horizon 6h failure probability
    contributing_factors = Column(JSON, default=list)

    reading = relationship("SensorReading", back_populates="prediction")
    station = relationship("Station", back_populates="predictions")


class AlertLog(Base):
    __tablename__ = "alert_logs"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    risk_level = Column(String(20), nullable=False)  # Warning or Critical
    risk_score = Column(Float, nullable=False)
    message = Column(String(255), nullable=False)
    contributing_factors = Column(JSON, default=list)
    suggested_action = Column(String(255), nullable=False)
    status = Column(String(20), default="ACTIVE")  # ACTIVE, ACKNOWLEDGED, RESOLVED
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    station = relationship("Station", back_populates="alerts")
    notifications = relationship("NotificationLog", back_populates="alert", cascade="all, delete-orphan")


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alert_logs.id"), nullable=False, index=True)
    channel = Column(String(20), nullable=False)  # SMS, EMAIL
    recipient = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(20), default="DELIVERED")  # DELIVERED, FAILED
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    alert = relationship("AlertLog", back_populates="notifications")


class SOSReport(Base):
    """Crowdsourced citizen hazard observations classified via NLP."""
    __tablename__ = "sos_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_uuid = Column(String(50), unique=True, index=True, nullable=False)
    reporter_id = Column(String(50), default="ANONYMOUS", nullable=False)
    text = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    is_valid_hazard = Column(Boolean, default=False)
    is_spam = Column(Boolean, default=False)
    confidence = Column(Float, default=0.85)
    detected_category = Column(String(60), default="UNSPECIFIED")
    verification_status = Column(String(20), default="PENDING")  # PENDING, VERIFIED, REJECTED
    reviewed_by = Column(String(60), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    alert_broadcasted = Column(Boolean, default=False)


class EvacuationOrder(Base):
    """Mass Evacuation orders triggered by Disaster Response Authorities."""
    __tablename__ = "evacuation_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_uuid = Column(String(50), unique=True, index=True, nullable=False)
    sector_name = Column(String(100), nullable=False)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=True)
    center_latitude = Column(Float, nullable=False)
    center_longitude = Column(Float, nullable=False)
    radius_km = Column(Float, default=15.0)
    polygon_coordinates = Column(JSON, default=list)
    evacuation_level = Column(String(30), default="IMMEDIATE_RED")
    reason = Column(Text, nullable=False)
    issued_by = Column(String(100), default="CIVIL_DEFENSE_AUTHORITY")
    issued_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    status = Column(String(20), default="ACTIVE")  # ACTIVE, CANCELLED
