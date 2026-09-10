from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, status, HTTPException
from ..schemas import SensorTelemetryIn, SensorIngestResponse
from ..services.geotechnical_engine import geotechnical_engine
from ..websocket_manager import ws_manager

router = APIRouter(prefix="/sensors", tags=["Direct IoT Sensor Telemetry Ingestion"])


async def _async_broadcast_iot_reading(telemetry: SensorTelemetryIn, fs: float, risk_level: str):
    await ws_manager.broadcast({
        "type": "external_sensor_telemetry",
        "sensor_id": telemetry.sensor_id,
        "latitude": telemetry.latitude,
        "longitude": telemetry.longitude,
        "factor_of_safety": fs,
        "risk_level": risk_level,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


@router.post(
    "/telemetry",
    response_model=SensorIngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingest external IoT sensor telemetry"
)
async def ingest_sensor_data(
    telemetry: SensorTelemetryIn,
    background_tasks: BackgroundTasks
):
    try:
        fs = geotechnical_engine.compute_factor_of_safety(
            slope_angle_deg=telemetry.slope_angle_deg,
            pore_pressure_kpa=telemetry.pore_water_pressure_kpa,
            soil_moisture_percent=telemetry.volumetric_water_content * 100.0
        )

        risk_level = "Safe"
        if fs < 1.05 or telemetry.pore_water_pressure_kpa >= 25.0:
            risk_level = "Critical"
        elif fs < 1.30 or telemetry.pore_water_pressure_kpa >= 15.0:
            risk_level = "Warning"
        elif fs < 1.45:
            risk_level = "Watch"

        alert_triggered = risk_level in ["Warning", "Critical"]
        background_tasks.add_task(_async_broadcast_iot_reading, telemetry, fs, risk_level)

        return SensorIngestResponse(
            status="success",
            sensor_id=telemetry.sensor_id,
            ingested_at=datetime.now(timezone.utc),
            risk_level=risk_level,
            factor_of_safety_proxy=fs,
            alert_triggered=alert_triggered,
            message=f"Telemetry ingested. Factor of Safety={fs:.2f}. Risk Status: {risk_level}."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"IoT Telemetry ingestion failed: {str(e)}")
