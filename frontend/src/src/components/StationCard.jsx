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
  Eye
} from 'lucide-react';

const RISK_CONFIG = {
  Critical: {
    border: 'border-red-500/80 shadow-red-500/20 shadow-lg',
    bg: 'bg-gradient-to-b from-red-950/40 via-gray-900/90 to-gray-900',
    badge: 'bg-red-500 text-white animate-pulse',
    accentText: 'text-red-400',
    ring: 'stroke-red-500',
    icon: AlertOctagon,
  },
  Warning: {
    border: 'border-orange-500/70 shadow-orange-500/10 shadow-md',
    bg: 'bg-gradient-to-b from-orange-950/30 via-gray-900/90 to-gray-900',
    badge: 'bg-orange-500 text-black font-bold',
    accentText: 'text-orange-400',
    ring: 'stroke-orange-500',
    icon: AlertTriangle,
  },
  Watch: {
    border: 'border-amber-500/50',
    bg: 'bg-gradient-to-b from-amber-950/20 via-gray-900/90 to-gray-900',
    badge: 'bg-amber-500/30 text-amber-300 border border-amber-500/40',
    accentText: 'text-amber-400',
    ring: 'stroke-amber-400',
    icon: Eye,
  },
  Safe: {
    border: 'border-emerald-500/30',
    bg: 'bg-gradient-to-b from-emerald-950/15 via-gray-900/90 to-gray-900',
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
  const config = RISK_CONFIG[riskLevel] || RISK_CONFIG.Safe;
  const RiskIcon = config.icon;

  // Circular gauge calculations
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (riskScore / 100) * circumference;

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-5 transition-all duration-300 hover:scale-[1.015] flex flex-col justify-between`}>
      
      {/* Card Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700 font-semibold">
                {station.code}
              </span>
              <h3 className="text-base font-bold text-white tracking-wide">
                {station.name}
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-1 flex items-center space-x-1">
              <span>{station.region}</span>
              <span>•</span>
              <span>{station.elevation}m ASL</span>
            </p>
          </div>

          {/* Risk Badge */}
          <div className="flex items-center space-x-1.5">
            <span className={`text-xs px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center space-x-1 ${config.badge}`}>
              <RiskIcon className="h-3 w-3 inline" />
              <span>{riskLevel}</span>
            </span>
          </div>
        </div>

        {/* Risk Score & Gauge Strip */}
        <div className="mt-4 flex items-center justify-between bg-gray-950/60 p-3 rounded-lg border border-gray-800">
          <div>
            <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">AI Risk Index</div>
            <div className="flex items-baseline space-x-2 mt-0.5">
              <span className={`text-3xl font-black tracking-tight ${config.accentText}`}>
                {riskScore.toFixed(1)}
              </span>
              <span className="text-xs text-gray-500 font-medium">/ 100</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              Confidence: {Math.round((prediction.confidence || 0.95) * 100)}%
            </div>
          </div>

          {/* Radial Mini Gauge */}
          <div className="relative h-16 w-16 flex items-center justify-center">
            <svg className="h-16 w-16 -rotate-90">
              <circle
                cx="32"
                cy="32"
                r={radius}
                className="stroke-gray-800"
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
            <span className="absolute text-[11px] font-bold text-gray-200">
              {Math.round(riskScore)}%
            </span>
          </div>
        </div>

        {/* Live Telemetry Sensor Grid */}
        <div className="grid grid-cols-3 gap-2 mt-3.5 text-xs">
          
          {/* Rainfall */}
          <div className="bg-gray-800/60 p-2 rounded-lg border border-gray-800/80">
            <div className="flex items-center space-x-1 text-gray-400">
              <CloudRain className="h-3 w-3 text-blue-400" />
              <span className="text-[10px] uppercase">Rainfall</span>
            </div>
            <div className="mt-1 font-mono font-bold text-sm text-gray-100">
              {reading.rainfall_rate !== undefined ? `${reading.rainfall_rate.toFixed(1)}` : '--'}
              <span className="text-[10px] font-normal text-gray-400 ml-0.5">mm/h</span>
            </div>
          </div>

          {/* Soil Moisture */}
          <div className="bg-gray-800/60 p-2 rounded-lg border border-gray-800/80">
            <div className="flex items-center space-x-1 text-gray-400">
              <Droplets className="h-3 w-3 text-cyan-400" />
              <span className="text-[10px] uppercase">Moisture</span>
            </div>
            <div className="mt-1 font-mono font-bold text-sm text-gray-100">
              {reading.soil_moisture !== undefined ? `${reading.soil_moisture.toFixed(1)}%` : '--'}
            </div>
          </div>

          {/* Pore Water Pressure */}
          <div className="bg-gray-800/60 p-2 rounded-lg border border-gray-800/80">
            <div className="flex items-center space-x-1 text-gray-400">
              <Gauge className="h-3 w-3 text-indigo-400" />
              <span className="text-[10px] uppercase">Pore Press</span>
            </div>
            <div className="mt-1 font-mono font-bold text-sm text-gray-100">
              {reading.pore_water_pressure !== undefined ? `${reading.pore_water_pressure.toFixed(1)}` : '--'}
              <span className="text-[10px] font-normal text-gray-400 ml-0.5">kPa</span>
            </div>
          </div>

          {/* Slope Angle */}
          <div className="bg-gray-800/60 p-2 rounded-lg border border-gray-800/80">
            <div className="flex items-center space-x-1 text-gray-400">
              <Mountain className="h-3 w-3 text-amber-400" />
              <span className="text-[10px] uppercase">Slope</span>
            </div>
            <div className="mt-1 font-mono font-bold text-sm text-gray-100">
              {reading.slope_angle !== undefined ? `${reading.slope_angle.toFixed(1)}°` : '--'}
            </div>
          </div>

          {/* Vibration */}
          <div className="bg-gray-800/60 p-2 rounded-lg border border-gray-800/80">
            <div className="flex items-center space-x-1 text-gray-400">
              <Activity className="h-3 w-3 text-purple-400" />
              <span className="text-[10px] uppercase">Vibration</span>
            </div>
            <div className="mt-1 font-mono font-bold text-sm text-gray-100">
              {reading.vibration_frequency !== undefined ? `${reading.vibration_frequency.toFixed(2)}` : '--'}
              <span className="text-[10px] font-normal text-gray-400 ml-0.5">Hz</span>
            </div>
          </div>

          {/* 24h Rain Accumulation */}
          <div className="bg-gray-800/60 p-2 rounded-lg border border-gray-800/80">
            <div className="flex items-center space-x-1 text-gray-400">
              <Zap className="h-3 w-3 text-yellow-400" />
              <span className="text-[10px] uppercase">24h Rain</span>
            </div>
            <div className="mt-1 font-mono font-bold text-sm text-gray-100">
              {reading.cumulative_rainfall_24h !== undefined ? `${reading.cumulative_rainfall_24h.toFixed(0)}` : '--'}
              <span className="text-[10px] font-normal text-gray-400 ml-0.5">mm</span>
            </div>
          </div>

        </div>

        {/* Contributing Factors Pills */}
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
            Top Risk Drivers
          </div>
          <div className="flex flex-wrap gap-1">
            {(prediction.contributing_factors || []).slice(0, 2).map((factor, idx) => (
              <span 
                key={idx} 
                className="text-[10.5px] px-2 py-0.5 rounded bg-gray-800/90 text-gray-300 border border-gray-700/60 truncate max-w-full"
                title={factor}
              >
                {factor}
              </span>
            ))}
          </div>
        </div>

        {/* Active Alert Banner if Warning or Critical */}
        {activeAlert && (
          <div className="mt-3 p-2 bg-red-950/50 border border-red-800/70 rounded-lg text-xs text-red-300">
            <div className="font-semibold flex items-center space-x-1">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              <span>Active Alert: {activeAlert.message}</span>
            </div>
            <p className="text-[11px] text-gray-300 mt-1 line-clamp-1">
              Action: {activeAlert.suggested_action}
            </p>
          </div>
        )}
      </div>

      {/* Card Action Footer */}
      <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs">
        <button
          onClick={() => onSelectStation(station.id)}
          className="text-blue-400 hover:text-blue-300 font-medium flex items-center space-x-1 transition-colors"
        >
          <span>Telemetry Charts</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewMap(station)}
            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
            title="Locate station on GIS Map"
          >
            Locate Map
          </button>
          <button
            onClick={() => onInjectScenario(station.id, 'cloudburst')}
            className="px-2.5 py-1 bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 border border-blue-700/50 rounded transition-colors"
            title="Simulate torrential cloudburst on this station"
          >
            Test Storm
          </button>
        </div>
      </div>

    </div>
  );
}
