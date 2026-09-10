import React from 'react';
import { 
  CloudRain, 
  Droplets, 
  Gauge, 
  Mountain, 
  Activity, 
  AlertTriangle, 
  ArrowUpRight, 
  Zap,
  CheckCircle2,
  AlertOctagon,
  Eye,
  Shield,
  Clock,
  Compass
} from 'lucide-react';

const RISK_CONFIG = {
  Critical: {
    border: 'border-red-500/80 shadow-red-500/20 shadow-lg',
    bg: 'bg-gradient-to-b from-red-950/40 via-slate-900/90 to-slate-900',
    badge: 'bg-red-500 text-white animate-pulse',
    accentText: 'text-red-400',
    ring: 'stroke-red-500',
    icon: AlertOctagon,
  },
  Warning: {
    border: 'border-orange-500/70 shadow-orange-500/10 shadow-md',
    bg: 'bg-gradient-to-b from-orange-950/30 via-slate-900/90 to-slate-900',
    badge: 'bg-orange-500 text-black font-bold',
    accentText: 'text-orange-400',
    ring: 'stroke-orange-500',
    icon: AlertTriangle,
  },
  Watch: {
    border: 'border-amber-500/50',
    bg: 'bg-gradient-to-b from-amber-950/20 via-slate-900/90 to-slate-900',
    badge: 'bg-amber-500/30 text-amber-300 border border-amber-500/40',
    accentText: 'text-amber-400',
    ring: 'stroke-amber-400',
    icon: Eye,
  },
  Safe: {
    border: 'border-emerald-500/30',
    bg: 'bg-gradient-to-b from-emerald-950/15 via-slate-900/90 to-slate-900',
    badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    accentText: 'text-emerald-400',
    ring: 'stroke-emerald-400',
    icon: CheckCircle2,
  },
};

