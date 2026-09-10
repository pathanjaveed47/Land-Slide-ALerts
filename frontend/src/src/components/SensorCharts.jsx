import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { fetchStationReadings } from '../services/api';
import { 
  LineChart as ChartIcon, 
  RefreshCw, 
  Activity, 
  CloudRain, 
  Droplets, 
  Mountain,
  Gauge
} from 'lucide-react';

export default function SensorCharts({ 
  stations, 
  selectedStationId, 
  onSelectStationId,
  latestTelemetryTick 
}) {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState('all');

  const currentStation = stations.find(s => s.id === selectedStationId) || stations[0];
  const stationId = currentStation?.id || 1;

  // Fetch initial history
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const data = await fetchStationReadings(stationId, 60);
        if (mounted) setReadings(data);
      } catch (e) {
        console.error('Error fetching station readings:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, [stationId]);

  // Append incoming telemetry tick if it belongs to current station
  useEffect(() => {
    if (!latestTelemetryTick || !latestTelemetryTick.stations) return;

    const stationUpdate = latestTelemetryTick.stations.find(s => s.station_id === stationId);
    if (!stationUpdate) return;

    const newReading = stationUpdate.reading;
    const newPred = stationUpdate.prediction;

    const point = {
      id: newReading.id,
      timestamp: newReading.timestamp,
      time_label: new Date(newReading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      rainfall_rate: newReading.rainfall_rate,
      cumulative_rainfall_24h: newReading.cumulative_rainfall_24h,
      soil_moisture: newReading.soil_moisture,
      slope_angle: newReading.slope_angle,
      vibration_frequency: newReading.vibration_frequency,
      pore_water_pressure: newReading.pore_water_pressure,
      temperature: newReading.temperature,
      risk_score: newPred?.risk_score || 0.0,
      risk_level: newPred?.risk_level || 'Safe'
    };

    setReadings(prev => {
      // Keep last 60 points for high-performance responsive charting
      const updated = [...prev, point];
      return updated.slice(-60);
    });
  }, [latestTelemetryTick, stationId]);

  const warningThresh = currentStation?.warning_threshold || 55.0;
  const criticalThresh = currentStation?.critical_threshold || 80.0;

  // Custom Dark Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/95 border border-gray-700 p-3 rounded-lg shadow-xl text-xs backdrop-blur-md">
          <p className="font-mono text-gray-400 mb-1">Time: {label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between space-x-3 py-0.5">
              <span style={{ color: entry.color }} className="font-medium">
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-white">
                {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value} {entry.unit}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">

      {/* Control Header */}
      <div className="bg-sentinel-card border border-sentinel-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <ChartIcon className="h-5 w-5 text-blue-400" />
            <span>Time-Series Telemetry & ML Predictions</span>
          </h3>
          <p className="text-xs text-gray-400">
            Real-time streaming multi-sensor graphs with automated hazard threshold lines
          </p>
        </div>

        {/* Station Selector & Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400 font-medium">Station:</span>
            <select
              value={stationId}
              onChange={(e) => onSelectStationId(parseInt(e.target.value))}
              className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
            >
              {stations.map(s => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name} ({s.current_prediction?.risk_level || 'Safe'})
                </option>
              ))}
            </select>
          </div>

          {/* Chart View Mode Tabs */}
          <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800 text-xs">
            <button
              onClick={() => setActiveChartTab('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeChartTab === 'all' ? 'bg-blue-600 text-white font-medium' : 'text-gray-400 hover:text-white'
              }`}
            >
              All Sensor Views
            </button>
            <button
              onClick={() => setActiveChartTab('risk')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeChartTab === 'risk' ? 'bg-blue-600 text-white font-medium' : 'text-gray-400 hover:text-white'
              }`}
            >
              Risk Index Only
            </button>
            <button
              onClick={() => setActiveChartTab('hydrology')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeChartTab === 'hydrology' ? 'bg-blue-600 text-white font-medium' : 'text-gray-400 hover:text-white'
              }`}
            >
              Hydrology
            </button>
            <button
              onClick={() => setActiveChartTab('geotechnical')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeChartTab === 'geotechnical' ? 'bg-blue-600 text-white font-medium' : 'text-gray-400 hover:text-white'
              }`}
            >
              Soil & Piezometer
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Graphs */}
      <div className="space-y-6">

        {/* 1. ML RISK SCORE TREND */}
        {(activeChartTab === 'all' || activeChartTab === 'risk') && (
          <div className="bg-sentinel-card border border-sentinel-border rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-red-400" />
                  <span>AI Continuous Landslide Risk Index (0 - 100)</span>
                </h4>
                <p className="text-xs text-gray-400">
                  Calculated dynamically from calibrated Random Forest and Gradient Boosting regression
                </p>
              </div>
              <div className="flex items-center space-x-3 text-xs font-mono">
                <span className="text-orange-400 flex items-center space-x-1">
                  <span className="w-2.5 h-0.5 bg-orange-500 inline-block" />
                  <span>Warning: {warningThresh}</span>
                </span>
                <span className="text-red-400 flex items-center space-x-1">
                  <span className="w-2.5 h-0.5 bg-red-500 inline-block" />
                  <span>Critical: {criticalThresh}</span>
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={readings} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="time_label" stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine 
                    y={warningThresh} 
                    stroke="#F97316" 
                    strokeDasharray="4 4" 
                    label={{ value: 'WARNING', fill: '#F97316', fontSize: 10, position: 'right' }} 
                  />
                  <ReferenceLine 
                    y={criticalThresh} 
                    stroke="#EF4444" 
                    strokeDasharray="4 4" 
                    label={{ value: 'CRITICAL', fill: '#EF4444', fontSize: 10, position: 'right' }} 
                  />
                  <Line
                    type="monotone"
                    dataKey="risk_score"
                    name="Risk Index"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#3B82F6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 2. HYDROLOGY: RAINFALL RATE & CUMULATIVE PRECIPITATION */}
        {(activeChartTab === 'all' || activeChartTab === 'hydrology') && (
          <div className="bg-sentinel-card border border-sentinel-border rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                  <CloudRain className="h-4 w-4 text-blue-400" />
                  <span>Precipitation Dynamics (Rainfall Rate & 24h Accumulation)</span>
                </h4>
                <p className="text-xs text-gray-400">
                  Instantaneous intensity (mm/hr) vs cumulative hydration load (mm)
                </p>
              </div>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={readings} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="time_label" stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke="#38bdf8" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#818cf8" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="rainfall_rate"
                    name="Rainfall Rate (mm/hr)"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulative_rainfall_24h"
                    name="24h Cumulative Rain (mm)"
                    stroke="#818cf8"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 3. GEOTECHNICAL: SOIL MOISTURE & PORE WATER PRESSURE */}
        {(activeChartTab === 'all' || activeChartTab === 'geotechnical') && (
          <div className="bg-sentinel-card border border-sentinel-border rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Droplets className="h-4 w-4 text-cyan-400" />
                  <span>Subsurface Saturation (Soil Moisture & Pore Water Pressure)</span>
                </h4>
                <p className="text-xs text-gray-400">
                  High pore pressure diminishes effective cohesion, creating basal slip planes
                </p>
              </div>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={readings} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="time_label" stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" domain={[0, 100]} stroke="#22d3ee" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#c084fc" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="soil_moisture"
                    name="Soil Moisture (%)"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="pore_water_pressure"
                    name="Pore Water Pressure (kPa)"
                    stroke="#c084fc"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 4. DYNAMIC SLOPE STABILITY & VIBRATION */}
        {activeChartTab === 'all' && (
          <div className="bg-sentinel-card border border-sentinel-border rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Mountain className="h-4 w-4 text-amber-400" />
                  <span>Structural Inclinometry & Ground Vibration</span>
                </h4>
                <p className="text-xs text-gray-400">
                  Real-time slope deformation (degrees) alongside micro-seismic tremors (Hz)
                </p>
              </div>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={readings} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="time_label" stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke="#fbbf24" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#e879f9" tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="slope_angle"
                    name="Slope Angle (°)"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="vibration_frequency"
                    name="Ground Vibration (Hz)"
                    stroke="#e879f9"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
