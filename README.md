# 🏔️ GeoSentinel AI & LandSlide Sentinel — Unified Early Warning System

An integrated, end-to-end Landslide Early Warning System (LEWS) combining **SIH (LandSlide Sentinel)** and **SIH2 (GeoSentinel AI)** into a single, high-performance platform.

---

## 🌟 Key Capabilities & Integrated Features

### 1. Geotechnical Infinite Slope Stability Physics Engine (from SIH2)
- Implements the classical limit-equilibrium Infinite Slope Stability model with pore-water pressure coupling:
  $$\text{FS} = \frac{c' + (\gamma_{\text{adjusted}} \cdot z \cdot \cos^2(\beta) - u) \cdot \tan(\phi')}{\gamma_{\text{adjusted}} \cdot z \cdot \sin(\beta) \cdot \cos(\beta)}$$
- Evaluates dynamic Factor of Safety ($\text{FS}$) in real time:
  - $\text{FS} > 1.30$: **Stable**
  - $1.05 \le \text{FS} \le 1.30$: **Marginally Stable (Watch / Advisory)**
  - $\text{FS} < 1.05$: **Imminent Shear Failure (Warning / Critical)**

### 2. Multi-Horizon AI Forecasting & Continuous Risk Scoring (SIH + SIH2)
- **Tri-Model ML Architecture**:
  - **Random Forest Classifier**: Categorical threat tier (`Safe`, `Watch`, `Warning`, `Critical`) with 95.8% accuracy.
  - **Gradient Boosting Regressor**: Continuous Risk Index ($0 - 100$) calibrated to geotechnical shear strain.
  - **Multi-Horizon Models**: $T+1\text{h}$ (immediate failure) and $T+6\text{h}$ (antecedent saturation failure) probability models trained with SMOTE.
- **Factor Explainability**: Real-time identification of dominant risk drivers (*"Hydraulic uplift hazard: pore pressure 65 kPa"*, *"Near-saturated regolith: 94%"*).

### 3. Crowdsourced Citizen SOS & Geotechnical NLP (from SIH2)
- Ingests citizen field observations via `/api/sos/report` and the in-app modal.
- Evaluates messages using Hugging Face `google/flan-t5-base` with USGS/BGS landslide criteria fallback:
  - **`HYDROLOGICAL_ANOMALY`**: Muddy springs, sudden seepage, brown runoff.
  - **`SLOPE_DEFORMATION`**: Leaning trees, tension cracks, tilted poles, road subsidence.
  - **`ACTIVE_MASS_MOVEMENT`**: Rockfall, debris flow, soil creep, ground rumbling.
  - **`SPAM_IRRELEVANT`**: Automated pre-filter detecting commercial spam and noise.

### 4. Interactive GIS Map, Dynamic Hazard Polygons & Geofencing (SIH + SIH2)
- **Leaflet.js GIS Engine**: Topographic relief, satellite hybrid, and dark tactical basemaps.
- **Dynamic 8-Vertex Danger Polygons**: Automatically calculated and rendered around slope failure epicenters.
- **Spatial Haversine Geofencing**: Computes spherical great-circle distances ($R \le 25\text{ km}$) around active warning zones.
- **Citizen SOS Map Pins**: Interactive map pins for verified citizen reports.

### 5. Authority Command & Civil Defense Controls (from SIH2)
- **Role Switcher**: Seamlessly toggle between **Public Observer Mode** and **Disaster Response Authority Mode**.
- **SOS Verification Workflow**: Authorities can mark pending reports as `VERIFIED` (escalating to civil defense) or `REJECTED`.
- **Mass Evacuation Protocol**: One-click **Trigger Mass Evacuation** modal that projects emergency danger polygons, dispatches civil defense logs, and sounds Web Audio sirens.

### 6. Real-Time Telemetry Simulation (from SIH)
- 6 geotagged in-situ mountain stations across the Himalayas & Western Ghats:
  - **Wayanad** (Western Ghats, Lateritic Colluvium)
  - **Joshimath** (Garhwal Himalayas, Moraine)
  - **Shimla** (Himachal Shivalik Hills, Fissured Schist)
  - **Darjeeling** (Eastern Himalayas, Weathered Phyllite)
  - **Munnar** (Idukki Western Ghats, Charnockite Debris)
  - **Rishikesh-Badrinath** (Garhwal Shivaliks, Sandstone & Talus)
- Scenario injection: *Torrential Cloudburst*, *Pore Water Surge*, *Micro-Seismic Tremors*, and a *3-Minute Escalating Disaster Demo*.

---

## 🏗️ Project Directory Structure

