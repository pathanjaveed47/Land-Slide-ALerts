"""
Single-Command Launcher for Unified Landslide Early Warning System (LEWS)
Combines SIH (LandSlide Sentinel) + SIH2 (GeoSentinel AI).
"""

import sys
import os
import uvicorn

if __name__ == "__main__":
    print("=" * 70)
    print("🏔️  GEOSENTINEL AI & LANDSLIDE SENTINEL - UNIFIED EWS PLATFORM")
    print("=" * 70)
    print(" • Backend API:      FastAPI async engine with WebSockets")
    print(" • Physics Engine:   Infinite Slope Stability Limit-Equilibrium (FS)")
    print(" • Machine Learning: Multi-Horizon (T+1h, T+6h) + Dual Risk Regressor")
    print(" • Crowdsourcing:    Citizen SOS with Flan-T5 & USGS Criteria NLP")
    print(" • GIS Engine:       Leaflet + Dynamic Danger Polygons + 25km Geofence")
    print(" • Civil Defense:    Role-Based Authority Verification & Mass Evacuation")
    print(" • Frontend:         React 18 + Vite + Tailwind CSS Dark Operations SPA")
    print("=" * 70)
    print("\nStarting unified server on: http://127.0.0.1:8000\n")

    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=False)
