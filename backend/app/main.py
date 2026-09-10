import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .core.config import settings
from .database.session import Base, engine
from .database.seed import seed_database
from .ml.predictor import LandslidePredictor
from .services.nlp_spam_filter import nlp_classifier
from .simulation.generator import simulator
from .websocket_manager import ws_manager
from .api import api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("landslide_sentinel")

FRONTEND_DIST = os.path.abspath(
    os.path.join(settings.ROOT_DIR, "frontend", "dist")
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Ensure SQLite tables and seed data
    logger.info("Initializing GeoSentinel & LandSlide Sentinel database schema...")
    Base.metadata.create_all(bind=engine)
    seed_database()

    # 2. Warm up ML Models
    logger.info("Warming up ML Predictor & Multi-Horizon Models...")
    try:
        LandslidePredictor.get_instance()
    except Exception as e:
        logger.warning(f"ML Predictor warmup notice: {e}")

    # 3. Initialize NLP classifier
    try:
        nlp_classifier.load_pipeline()
    except Exception as e:
        logger.warning(f"NLP pipeline load deferred: {e}")

    # 4. Start real-time IoT simulation engine
    logger.info("Starting real-time sensor simulation loop...")
    simulator.start()

    yield

    # Shutdown
    logger.info("Shutting down sensor simulation loop...")
    simulator.stop()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Unified AI Landslide Early Warning System combining IoT Telemetry Simulation, Geotechnical Limit-Equilibrium Stability Physics, Multi-Horizon ML, Crowdsource NLP Hazard Classification, Dynamic Danger Polygons, and Authority Mass Evacuation Controls.",
    version=settings.VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include both /api and /api/v1 prefixes for full compatibility
app.include_router(api_router, prefix=settings.API_PREFIX)
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/api/health")
def api_health():
    return {
        "system": settings.PROJECT_NAME,
        "status": "operational",
        "version": settings.VERSION,
        "simulation": simulator.get_status(),
        "endpoints": {
            "stations": "/api/stations",
            "alerts": "/api/alerts",
            "sos_report": "/api/sos/report",
            "sos_reports": "/api/sos/reports",
            "evacuation_trigger": "/api/evacuation/trigger",
            "model_metrics": "/api/model/metrics",
            "model_predict": "/api/model/predict",
            "simulation": "/api/simulation/status",
            "websocket_telemetry": "/ws/telemetry",
            "websocket_alerts": "/ws/alerts"
        }
    }


@app.websocket("/ws/telemetry")
@app.websocket("/ws/alerts")
async def websocket_stream_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        await websocket.send_json({
            "type": "connection_established",
            "message": f"Connected to {settings.PROJECT_NAME} real-time telemetry stream.",
            "status": simulator.get_status()
        })
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket client connection closed: {e}")
        ws_manager.disconnect(websocket)


# Mount frontend SPA if dist directory exists
if os.path.exists(FRONTEND_DIST):
    logger.info(f"Mounting compiled frontend from: {FRONTEND_DIST}")
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/")
    def root():
        return api_health()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