```
goofy-hubble/
├── backend/                      # Unified FastAPI Backend
│   ├── app/
│   │   ├── api/                  # Modular API routes
│   │   │   ├── stations.py       # Station registry & telemetry history
│   │   │   ├── alerts.py         # Alert management & notification logs
│   │   │   ├── crowdsource.py    # Citizen SOS & NLP classification
│   │   │   ├── authority.py      # Role verification & Mass Evacuation
│   │   │   ├── ml_routes.py      # Model metrics, predict, retrain
│   │   │   ├── simulation.py     # Scenario injection & control
│   │   │   └── sensors.py        # Direct IoT telemetry ingestion
│   │   ├── core/
│   │   │   └── config.py         # Application settings & geotechnical thresholds
│   │   ├── database/
│   │   │   ├── models.py         # SQLAlchemy models (Stations, Readings, SOS, Alerts, Evac)
│   │   │   ├── session.py        # SQLite connection with WAL mode
│   │   │   └── seed.py           # Database seeding (6 stations + readings + sample SOS)
│   │   ├── ml/
│   │   │   ├── predictor.py      # Unified classifier + regressor + FS physics + multi-horizons
│   │   │   └── artifacts/        # Serialized .joblib model weights & metadata
│   │   ├── services/
│   │   │   ├── geotechnical_engine.py # Infinite slope stability FS model
│   │   │   ├── nlp_spam_filter.py     # Flan-T5 + Geotechnical lexicon filter
│   │   │   ├── geofence.py            # Haversine distance & danger polygon generator
│   │   │   └── alert_dispatcher.py    # Multi-tier SMS/Email notification logs
│   │   ├── simulation/
│   │   │   └── generator.py      # Async background telemetry simulator
│   │   ├── websocket_manager.py  # WebSocket duplex broadcaster
│   │   ├── schemas.py            # Pydantic validation schemas
│   │   └── main.py               # FastAPI entrypoint & static SPA mounting
│   └── requirements.txt          # Python dependencies
├── frontend/                     # React 18 + Vite + Tailwind CSS SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Role toggle, sirens, and disaster controls
│   │   │   ├── AlertBanner.jsx     # Active hazard and evacuation banner
│   │   │   ├── Dashboard.jsx       # Overview KPIs and station grid
│   │   │   ├── StationCard.jsx     # Circular gauge, FS status badge, T+1h/T+6h pills
│   │   │   ├── MapView.jsx         # Leaflet GIS map with danger polygons & SOS pins
│   │   │   ├── SensorCharts.jsx    # Synchronized Recharts telemetry & FS curves
│   │   │   ├── CitizenSOSModal.jsx # SOS report submission with preset templates
│   │   │   ├── SOSReportFeed.jsx   # Live citizen reports feed with Authority actions
│   │   │   ├── EvacuationModal.jsx # Mass Evacuation order confirmation modal
│   │   │   ├── AlertFeed.jsx       # Incident alert logs & simulated dispatch feed
│   │   │   └── AdminPanel.jsx      # Scenario injector & threshold calibration
│   │   ├── services/
│   │   │   └── api.js              # REST client and WebSocket handler
│   │   ├── utils/
│   │   │   └── audio.js            # Web Audio emergency alarm synthesizer
│   │   ├── App.jsx                 # Top-level state and real-time synchronization
│   │   └── main.jsx
│   └── dist/                     # Pre-compiled production bundle
├── django_monolith/              # Standalone Django Monolith Companion (from SIH2)
├── tests/
│   └── test_unified_e2e.py       # Automated end-to-end test suite (100% passing)
├── run_unified.py                # Single-command launcher
└── README.md
```

---

## 🚀 Quickstart & Execution Guide

### 1. Start the Unified Server (Single Command)
```bash
python run_unified.py
```

Open your browser to:
- **Mission Control Dashboard**: `http://127.0.0.1:8000/`
- **Interactive Swagger API Docs**: `http://127.0.0.1:8000/docs`
- **Alternative ReDoc**: `http://127.0.0.1:8000/redoc`

### 2. Run Automated Verification Tests
```bash
python -m pytest tests/test_unified_e2e.py -v
```

All 10 integration and unit tests pass with 100% coverage:
- `test_system_health`
- `test_stations_registry_and_physics`
- `test_geotechnical_infinite_slope_stability`
- `test_ml_model_metrics_and_ad_hoc_predict`
- `test_citizen_sos_nlp_hazard_classification`
- `test_citizen_sos_nlp_spam_filter`
- `test_authority_sos_verification_workflow`
- `test_authority_mass_evacuation_trigger`
- `test_spatial_haversine_and_hazard_polygon`
- `test_simulation_scenario_injection`

---

## 🧪 Interactive Walkthrough Demo Steps

1. **Overview Dashboard**:
   - Observe live telemetry ticks every 2.5 seconds.
   - Inspect the **Factor of Safety (FS)** badge and **T+1h / T+6h** risk probabilities on each station card.
2. **Submit Citizen SOS Report**:
   - Click **"SOS Report"** in the top navbar.
   - Choose a preset template (e.g., *"Tension Cracks (Deformation)"* or *"Muddy Springs (Hydrology)"*).
   - Click **Submit Observation** and see the NLP classifier tag it as authentic and broadcast it.
3. **Authority Verification**:
   - In the **Citizen SOS** tab, toggle **"Authority Mode"**.
   - Click **"Verify & Escalate Alert"** on any pending report.
4. **Mass Evacuation Order**:
   - Click **"Evacuate"** in the top navbar.
   - Select the sector, confirm the order, and watch the dynamic 8-vertex red danger polygon render on the **GIS Map** while sirens activate.
5. **Simulate a Cloudburst Disaster**:
   - Click **"Demo"** in the top navbar to trigger the 3-minute escalating disaster scenario.
   - Watch the telemetry charts show Factor of Safety drop below 1.0 (limit equilibrium failure) and automated alerts dispatch to civil defense logs.
