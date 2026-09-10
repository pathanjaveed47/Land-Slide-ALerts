import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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
  Moon
} from 'lucide-react';

const MAPTILER_KEY = "vHlJWoPioEAxFO8dswuF";

const MAP_LAYERS = {
  hybrid: {
    name: 'Satellite Hybrid',
    description: 'High-res mountain satellite imagery with terrain and roads',
    url: '/api/maptiler/tiles/hybrid/{z}/{x}/{y}.jpg',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
  },
  outdoor: {
    name: 'Topographic Outdoor',
    description: 'Elevation contour lines, mountain peaks, and shaded relief',
    url: '/api/maptiler/tiles/outdoor-v2/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
  },
  dark: {
    name: 'Tactical Dark',
    description: 'High-contrast emergency command dark mode',
    url: '/api/maptiler/tiles/streets-v2-dark/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
  },
  carto: {
    name: 'CartoDB Dark',
    description: 'CartoDB dark matter base tiles',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }
};

// Custom pins based on risk level
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
    ? `<div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: ${color}; opacity: 0.65; animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
    : '';

  const html = `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px;">
      ${pulseHtml}
      <div style="
        position: relative;
        z-index: 10;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background-color: ${color};
        border: 3px solid #0B0F19;
        box-shadow: 0 0 14px ${color}dd;
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
    className: 'custom-map-pin',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19]
  });
}

// Controller to fly to selected station
function MapController({ selectedStation }) {
  const map = useMap();
  useEffect(() => {
    if (selectedStation && selectedStation.latitude && selectedStation.longitude) {
      map.flyTo([selectedStation.latitude, selectedStation.longitude], 12, {
        duration: 1.5
      });
    }
  }, [selectedStation, map]);
  return null;
}

