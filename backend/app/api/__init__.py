from fastapi import APIRouter
from .stations import router as stations_router
from .alerts import router as alerts_router
from .crowdsource import router as crowdsource_router
from .authority import router as authority_router
from .ml_routes import router as ml_router
from .simulation import router as simulation_router
from .sensors import router as sensors_router

api_router = APIRouter()
api_router.include_router(stations_router)
api_router.include_router(alerts_router)
api_router.include_router(crowdsource_router)
api_router.include_router(authority_router)
api_router.include_router(ml_router)
api_router.include_router(simulation_router)
api_router.include_router(sensors_router)

__all__ = ["api_router"]
