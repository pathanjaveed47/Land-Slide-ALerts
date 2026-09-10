from fastapi import APIRouter, HTTPException
from ..schemas import SimulationScenarioRequest, SimulationStatusResponse
from ..simulation.generator import simulator

router = APIRouter(prefix="/simulation", tags=["Simulation & Scenario Injection"])


@router.post("/scenario")
def trigger_scenario(payload: SimulationScenarioRequest):
    s_type = payload.scenario.lower()
    valid_scenarios = ["normal", "clear", "cloudburst", "pore_surge", "seismic", "tremor", "disaster_demo", "escalating_demo"]
    if s_type not in valid_scenarios:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario '{payload.scenario}'. Valid options: {valid_scenarios}"
        )

    simulator.trigger_scenario(
        station_id=payload.station_id,
        scenario_type=s_type,
        duration_seconds=int(payload.duration_seconds or 180)
    )

    return {
        "status": "success",
        "message": f"Scenario '{payload.scenario}' injected successfully.",
        "station_id": payload.station_id or "ALL",
        "duration_seconds": payload.duration_seconds or 180
    }


@router.get("/status", response_model=SimulationStatusResponse)
def get_simulation_status():
    return simulator.get_status()


@router.post("/start")
def start_simulation():
    simulator.start()
    return {"status": "started", "message": "Simulation is actively generating telemetry."}


@router.post("/stop")
def stop_simulation():
    simulator.stop()
    return {"status": "stopped", "message": "Simulation is paused."}
