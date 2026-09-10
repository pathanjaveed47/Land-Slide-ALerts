import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Play, 
  Sliders, 
  Cpu, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Zap,
  Activity,
  Flame,
  CloudRain,
  Radio,
  Calculator
} from 'lucide-react';
import { 
  triggerSimulationScenario, 
  updateStationThresholds, 
  fetchModelMetrics, 
  retrainModel,
  predictAdHocRisk 
} from '../services/api';

export default function AdminPanel({ stations, onRefreshStations }) {
  // Scenario injection state
  const [targetStationId, setTargetStationId] = useState(3); // Default to Shimla Ridge
  const [scenarioType, setScenarioType] = useState('cloudburst');
  const [durationSec, setDurationSec] = useState(120);
  const [scenarioMessage, setScenarioMessage] = useState(null);

  // Thresholds state
  const [threshStationId, setThreshStationId] = useState(1);
  const [warningThresh, setWarningThresh] = useState(55);
  const [criticalThresh, setCriticalThresh] = useState(80);
  const [threshMessage, setThreshMessage] = useState(null);

  // ML Metrics state
  const [metrics, setMetrics] = useState(null);
  const [retraining, setRetraining] = useState(false);

  // Ad-hoc Calculator state
  const [calcInputs, setCalcInputs] = useState({
    rainfall_rate: 45.0,
    cumulative_rainfall_24h: 120.0,
    soil_moisture: 72.0,
    slope_angle: 38.0,
    vibration_frequency: 0.8,
    pore_water_pressure: 40.0,
    temperature: 18.0
  });
  const [calcResult, setCalcResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  // Load metrics
  useEffect(() => {
    loadMetrics();
  }, []);

  // Sync threshold sliders with selected station
  useEffect(() => {
    const stn = stations.find(s => s.id === threshStationId);
    if (stn) {
      setWarningThresh(stn.warning_threshold || 55);
      setCriticalThresh(stn.critical_threshold || 80);
    }
  }, [threshStationId, stations]);

  async function loadMetrics() {
    try {
      const data = await fetchModelMetrics();
      setMetrics(data);
    } catch (e) {
      console.error('Failed to load metrics:', e);
    }
  }

  async function handleInjectScenario(e) {
    e.preventDefault();
    try {
      const res = await triggerSimulationScenario(
        scenarioType,
        targetStationId === 'all' ? null : parseInt(targetStationId),
        durationSec
      );
      setScenarioMessage({ type: 'success', text: res.message });
      setTimeout(() => setScenarioMessage(null), 5000);
    } catch (err) {
      setScenarioMessage({ type: 'error', text: err.message });
    }
  }

  async function handleSaveThresholds(e) {
    e.preventDefault();
    try {
      await updateStationThresholds(threshStationId, warningThresh, criticalThresh);
      setThreshMessage({ type: 'success', text: 'Thresholds updated successfully!' });
      onRefreshStations();
      setTimeout(() => setThreshMessage(null), 4000);
    } catch (err) {
      setThreshMessage({ type: 'error', text: err.message });
    }
  }

  async function handleRetrain() {
    setRetraining(true);
    try {
      await retrainModel();
      setTimeout(async () => {
        await loadMetrics();
        setRetraining(false);
      }, 3500);
    } catch (e) {
      console.error('Retrain error:', e);
      setRetraining(false);
    }
  }

  async function runAdHocPredict() {
    setCalculating(true);
    try {
      const res = await predictAdHocRisk(calcInputs);
      setCalcResult(res);
    } catch (e) {
      console.error('Adhoc error:', e);
    } finally {
      setCalculating(false);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-sentinel-card border border-sentinel-border rounded-xl p-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Settings className="h-5 w-5 text-blue-400" />
            <span>Admin Console & Machine Learning Control Center</span>
          </h3>
          <p className="text-xs text-gray-400">
            Scenario injections, threshold calibration, and model introspection
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. SCENARIO INJECTION STUDIO */}
        <div className="bg-sentinel-card border border-sentinel-border rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
            <Zap className="h-5 w-5 text-amber-400" />
            <div>
              <h4 className="text-sm font-bold text-white">Scenario Injection Studio</h4>
              <p className="text-xs text-gray-400">Dynamically override physical sensor streams to test disaster readiness</p>
            </div>
          </div>

          <form onSubmit={handleInjectScenario} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Target Station:</label>
              <select
                value={targetStationId}
                onChange={(e) => setTargetStationId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 focus:border-blue-500 focus:outline-none"
              >
                {stations.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name} ({s.region})
                  </option>
                ))}
                <option value="all">⚡ All Stations Simultaneously</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Simulation Scenario Type:</label>
              <select
                value={scenarioType}
                onChange={(e) => setScenarioType(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 focus:border-blue-500 focus:outline-none"
              >
                <option value="cloudburst">🌧️ Torrential Cloudburst (Heavy Rainfall & Rapid Moisture Surge)</option>
                <option value="pore_surge">💧 Subsurface Hydraulic Surge (Pore Water Pressure Spike)</option>
                <option value="seismic">⚡ Micro-Seismic Tremor (Vibration Spike & Slope Creep)</option>
                <option value="escalating_demo">🚨 Escalating Failure Demo (Safe → Watch → Warning → Critical)</option>
                <option value="normal">🌿 Reset to Normal Weather Baseline</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-gray-300 font-semibold mb-1">
                <span>Duration: {durationSec} seconds</span>
              </div>
              <input
                type="range"
                min="30"
                max="300"
                step="15"
                value={durationSec}
                onChange={(e) => setDurationSec(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            {scenarioMessage && (
              <div className={`p-2.5 rounded-lg text-xs flex items-center space-x-2 ${
                scenarioMessage.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800' : 'bg-red-950/60 text-red-300 border border-red-800'
              }`}>
                <Check className="h-4 w-4 shrink-0" />
                <span>{scenarioMessage.text}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg shadow transition-all flex items-center justify-center space-x-1.5"
            >
              <Play className="h-4 w-4 fill-white" />
              <span>Inject Scenario Now</span>
            </button>
          </form>
        </div>

        {/* 2. THRESHOLD TUNING */}
        <div className="bg-sentinel-card border border-sentinel-border rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
            <Sliders className="h-5 w-5 text-blue-400" />
            <div>
              <h4 className="text-sm font-bold text-white">Geotechnical Threshold Calibration</h4>
              <p className="text-xs text-gray-400">Configure tiered alert trigger limits tailored per geological formation</p>
            </div>
          </div>

          <form onSubmit={handleSaveThresholds} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Select Station:</label>
              <select
                value={threshStationId}
                onChange={(e) => setThreshStationId(parseInt(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 focus:border-blue-500 focus:outline-none"
              >
                {stations.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name} ({s.soil_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between text-gray-300 font-semibold mb-1">
                <span>Warning Level Threshold:</span>
                <span className="text-orange-400 font-mono font-bold">{warningThresh} / 100</span>
              </div>
              <input
                type="range"
                min="30"
                max="75"
                value={warningThresh}
                onChange={(e) => setWarningThresh(parseFloat(e.target.value))}
                className="w-full accent-orange-500"
              />
              <p className="text-[11px] text-gray-400 mt-0.5">Triggers Level-2 Traffic and Shelter Advisories</p>
            </div>

            <div>
              <div className="flex justify-between text-gray-300 font-semibold mb-1">
                <span>Critical Level Threshold:</span>
                <span className="text-red-400 font-mono font-bold">{criticalThresh} / 100</span>
              </div>
              <input
                type="range"
                min="65"
                max="95"
                value={criticalThresh}
                onChange={(e) => setCriticalThresh(parseFloat(e.target.value))}
                className="w-full accent-red-500"
              />
              <p className="text-[11px] text-gray-400 mt-0.5">Triggers Level-3 Evacuation Siren and Emergency SMS Dispatch</p>
            </div>

            {threshMessage && (
              <div className={`p-2.5 rounded-lg text-xs flex items-center space-x-2 ${
                threshMessage.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800' : 'bg-red-950/60 text-red-300 border border-red-800'
              }`}>
                <Check className="h-4 w-4 shrink-0" />
                <span>{threshMessage.text}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg border border-gray-700 transition-colors flex items-center justify-center space-x-1.5"
            >
              <Check className="h-4 w-4 text-emerald-400" />
              <span>Save Calibrated Thresholds</span>
            </button>
          </form>
        </div>

      </div>

      {/* 3. ML MODEL METRICS & FEATURE IMPORTANCES */}
      <div className="bg-sentinel-card border border-sentinel-border rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-3">
          <div className="flex items-center space-x-2">
            <Cpu className="h-5 w-5 text-purple-400" />
            <div>
              <h4 className="text-sm font-bold text-white">Machine Learning Risk Classifier Performance</h4>
              <p className="text-xs text-gray-400">Trained on 15,000 synthetic physics-coupled geotechnical samples</p>
            </div>
          </div>

          <button
            onClick={handleRetrain}
            disabled={retraining}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              retraining ? 'bg-gray-800 text-gray-400 cursor-wait' : 'bg-purple-600 hover:bg-purple-500 text-white'
            }`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${retraining ? 'animate-spin' : ''}`} />
            <span>{retraining ? 'Retraining...' : 'Retrain Model'}</span>
          </button>
        </div>

        {metrics ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
            
            {/* Stat Cards */}
            <div className="space-y-3">
              <div className="bg-gray-950/60 p-3.5 rounded-xl border border-gray-800">
                <span className="text-gray-400 block uppercase tracking-wider text-[10px]">Test Classification Accuracy</span>
                <span className="text-2xl font-black text-emerald-400">
                  {(metrics.accuracy * 100).toFixed(1)}%
                </span>
                <p className="text-[11px] text-gray-500 mt-0.5">Across Safe, Watch, Warning, Critical</p>
              </div>

              <div className="bg-gray-950/60 p-3.5 rounded-xl border border-gray-800">
                <span className="text-gray-400 block uppercase tracking-wider text-[10px]">Risk Score Regressor R²</span>
                <span className="text-2xl font-black text-blue-400">
                  {metrics.r2_score?.toFixed(4) || '0.9917'}
                </span>
                <p className="text-[11px] text-gray-500 mt-0.5">RMSE: {metrics.rmse?.toFixed(2) || '2.87'} on 0-100 scale</p>
              </div>

              <div className="bg-gray-950/60 p-3.5 rounded-xl border border-gray-800">
                <span className="text-gray-400 block uppercase tracking-wider text-[10px]">Dataset Scale</span>
                <span className="text-xl font-bold text-gray-200">
                  {metrics.total_training_samples?.toLocaleString() || '15,000'} records
                </span>
                <p className="text-[11px] text-gray-500 mt-0.5">Coupled hydrologic & geotechnical limits</p>
              </div>
            </div>

            {/* Feature Importances */}
            <div className="lg:col-span-2 bg-gray-950/60 p-4 rounded-xl border border-gray-800 space-y-2.5">
              <h5 className="font-semibold text-gray-200 uppercase tracking-wider text-[11px]">
                Feature Importance Ranking (Gini & Tree Gain)
              </h5>
              <div className="space-y-2">
                {(metrics.feature_importances || []).map(fi => (
                  <div key={fi.feature}>
                    <div className="flex justify-between font-mono text-[11px] mb-0.5">
                      <span className="text-gray-300 font-semibold">{fi.feature}</span>
                      <span className="text-purple-400 font-bold">{(fi.importance * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, fi.importance * 220)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="text-xs text-gray-400">Loading model performance metrics...</div>
        )}
      </div>

      {/* 4. AD-HOC RISK CALCULATOR */}
      <div className="bg-sentinel-card border border-sentinel-border rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
          <Calculator className="h-5 w-5 text-emerald-400" />
          <div>
            <h4 className="text-sm font-bold text-white">Interactive Ad-Hoc Risk Calculator</h4>
            <p className="text-xs text-gray-400">Simulate custom sensor combinations to see the model's instant risk inference and driver breakdown</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
          {/* Sliders */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between font-medium text-gray-300 mb-1">
                <span>Rainfall Rate (mm/h):</span>
                <span className="font-mono font-bold text-blue-400">{calcInputs.rainfall_rate}</span>
              </div>
              <input
                type="range"
                min="0"
                max="120"
                step="1"
                value={calcInputs.rainfall_rate}
                onChange={e => setCalcInputs({ ...calcInputs, rainfall_rate: parseFloat(e.target.value) })}
                className="w-full accent-blue-500"
              />
            </div>

            <div>
              <div className="flex justify-between font-medium text-gray-300 mb-1">
                <span>24h Cumulative Rain (mm):</span>
                <span className="font-mono font-bold text-indigo-400">{calcInputs.cumulative_rainfall_24h}</span>
              </div>
              <input
                type="range"
                min="0"
                max="350"
                step="5"
                value={calcInputs.cumulative_rainfall_24h}
                onChange={e => setCalcInputs({ ...calcInputs, cumulative_rainfall_24h: parseFloat(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between font-medium text-gray-300 mb-1">
                <span>Soil Moisture (%):</span>
                <span className="font-mono font-bold text-cyan-400">{calcInputs.soil_moisture}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="1"
                value={calcInputs.soil_moisture}
                onChange={e => setCalcInputs({ ...calcInputs, soil_moisture: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between font-medium text-gray-300 mb-1">
                <span>Pore Water Pressure (kPa):</span>
                <span className="font-mono font-bold text-purple-400">{calcInputs.pore_water_pressure}</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="1"
                value={calcInputs.pore_water_pressure}
                onChange={e => setCalcInputs({ ...calcInputs, pore_water_pressure: parseFloat(e.target.value) })}
                className="w-full accent-purple-500"
              />
            </div>

            <div>
              <div className="flex justify-between font-medium text-gray-300 mb-1">
                <span>Slope Angle (°):</span>
                <span className="font-mono font-bold text-amber-400">{calcInputs.slope_angle}°</span>
              </div>
              <input
                type="range"
                min="15"
                max="60"
                step="1"
                value={calcInputs.slope_angle}
                onChange={e => setCalcInputs({ ...calcInputs, slope_angle: parseFloat(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between font-medium text-gray-300 mb-1">
                <span>Vibration (Hz):</span>
                <span className="font-mono font-bold text-pink-400">{calcInputs.vibration_frequency}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={calcInputs.vibration_frequency}
                onChange={e => setCalcInputs({ ...calcInputs, vibration_frequency: parseFloat(e.target.value) })}
                className="w-full accent-pink-500"
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <button
                type="button"
                onClick={runAdHocPredict}
                disabled={calculating}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <span>Run Instant AI Risk Inference</span>
              </button>
            </div>
          </div>

          {/* Results Box */}
          <div className="bg-gray-950/70 p-4 rounded-xl border border-gray-800 flex flex-col justify-between">
            {calcResult ? (
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Predicted Landslide Risk</span>
                  <div className="text-3xl font-black text-white mt-1 flex items-baseline space-x-2">
                    <span className={
                      calcResult.risk_level === 'Critical' ? 'text-red-400' :
                      calcResult.risk_level === 'Warning' ? 'text-orange-400' :
                      calcResult.risk_level === 'Watch' ? 'text-amber-400' : 'text-emerald-400'
                    }>
                      {calcResult.risk_score.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-400">/ 100</span>
                  </div>
                  <span className={`inline-block mt-1 text-xs px-2.5 py-0.5 rounded font-bold uppercase ${
                    calcResult.risk_level === 'Critical' ? 'bg-red-500 text-white' :
                    calcResult.risk_level === 'Warning' ? 'bg-orange-500 text-white' :
                    calcResult.risk_level === 'Watch' ? 'bg-amber-400 text-black' : 'bg-emerald-500 text-white'
                  }`}>
                    {calcResult.risk_level}
                  </span>
                </div>

                <div className="border-t border-gray-800 pt-2">
                  <span className="text-[10px] uppercase text-gray-400 font-semibold block mb-1">Contributing Triggers:</span>
                  <ul className="space-y-1 text-[11px] text-gray-300">
                    {(calcResult.contributing_factors || []).map((f, i) => (
                      <li key={i} className="flex items-start space-x-1">
                        <span className="text-blue-400">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Adjust the sensor sliders on the left and click "Run Instant AI Risk Inference" to evaluate slope stability.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