export default function MapView({ 
  stations, 
  selectedStation, 
  onSelectStation, 
  onInspectCharts 
}) {
  const defaultCenter = [22.5, 80.0]; // Center over India
  const defaultZoom = 5;
  const [activeLayerKey, setActiveLayerKey] = useState('hybrid');

  const currentLayer = MAP_LAYERS[activeLayerKey] || MAP_LAYERS.hybrid;

  return (
    <div className="space-y-4">
      
      {/* Map Control Toolbar */}
      <div className="bg-sentinel-card border border-sentinel-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">
              GIS Mountain Sensor Network
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>MapTiler API Active</span>
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Geospatial inclinometers & piezometer telemetry visualized on high-resolution terrain tiles
          </p>
        </div>

        {/* Layer Switcher & Station Zoom */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* MapTiler Layer Selector Buttons */}
          <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800 text-xs">
            <button
              onClick={() => setActiveLayerKey('hybrid')}
              className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition-colors ${
                activeLayerKey === 'hybrid' ? 'bg-blue-600 text-white font-medium' : 'text-gray-400 hover:text-white'
              }`}
              title="MapTiler Photorealistic Satellite Hybrid with Roads"
            >
              <Satellite className="h-3.5 w-3.5" />
              <span>Satellite</span>
            </button>
            <button
              onClick={() => setActiveLayerKey('outdoor')}
              className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition-colors ${
                activeLayerKey === 'outdoor' ? 'bg-blue-600 text-white font-medium' : 'text-gray-400 hover:text-white'
              }`}
              title="MapTiler Topographic Outdoor with Elevation Contours"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Topographic</span>
            </button>
            <button
              onClick={() => setActiveLayerKey('dark')}
              className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition-colors ${
                activeLayerKey === 'dark' ? 'bg-blue-600 text-white font-medium' : 'text-gray-400 hover:text-white'
              }`}
              title="MapTiler High-Contrast Dark Disaster Mode"
            >
              <Moon className="h-3.5 w-3.5" />
              <span>Tactical Dark</span>
            </button>
          </div>

          {/* Station Focus Selector */}
          <select
            value={selectedStation?.id || ''}
            onChange={(e) => {
              const stn = stations.find(s => s.id === parseInt(e.target.value));
              if (stn) onSelectStation(stn);
            }}
            className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="">Locate station...</option>
            {stations.map(s => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name} ({s.current_prediction?.risk_level || 'Safe'})
              </option>
            ))}
          </select>

          {/* Map Legend */}
          <div className="hidden lg:flex items-center space-x-3 bg-gray-900/80 px-3 py-1.5 rounded-lg border border-gray-800 text-xs">
            <span className="flex items-center space-x-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-gray-300">Safe</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-gray-300">Watch</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
              <span className="text-gray-300">Warning</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-gray-300">Critical</span>
            </span>
          </div>

        </div>
      </div>

      {/* Interactive Leaflet Map Container */}
      <div className="h-[620px] rounded-xl overflow-hidden border border-sentinel-border relative shadow-2xl">
        <MapContainer
          key={activeLayerKey}
          center={defaultCenter}
          zoom={defaultZoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', background: '#0b0f19' }}
        >
          {/* Active TileLayer powered by MapTiler */}
          <TileLayer
            attribution={currentLayer.attribution}
            url={currentLayer.url}
            maxZoom={currentLayer.maxZoom}
          />

          <MapController selectedStation={selectedStation} />

          {stations.map(station => {
            const riskLevel = station.current_prediction?.risk_level || 'Safe';
            const riskScore = station.current_prediction?.risk_score || 0;
            const reading = station.current_reading || {};
            const pinIcon = createCustomPin(riskLevel);

            return (
              <Marker
                key={station.id}
                position={[station.latitude, station.longitude]}
                icon={pinIcon}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-1 min-w-[240px] text-gray-900">
                    
                    {/* Popup Header */}
                    <div className="flex items-start justify-between border-b pb-2 mb-2">
                      <div>
                        <div className="font-mono text-xs font-bold text-blue-700 uppercase">
                          {station.code}
                        </div>
                        <h4 className="font-bold text-sm text-gray-900 leading-tight">
                          {station.name}
                        </h4>
                        <p className="text-[11px] text-gray-600">
                          {station.region} ({station.elevation}m ASL)
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        riskLevel === 'Critical' ? 'bg-red-600 text-white' :
                        riskLevel === 'Warning' ? 'bg-orange-500 text-white' :
                        riskLevel === 'Watch' ? 'bg-amber-400 text-black' : 'bg-emerald-600 text-white'
                      }`}>
                        {riskLevel}
                      </span>
                    </div>

                    {/* Risk Score */}
                    <div className="bg-gray-100 p-2 rounded mb-2 flex items-center justify-between">
                      <span className="text-xs text-gray-700 font-semibold">AI Risk Index</span>
                      <span className="text-sm font-black text-gray-900">
                        {riskScore.toFixed(1)} / 100
                      </span>
                    </div>

                    {/* Sensor Snapshot */}
                    <div className="grid grid-cols-3 gap-1.5 text-center text-xs mb-3">
                      <div className="bg-gray-50 p-1 rounded border">
                        <span className="text-[10px] text-gray-500 block">Rain</span>
                        <span className="font-bold text-gray-800">
                          {reading.rainfall_rate ? `${reading.rainfall_rate.toFixed(1)}` : '--'}
                        </span>
                        <span className="text-[9px] text-gray-400">mm/h</span>
                      </div>
                      <div className="bg-gray-50 p-1 rounded border">
                        <span className="text-[10px] text-gray-500 block">Moisture</span>
                        <span className="font-bold text-gray-800">
                          {reading.soil_moisture ? `${reading.soil_moisture.toFixed(0)}%` : '--'}
                        </span>
                        <span className="text-[9px] text-gray-400">VWC</span>
                      </div>
                      <div className="bg-gray-50 p-1 rounded border">
                        <span className="text-[10px] text-gray-500 block">Pore Press</span>
                        <span className="font-bold text-gray-800">
                          {reading.pore_water_pressure ? `${reading.pore_water_pressure.toFixed(0)}` : '--'}
                        </span>
                        <span className="text-[9px] text-gray-400">kPa</span>
                      </div>
                    </div>

                    {/* Contributing Factors */}
                    {station.current_prediction?.contributing_factors?.length > 0 && (
                      <div className="text-[11px] text-gray-700 mb-2 border-t pt-1.5">
                        <span className="font-semibold block text-[10px] text-gray-500 uppercase">Primary Driver:</span>
                        <span className="italic">{station.current_prediction.contributing_factors[0]}</span>
                      </div>
                    )}

                    {/* Action Button */}
                    <button
                      onClick={() => onInspectCharts(station.id)}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded transition-colors flex items-center justify-center space-x-1"
                    >
                      <span>Inspect Telemetry Trends</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>

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