export default function StationCard({ 
  station, 
  onSelectStation, 
  onViewMap, 
  onInjectScenario 
}) {
  const reading = station.current_reading || {};
  const prediction = station.current_prediction || {};
  const activeAlert = station.active_alert;
  const riskLevel = prediction.risk_level || 'Safe';
  const riskScore = prediction.risk_score !== undefined ? prediction.risk_score : 0;
  const fs = prediction.factor_of_safety !== undefined ? prediction.factor_of_safety : 1.85;
  const t1h = prediction.risk_t1h !== undefined ? prediction.risk_t1h : 0.05;
  const t6h = prediction.risk_t6h !== undefined ? prediction.risk_t6h : 0.08;

  const config = RISK_CONFIG[riskLevel] || RISK_CONFIG.Safe;
  const RiskIcon = config.icon;

  // Gauge calculations
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (riskScore / 100) * circumference;

  // FS styling
  const getFsBadge = (val) => {
    if (val < 1.05) {
      return { text: `FS ${val.toFixed(2)} (FAILING)`, color: 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse' };
    }
    if (val < 1.30) {
      return { text: `FS ${val.toFixed(2)} (MARGINAL)`, color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    }
    return { text: `FS ${val.toFixed(2)} (STABLE)`, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
  };

  const fsBadge = getFsBadge(fs);

  return (
    <div className={`rounded-2xl border ${config.border} ${config.bg} p-5 transition-all duration-300 hover:scale-[1.015] flex flex-col justify-between shadow-xl`}>
      
      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                {station.code}
              </span>
              <h3 className="text-base font-bold text-white tracking-wide">
                {station.name}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1.5">
              <span>{station.region}</span>
              <span>•</span>
              <span>{station.elevation}m ASL</span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center space-x-1 ${config.badge}`}>
              <RiskIcon className="h-3 w-3 inline" />
              <span>{riskLevel}</span>
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${fsBadge.color}`}>
              {fsBadge.text}
            </span>
          </div>
        </div>

        {/* Risk Score & Gauge Strip */}
        <div className="mt-4 flex items-center justify-between bg-slate-950/70 p-3 rounded-xl border border-slate-800">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Risk Index & Horizon Forecast</div>
            <div className="flex items-baseline space-x-2 mt-0.5">
              <span className={`text-3xl font-black tracking-tight ${config.accentText}`}>
                {riskScore.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500 font-medium">/ 100</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-300 mt-1 font-mono">
              <span className="bg-slate-800 px-1.5 py-0.5 rounded">T+1h: <strong>{(t1h * 100).toFixed(0)}%</strong></span>
              <span className="bg-slate-800 px-1.5 py-0.5 rounded">T+6h: <strong>{(t6h * 100).toFixed(0)}%</strong></span>
            </div>
          </div>

          {/* Radial Gauge */}
          <div className="relative h-16 w-16 flex items-center justify-center">
            <svg className="h-16 w-16 -rotate-90">
              <circle
                cx="32"
                cy="32"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="5"
                fill="transparent"
              />
              <circle
                cx="32"
                cy="32"
                r={radius}
                className={`${config.ring} transition-all duration-700 ease-out`}
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <span className="absolute text-[11px] font-bold text-slate-200">
              {Math.round(riskScore)}%
            </span>
          </div>
        </div>

        {/* Live Telemetry Sensor Grid */}
        <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
          
          {/* Rainfall */}
          <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/60">
            <div className="flex items-center space-x-1 text-slate-400">
              <CloudRain className="h-3 w-3 text-blue-400" />
              <span className="text-[10px] uppercase">Rainfall</span>
            </div>
            <div className="mt-1 font-mono font-bold text-sm text-slate-100">
              {reading.rainfall_rate !== undefined ? `${reading.rainfall_rate.toFixed(1)}` : '--'}
              <span className="text-[10px] font-normal text-slate-400 ml-0.5">mm/h</span>
            </div>
          </div>

          {/* Soil Moisture */}
          <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/60">
            <div className="flex items-center space-x-1 text-slate-400">
              <Droplets className="h-3 w-3 text-cyan-400" />
              <span className="text-[10px] uppercase">Moisture</span>
            </div>
            <div className="mt-1 font-mono font-bold text-sm text-slate-100">
              {reading.soil_moisture !== undefined ? `${reading.soil_moisture.toFixed(1)}%` : '--'}
            </div>
          </div>

          {/* Pore Water Pressure */}
          <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/60">
            <div className="flex items-center space-x-1 text-slate-400">
              <Gauge className="h-3 w-3 text-indigo-400" />
              <span className="text-[10px] uppercase">Pore Press</span>
            </div>
            <div className="mt-1 font-mono font-bold text-sm text-slate-100">
              {reading.pore_water_pressure !== undefined ? `${reading.pore_water_pressure.toFixed(1)}` : '--'}
              <span className="text-[10px] font-normal text-slate-400 ml-0.5">kPa</span>
            </div>
          </div>

          {/* Slope Angle */}
          <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/60">
            <div className="flex items-center space-x-1 text-slate-400">
              <Mountain className="h-3 w-3 text-amber-400" />
              <span className="text-[10px] uppercase">Slope</span>
            </div>
            <div className="mt-1 font-mono font-bold text-sm text-slate-100">
              {reading.slope_angle !== undefined ? `${reading.slope_angle.toFixed(1)}°` : '--'}
            </div>
          </div>

          {/* Vibration */}
          <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/60">
            <div className="flex items-center space-x-1 text-slate-400">
              <Activity className="h-3 w-3 text-purple-400" />
              <span className="text-[10px] uppercase">Vibration</span>
            </div>
            <div className="mt-1 font-mono font-bold text-sm text-slate-100">
              {reading.vibration_frequency !== undefined ? `${reading.vibration_frequency.toFixed(2)}` : '--'}
              <span className="text-[10px] font-normal text-slate-400 ml-0.5">Hz</span>
            </div>
          </div>

          {/* 24h Rain Accumulation */}
          <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/60">
            <div className="flex items-center space-x-1 text-slate-400">
              <Zap className="h-3 w-3 text-yellow-400" />
              <span className="text-[10px] uppercase">24h Rain</span>
            </div>
            <div className="mt-1 font-mono font-bold text-sm text-slate-100">
              {reading.cumulative_rainfall_24h !== undefined ? `${reading.cumulative_rainfall_24h.toFixed(0)}` : '--'}
              <span className="text-[10px] font-normal text-slate-400 ml-0.5">mm</span>
            </div>
          </div>

        </div>

        {/* Contributing Factors */}
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
            Top Geotechnical Factors
          </div>
          <div className="flex flex-wrap gap-1">
            {(prediction.contributing_factors || []).slice(0, 2).map((factor, idx) => (
              <span 
                key={idx} 
                className="text-[10.5px] px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 truncate max-w-full"
                title={factor}
              >
                {factor}
              </span>
            ))}
          </div>
        </div>

        {/* Hazard Polygon indicator */}
        {station.hazard_polygon && (
          <div className="mt-2 text-[11px] text-rose-400 flex items-center gap-1 font-semibold animate-pulse">
            <Compass className="w-3 h-3" />
            <span>Active Danger Zone Polygon Projected on Map</span>
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
        <button
          onClick={() => onSelectStation(station.id)}
          className="text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1 transition-colors"
        >
          <span>Telemetry Charts</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewMap(station)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            title="Locate station on GIS Map"
          >
            Locate Map
          </button>
          <button
            onClick={() => onInjectScenario(station.id, 'cloudburst')}
            className="px-2.5 py-1 bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 border border-blue-700/50 rounded-lg transition-colors"
            title="Simulate torrential cloudburst on this station"
          >
            Test Storm
          </button>
        </div>
      </div>

    </div>
  );
}
