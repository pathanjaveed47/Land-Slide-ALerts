from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database.session import get_db
from ..database.models import Station, SensorReading, Prediction, AlertLog
from ..schemas import StationResponse, StationThresholdUpdate, SensorReadingResponse
from ..services.geofence import generate_hazard_polygon

router = APIRouter(prefix="/stations", tags=["Stations & In-Situ Nodes"])


@router.get("", response_model=List[StationResponse])
def get_all_stations(db: Session = Depends(get_db)):
    stations = db.query(Station).filter(Station.is_active == True).all()
    results = []

    for s in stations:
        latest_reading = (
            db.query(SensorReading)
            .filter(SensorReading.station_id == s.id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )
        latest_pred = (
            db.query(Prediction)
            .filter(Prediction.station_id == s.id)
            .order_by(Prediction.timestamp.desc())
            .first()
        )

        reading_dict = None
        if latest_reading:
            reading_dict = {
                "id": latest_reading.id,
                "station_id": latest_reading.station_id,
                "timestamp": latest_reading.timestamp,
                "rainfall_rate": latest_reading.rainfall_rate,
                "cumulative_rainfall_24h": latest_reading.cumulative_rainfall_24h,
                "soil_moisture": latest_reading.soil_moisture,
                "slope_angle": latest_reading.slope_angle,
                "vibration_frequency": latest_reading.vibration_frequency,
                "pore_water_pressure": latest_reading.pore_water_pressure,
                "temperature": latest_reading.temperature
            }

        pred_dict = None
        danger_polygon = None
        if latest_pred:
            pred_dict = {
                "id": latest_pred.id,
                "station_id": latest_pred.station_id,
                "reading_id": latest_pred.reading_id,
                "timestamp": latest_pred.timestamp,
                "risk_score": latest_pred.risk_score,
                "risk_level": latest_pred.risk_level,
                "confidence": latest_pred.confidence,
                "factor_of_safety": latest_pred.factor_of_safety or 1.85,
                "risk_t1h": latest_pred.risk_t1h or 0.05,
                "risk_t6h": latest_pred.risk_t6h or 0.08,
                "contributing_factors": latest_pred.contributing_factors or []
            }
            if latest_pred.risk_level in ["Warning", "Critical"] or (latest_pred.factor_of_safety and latest_pred.factor_of_safety < 1.15):
                radius = 8.0 if latest_pred.risk_level == "Critical" else 4.5
                danger_polygon = generate_hazard_polygon(s.latitude, s.longitude, radius_km=radius)

        station_dict = {
            "id": s.id,
            "code": s.code,
            "name": s.name,
            "region": s.region,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "elevation": s.elevation,
            "base_slope": s.base_slope,
            "soil_type": s.soil_type,
            "cohesion_kpa": s.cohesion_kpa or 8.5,
            "friction_angle_deg": s.friction_angle_deg or 32.0,
            "failure_depth_m": s.failure_depth_m or 2.5,
            "warning_threshold": s.warning_threshold,
            "critical_threshold": s.critical_threshold,
            "is_active": s.is_active,
            "created_at": s.created_at,
            "current_reading": reading_dict,
            "current_prediction": pred_dict,
            "hazard_polygon": danger_polygon
        }
        results.append(station_dict)

    return results


@router.get("/{station_id}", response_model=StationResponse)
def get_station_details(station_id: int, db: Session = Depends(get_db)):
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    latest_reading = (
        db.query(SensorReading)
        .filter(SensorReading.station_id == station.id)
        .order_by(SensorReading.timestamp.desc())
        .first()
    )
    latest_pred = (
        db.query(Prediction)
        .filter(Prediction.station_id == station.id)
        .order_by(Prediction.timestamp.desc())
        .first()
    )

    reading_dict = None
    if latest_reading:
        reading_dict = {
            "id": latest_reading.id,
            "station_id": latest_reading.station_id,
            "timestamp": latest_reading.timestamp,
            "rainfall_rate": latest_reading.rainfall_rate,
            "cumulative_rainfall_24h": latest_reading.cumulative_rainfall_24h,
            "soil_moisture": latest_reading.soil_moisture,
            "slope_angle": latest_reading.slope_angle,
            "vibration_frequency": latest_reading.vibration_frequency,
            "pore_water_pressure": latest_reading.pore_water_pressure,
            "temperature": latest_reading.temperature
        }

    pred_dict = None
    danger_polygon = None
    if latest_pred:
        pred_dict = {
            "id": latest_pred.id,
            "station_id": latest_pred.station_id,
            "reading_id": latest_pred.reading_id,
            "timestamp": latest_pred.timestamp,
            "risk_score": latest_pred.risk_score,
            "risk_level": latest_pred.risk_level,
            "confidence": latest_pred.confidence,
            "factor_of_safety": latest_pred.factor_of_safety or 1.85,
            "risk_t1h": latest_pred.risk_t1h or 0.05,
            "risk_t6h": latest_pred.risk_t6h or 0.08,
            "contributing_factors": latest_pred.contributing_factors or []
        }
        if latest_pred.risk_level in ["Warning", "Critical"] or (latest_pred.factor_of_safety and latest_pred.factor_of_safety < 1.15):
            radius = 8.0 if latest_pred.risk_level == "Critical" else 4.5
            danger_polygon = generate_hazard_polygon(station.latitude, station.longitude, radius_km=radius)

    return {
        "id": station.id,
        "code": station.code,
        "name": station.name,
        "region": station.region,
        "latitude": station.latitude,
        "longitude": station.longitude,
        "elevation": station.elevation,
        "base_slope": station.base_slope,
        "soil_type": station.soil_type,
        "cohesion_kpa": station.cohesion_kpa or 8.5,
        "friction_angle_deg": station.friction_angle_deg or 32.0,
        "failure_depth_m": station.failure_depth_m or 2.5,
        "warning_threshold": station.warning_threshold,
        "critical_threshold": station.critical_threshold,
        "is_active": station.is_active,
        "created_at": station.created_at,
        "current_reading": reading_dict,
        "current_prediction": pred_dict,
        "hazard_polygon": danger_polygon
    }


@router.get("/{station_id}/readings", response_model=List[SensorReadingResponse])
def get_station_readings(
    station_id: int,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    readings = (
        db.query(SensorReading)
        .filter(SensorReading.station_id == station_id)
        .order_by(SensorReading.timestamp.desc())
        .limit(limit)
        .all()
    )
    return readings


@router.post("/{station_id}/thresholds")
def update_station_thresholds(
    station_id: int,
    payload: StationThresholdUpdate,
    db: Session = Depends(get_db)
):
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    if payload.warning_threshold is not None:
        station.warning_threshold = payload.warning_threshold
    if payload.critical_threshold is not None:
        station.critical_threshold = payload.critical_threshold

    db.commit()
    return {
        "status": "success",
        "station_id": station.id,
        "code": station.code,
        "warning_threshold": station.warning_threshold,
        "critical_threshold": station.critical_threshold
    }
