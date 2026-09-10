import React from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Droplets, 
  CloudRain, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  Play, 
  Square,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import StationCard from './StationCard';

export default function Dashboard({
  stations,
  activeAlerts,
  onSelectStation,
  onViewMap,
  onInjectScenario,
  onLaunchDemo,
  onStopScenario,
  demoRunning,
  demoProgress,
  activeScenarios
}) {
  // Aggregate KPIs
  const totalStations = stations.length;
  const criticalStations = stations.filter(s => s.current_prediction?.risk_level === 'Critical');
  const warningStations = stations.filter(s => s.current_prediction?.risk_level === 'Warning');
  const watchStations = stations.filter(s => s.current_prediction?.risk_level === 'Watch');
  const safeStations = stations.filter(s => (s.current_prediction?.risk_level || 'Safe') === 'Safe');

  // Highest risk station
  const sortedByRisk = [...stations].sort(
    (a, b) => (b.current_prediction?.risk_score || 0) - (a.current_prediction?.risk_score || 0)
  );
  const highestRiskStation = sortedByRisk[0];

  // Average Soil Moisture
  const avgMoisture = totalStations > 0 
    ? (stations.reduce((acc, s) => acc + (s.current_reading?.soil_moisture || 0), 0) / totalStations).toFixed(1)
    : 0;

  // Total Rainfall Rate across network
  const totalRainfallRate = totalStations > 0
    ? (stations.reduce((acc, s) => acc + (s.current_reading?.rainfall_rate || 0), 0) / totalStations).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Network Health */}
        <div className="bg-sentinel-card border border-sentinel-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Monitored Zones</div>
            <div className="text-2xl font-black text-white mt-1 flex items-baseline space-x-2">
              <span>{totalStations} Stations</span>
              <span className="text-xs text-emerald-400 font-normal">Active</span>
            </div>
            <div className="text-[11px] text-gray-400 mt-1 flex space-x-2 font-mono">
              <span className="text-emerald-400">{safeStations.length} Safe</span>
              <span>•</span>
              <span className="text-amber-400">{watchStations.length} Watch</span>
              <span>•</span>
              <span className="text-orange-400">{warningStations.length} Warn</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 2: Highest Regional Threat */}
        <div className={`bg-sentinel-card border rounded-xl p-4 flex items-center justify-between ${
          (highestRiskStation?.current_prediction?.risk_score || 0) >= 80
            ? 'border-red-500/60 bg-red-950/20'
            : (highestRiskStation?.current_prediction?.risk_score || 0) >= 55
            ? 'border-orange-500/50 bg-orange-950/20'
            : 'border-sentinel-border'
        }`}>
          <div>
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Peak Hazard Point</div>
            <div className="text-2xl font-black text-white mt-1 flex items-baseline space-x-2">
              <span className={
                (highestRiskStation?.current_prediction?.risk_score || 0) >= 80 ? 'text-red-400' :
                (highestRiskStation?.current_prediction?.risk_score || 0) >= 55 ? 'text-orange-400' : 'text-emerald-400'
              }>
                {highestRiskStation?.current_prediction?.risk_score?.toFixed(1) || '0.0'}
              </span>
              <span className="text-xs text-gray-400">/ 100</span>
            </div>
            <div className="text-[11px] text-gray-300 mt-1 truncate max-w-[150px]" title={highestRiskStation?.name}>
              {highestRiskStation?.name || 'Monitoring...'} ({highestRiskStation?.code})
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertOctagon className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 3: Active Alerts Count */}
        <div className="bg-sentinel-card border border-sentinel-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Active Threat Alerts</div>
            <div className="text-2xl font-black text-white mt-1 flex items-baseline space-x-2">
              <span>{activeAlerts.length}</span>
              <span className="text-xs text-gray-400 font-normal">in progress</span>
            </div>
            <div className="text-[11px] text-gray-400 mt-1 flex space-x-2">
              <span className="text-red-400 font-semibold">{criticalStations.length} Critical</span>
              <span>•</span>
              <span className="text-orange-400 font-semibold">{warningStations.length} Warning</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 4: Environmental Saturation */}
        <div className="bg-sentinel-card border border-sentinel-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Slope Saturation</div>
            <div className="text-2xl font-black text-white mt-1 flex items-baseline space-x-2">
              <span>{avgMoisture}%</span>
              <span className="text-xs text-gray-400 font-normal">avg moisture</span>
            </div>
            <div className="text-[11px] text-cyan-400 mt-1 flex items-center space-x-1">
              <CloudRain className="h-3 w-3 inline" />
              <span>{totalRainfallRate} mm/h avg intensity</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Droplets className="h-6 w-6" />
          </div>
        </div>

      </div>

      {/* Escalating Demo Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/70 via-gray-900 to-indigo-950/70 p-6 shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 flex items-center space-x-1">
                <Sparkles className="h-3 w-3" />
                <span>End-to-End Simulation Showcase</span>
              </span>
              <span className="text-xs text-gray-400">Station STN-03 (Shimla Ridge)</span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              Live Escalation Demo: Safe → Watch → Warning → Critical
            </h2>
            
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Inject a simulated monsoonal deluge on <strong>STN-03 Shimla Ridge</strong>. Watch the physics-based rainfall, soil moisture, and pore pressure elevate in real time, driving the ML classifier across all 4 alert tiers with automated SMS/Email dispatch and sirens.
            </p>

            {/* Demo Phase Tracker */}
            {demoRunning && (
              <div className="mt-4 pt-3 border-t border-gray-800 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-amber-400 font-semibold animate-pulse">
                    Demo Running: {demoProgress?.phaseName || 'Escalating Telemetry...'}
                  </span>
                  <span className="text-gray-400">{demoProgress?.elapsed || 0}s / 180s</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 via-amber-500 via-orange-500 to-red-500 h-2 transition-all duration-500"
                    style={{ width: `${Math.min(100, ((demoProgress?.elapsed || 0) / 180) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!demoRunning ? (
              <button
                onClick={onLaunchDemo}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-500/25 flex items-center space-x-2 transition-all hover:scale-105"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>Launch Escalation Demo</span>
              </button>
            ) : (
              <button
                onClick={() => onStopScenario(3)}
                className="px-5 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 font-bold text-sm flex items-center space-x-2 transition-all"
              >
                <Square className="h-4 w-4 text-red-400" />
                <span>Reset to Normal Baseline</span>
              </button>
            )}

            <button
              onClick={() => onSelectStation(3)}
              className="px-4 py-3 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 border border-gray-700/80 text-sm font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <span>View STN-03 Telemetry</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Station Cards Grid Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white tracking-wide">
            Active Geotechnical Monitoring Stations
          </h3>
          <p className="text-xs text-gray-400">
            Real-time IoT telemetry, AI landslide risk index, and geological status per slope sector
          </p>
        </div>
      </div>

      {/* Station Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {stations.map(station => (
          <StationCard
            key={station.id}
            station={station}
            onSelectStation={onSelectStation}
            onViewMap={onViewMap}
            onInjectScenario={onInjectScenario}
          />
        ))}
      </div>

    </div>
  );
}
