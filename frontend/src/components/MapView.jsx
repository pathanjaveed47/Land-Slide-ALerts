import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle2, 
  Eye, 
  MapPin, 
  ExternalLink,
  CloudRain,
  Droplets,
  Gauge,
  Layers,
  Satellite,
  Compass,
  Moon,
  Users,
  ShieldCheck,
  Radio
} from 'lucide-react';

const MAP_LAYERS = {
  carto: {
    name: 'CartoDB Dark',
    description: 'CartoDB dark matter base tiles',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  hybrid: {
    name: 'Satellite Hybrid',
    description: 'High-res mountain satellite imagery with terrain and roads',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 18,
    attribution: '&copy; Esri, Maxar, Earthstar Geographics'
  },
  topo: {
    name: 'Topographic Relief',
    description: 'OpenTopoMap elevation contour lines and mountain terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    maxZoom: 17,
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
  }
};

// Station pins based on risk level
function createCustomPin(riskLevel) {
  let color = '#10B981'; // Safe
  let isPulsing = false;

  if (riskLevel === 'Critical') {
    color = '#EF4444';
    isPulsing = true;
  } else if (riskLevel === 'Warning') {
    color = '#F97316';
    isPulsing = true;
  } else if (riskLevel === 'Watch') {
    color = '#F59E0B';
  }

  const pulseHtml = isPulsing 
    ? `<div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: ${color}; opacity: 0.6; animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
    : '';

  const html = `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
      ${pulseHtml}
      <div style="
        position: relative;
        z-index: 10;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background-color: ${color};
        border: 3px solid #0F172A;
        box-shadow: 0 0 14px ${color}cc;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: white;"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-station-pin',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
}

// Custom pin for crowdsourced citizen SOS reports
function createSOSPin(isVerified, category) {
  const color = isVerified ? '#10B981' : '#F59E0B';
  const html = `
    <div style="
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: #0F172A;
      border: 2px solid ${color};
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      transform: rotate(45deg);
    ">
      <div style="
        transform: rotate(-45deg);
        font-size: 13px;
      ">📢</div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-sos-pin',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
}

function MapController({ selectedStation }) {
  const map = useMap();
  useEffect(() => {
    if (selectedStation && selectedStation.latitude && selectedStation.longitude) {
      map.flyTo([selectedStation.latitude, selectedStation.longitude], 11, {
        duration: 1.5
      });
    }
  }, [selectedStation, map]);
  return null;
}

export default function MapView({ 
  stations = [], 
  selectedStation, 
  onSelectStation, 
  onInspectCharts,
  sosReports = [],
  evacuationOrders = []
}) {
  const defaultCenter = [22.5, 80.0];
  const defaultZoom = 5;
  const [activeLayerKey, setActiveLayerKey] = useState('carto');
  const [showGeofence, setShowGeofence] = useState(true);
  const [showSOS, setShowSOS] = useState(true);

  const currentLayer = MAP_LAYERS[activeLayerKey] || MAP_LAYERS.carto;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Map Control Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">
              GIS Early Warning & Dynamic Hazard Polygons
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-time GIS Stream</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Physics-informed slope equilibrium (FS), 8-vertex danger polygons, crowdsource pins, and 25km Haversine geofences.
          </p>
        </div>

        {/* Toggles & Layer Selector */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Overlay Toggles */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showGeofence}
                onChange={(e) => setShowGeofence(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              <span>25km Geofence</span>
            </label>
            <span className="text-slate-700">|</span>
            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showSOS}
                onChange={(e) => setShowSOS(e.target.checked)}
                className="rounded text-amber-500 focus:ring-0"
              />
              <span>SOS Pins ({sosReports.filter(r => r.is_valid_hazard).length})</span>
            </label>
          </div>

          {/* Layer Selector */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveLayerKey('carto')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors ${
                activeLayerKey === 'carto' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              <span>Dark Matter</span>
            </button>
            <button
              onClick={() => setActiveLayerKey('hybrid')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors ${
                activeLayerKey === 'hybrid' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Satellite className="h-3.5 w-3.5" />
              <span>Satellite</span>
            </button>
            <button
              onClick={() => setActiveLayerKey('topo')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors ${
                activeLayerKey === 'topo' ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Topographic</span>
            </button>
          </div>

          {/* Station Focus Selector */}
          <select
            value={selectedStation?.id || ''}
            onChange={(e) => {
              const stn = stations.find(s => s.id === parseInt(e.target.value));
              if (stn) onSelectStation(stn);
            }}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="">Center on Station...</option>
            {stations.map(s => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name} ({s.current_prediction?.risk_level || 'Safe'})
              </option>
            ))}
          </select>

        </div>
      </div>

      {/* Map Container */}
      <div className="h-[620px] rounded-2xl overflow-hidden border border-slate-800 relative shadow-2xl">
        <MapContainer
          key={activeLayerKey}
          center={defaultCenter}
          zoom={defaultZoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', background: '#0b0f19' }}
        >
          <TileLayer
            attribution={currentLayer.attribution}
            url={currentLayer.url}
            maxZoom={currentLayer.maxZoom}
          />

          <MapController selectedStation={selectedStation} />

          {/* Render Dynamic 8-vertex Danger Polygons for Stations */}
          {stations.map(station => {
            if (!station.hazard_polygon || station.hazard_polygon.length < 3) return null;
            const isCritical = station.current_prediction?.risk_level === 'Critical';
            return (
              <Polygon
                key={`poly-${station.id}`}
                positions={station.hazard_polygon}
                pathOptions={{
                  color: isCritical ? '#EF4444' : '#F97316',
                  fillColor: isCritical ? '#EF4444' : '#F97316',
                  fillOpacity: isCritical ? 0.35 : 0.20,
                  weight: 3,
                  dashArray: '5, 8'
                }}
              >
                <Popup>
                  <div className="p-1 text-slate-900 font-sans text-xs">
                    <strong className="text-red-600 block text-sm">⚠️ ACTIVE DANGER ZONE</strong>
                    <span>Station: {station.name}</span><br />
                    <span>Factor of Safety: {station.current_prediction?.factor_of_safety?.toFixed(2) || '--'}</span>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {/* Render Active Evacuation Orders Polygons */}
          {evacuationOrders.map(order => {
            if (!order.polygon_coordinates || order.polygon_coordinates.length < 3) return null;
            return (
              <Polygon
                key={`evac-${order.order_uuid}`}
                positions={order.polygon_coordinates}
                pathOptions={{
                  color: '#DC2626',
                  fillColor: '#DC2626',
                  fillOpacity: 0.45,
                  weight: 4,
                  dashArray: '4, 4'
                }}
              >
                <Popup>
                  <div className="p-1 text-slate-900 font-sans text-xs">
                    <strong className="text-rose-700 block text-sm font-black">🚨 MASS EVACUATION ORDER</strong>
                    <p className="font-bold">{order.sector_name}</p>
                    <p>Reason: {order.reason}</p>
                    <p className="text-[10px] text-slate-600">Issued by: {order.issued_by}</p>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {/* Render 25km Haversine Geofence Circles */}
          {showGeofence && stations.map(station => {
            const riskLevel = station.current_prediction?.risk_level;
            if (riskLevel !== 'Warning' && riskLevel !== 'Critical') return null;
            return (
              <Circle
                key={`geofence-${station.id}`}
                center={[station.latitude, station.longitude]}
                radius={25000} // 25 km
                pathOptions={{
                  color: riskLevel === 'Critical' ? '#EF4444' : '#F59E0B',
                  fillColor: riskLevel === 'Critical' ? '#EF4444' : '#F59E0B',
                  fillOpacity: 0.04,
                  weight: 1.5,
                  dashArray: '6, 10'
                }}
              />
            );
          })}

          {/* Render Citizen SOS Map Pins */}
          {showSOS && sosReports.filter(r => r.is_valid_hazard).map(report => (
            <Marker
              key={`sos-${report.id || report.report_uuid}`}
              position={[report.latitude, report.longitude]}
              icon={createSOSPin(report.verification_status === 'VERIFIED', report.detected_category)}
            >
              <Popup>
                <div className="p-1 text-slate-900 font-sans text-xs space-y-1">
                  <div className="font-bold text-amber-600 text-sm flex items-center gap-1">
                    <span>Citizen Field Observation</span>
                  </div>
                  <p className="italic text-slate-800">"{report.text}"</p>
                  <div className="text-[11px] text-slate-600 border-t pt-1">
                    <strong>Category:</strong> {report.detected_category}<br />
                    <strong>Confidence:</strong> {(report.confidence * 100).toFixed(0)}%<br />
                    <strong>Status:</strong> {report.verification_status}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Render Station Markers */}
          {stations.map(station => {
            const riskLevel = station.current_prediction?.risk_level || 'Safe';
            const riskScore = station.current_prediction?.risk_score || 0;
            const fs = station.current_prediction?.factor_of_safety;
            const reading = station.current_reading || {};
            const pinIcon = createCustomPin(riskLevel);

            return (
              <Marker
                key={`station-${station.id}`}
                position={[station.latitude, station.longitude]}
                icon={pinIcon}
                eventHandlers={{
                  click: () => onSelectStation(station)
                }}
              >
                <Popup className="custom-station-popup">
                  <div className="p-1 text-slate-900 font-sans text-xs min-w-[220px]">
                    <div className="flex items-center justify-between border-b pb-1.5 mb-1.5">
                      <div>
                        <strong className="text-sm text-slate-900 block">{station.name}</strong>
                        <span className="text-[11px] text-slate-600 font-mono">{station.code} · {station.region}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white ${
                        riskLevel === 'Critical' ? 'bg-red-600' :
                        riskLevel === 'Warning' ? 'bg-orange-600' :
                        riskLevel === 'Watch' ? 'bg-amber-600' : 'bg-emerald-600'
                      }`}>
                        {riskLevel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-2 text-[11px] bg-slate-100 p-2 rounded">
                      <div>
                        <span className="text-slate-600 block">Risk Score:</span>
                        <strong className="text-slate-900 text-sm font-bold">{riskScore.toFixed(1)} / 100</strong>
                      </div>
                      <div>
                        <span className="text-slate-600 block">Factor of Safety:</span>
                        <strong className={`text-sm font-bold ${fs && fs < 1.05 ? 'text-red-600' : fs && fs < 1.30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {fs ? fs.toFixed(2) : '--'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-600 block">Rainfall:</span>
                        <strong className="text-slate-900">{reading.rainfall_rate?.toFixed(1) || 0} mm/h</strong>
                      </div>
                      <div>
                        <span className="text-slate-600 block">Moisture:</span>
                        <strong className="text-slate-900">{reading.soil_moisture?.toFixed(1) || 0}%</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t">
                      <span className="text-[10px] text-slate-500">
                        {station.latitude.toFixed(3)}°N, {station.longitude.toFixed(3)}°E
                      </span>
                      <button
                        onClick={() => onInspectCharts(station.id)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Open Charts →
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        </MapContainer>
      </div>
    </div>
  );
}
