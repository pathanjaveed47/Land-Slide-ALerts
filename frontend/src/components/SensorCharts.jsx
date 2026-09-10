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
  Gauge,
  Compass,
  ShieldCheck
} from 'lucide-react';

export default function SensorCharts({ 
  stations = [], 
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
        if (mounted) {
          const formatted = data.map(r => ({
            ...r,
            time_label: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            risk_score: r.prediction?.risk_score || currentStation?.current_prediction?.risk_score || 20.0,
            factor_of_safety: r.prediction?.factor_of_safety || currentStation?.current_prediction?.factor_of_safety || 1.85,
            risk_t1h: r.prediction?.risk_t1h || currentStation?.current_prediction?.risk_t1h || 0.05
          }));
          setReadings(formatted.reverse());
        }
      } catch (e) {
        console.error('Error fetching station readings:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, [stationId]);

  // Append incoming telemetry tick
  useEffect(() => {
    if (!latestTelemetryTick || !latestTelemetryTick.stations) return;

    const stationUpdate = latestTelemetryTick.stations.find(s => (s.id === stationId || s.station_id === stationId));
    if (!stationUpdate) return;

    const newReading = stationUpdate.current_reading || stationUpdate.reading;
    const newPred = stationUpdate.current_prediction || stationUpdate.prediction;
    if (!newReading) return;

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
      factor_of_safety: newPred?.factor_of_safety || 1.85,
      risk_t1h: newPred?.risk_t1h || 0.05,
      risk_t6h: newPred?.risk_t6h || 0.08
    };

    setReadings(prev => {
      const updated = [...prev, point];
      return updated.slice(-60);
    });
  }, [latestTelemetryTick, stationId]);

  const warningThresh = currentStation?.warning_threshold || 55.0;
  const criticalThresh = currentStation?.critical_threshold || 80.0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-xl text-xs backdrop-blur-md">
          <p className="font-mono text-slate-400 mb-1">Time: {label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between space-x-3 py-0.5">
              <span style={{ color: entry.color }} className="font-medium">
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-white">
                {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Station Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <ChartIcon className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">
              Multi-Parametric Telemetry & Geotechnical Physics Graphs
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time synchronized sensor channels, limit-equilibrium Factor of Safety ($FS$), and ML risk index.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={stationId}
            onChange={(e) => onSelectStationId(parseInt(e.target.value))}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3.5 py-2 font-semibold focus:outline-none focus:border-blue-500"
          >
            {stations.map(s => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name} ({s.region})
              </option>
            ))}
          </select>

          <button
            onClick={() => setReadings([])}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="Reset Chart Buffer"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid of Telemetry Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. ML Risk Index & Factor of Safety */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white">Continuous Risk Score & Factor of Safety (FS)</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Stable FS &gt; 1.30</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={readings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time_label" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0.5, 3.0]} stroke="#10b981" tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine yAxisId="left" y={warningThresh} stroke="#f97316" strokeDasharray="4 4" label={{ value: 'Warning', fill: '#f97316', fontSize: 10 }} />
                <ReferenceLine yAxisId="left" y={criticalThresh} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Critical', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine yAxisId="right" y={1.05} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Failure FS=1.0', fill: '#ef4444', fontSize: 10 }} />
                <Line yAxisId="left" type="monotone" dataKey="risk_score" name="Risk Score (/100)" stroke="#f43f5e" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="factor_of_safety" name="Factor of Safety (FS)" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Hydrology & Pore Water Pressure */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Droplets className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Soil Moisture (%) & Pore Water Pressure (kPa)</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Piezometer & TDR</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={readings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time_label" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#6366f1" tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="soil_moisture" name="Soil Moisture (%)" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="pore_water_pressure" name="Pore Pressure (kPa)" stroke="#6366f1" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Rainfall Dynamics */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <CloudRain className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Precipitation Dynamics (Intensity & 24h Cumulative)</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Rain Gauge</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={readings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time_label" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" stroke="#3b82f6" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#eab308" tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="rainfall_rate" name="Intensity (mm/h)" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="cumulative_rainfall_24h" name="24h Accumulation (mm)" stroke="#eab308" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Slope Creep & Micro-Tremors */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Mountain className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Inclinometer Tilt Creep (°) & Vibration (Hz)</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Inclinometer & Geophone</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={readings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time_label" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" stroke="#f59e0b" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#a855f7" tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="slope_angle" name="Slope Creep (°)" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="right" type="monotone" dataKey="vibration_frequency" name="Vibration (Hz)" stroke="#a855f7" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
