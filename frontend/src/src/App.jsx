import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import AlertBanner from './components/AlertBanner';
import Dashboard from './components/Dashboard';
import MapView from './components/MapView';
import SensorCharts from './components/SensorCharts';
import AlertFeed from './components/AlertFeed';
import AdminPanel from './components/AdminPanel';

import { 
  fetchStations, 
  fetchAlerts, 
  fetchNotificationLogs, 
  acknowledgeAlert, 
  resolveAlert,
  triggerSimulationScenario 
} from './services/api';
import { alertAudio } from './utils/audio';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stations, setStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState(3); // Default to STN-03 Shimla Ridge
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [latestTelemetryTick, setLatestTelemetryTick] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [activeScenarios, setActiveScenarios] = useState({});
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoProgress, setDemoProgress] = useState({ phaseName: '', elapsed: 0 });

  const wsRef = useRef(null);

  // Sync mute with audio service
  useEffect(() => {
    alertAudio.setMuted(isMuted);
  }, [isMuted]);

  // Initial data loading
  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      const [stns, alrts, notifs] = await Promise.all([
        fetchStations(),
        fetchAlerts(),
        fetchNotificationLogs()
      ]);
      setStations(stns);
      setAlerts(alrts);
      setNotifications(notifs);
    } catch (e) {
      console.error('Failed to load initial data:', e);
    }
  }

  // WebSocket Connection Management
  useEffect(() => {
    let reconnectTimeout = null;
    let shouldReconnect = true;

    function connectWs() {
      // Use window.location protocol & host, with fallback to 127.0.0.1:8000
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      // If running through Vite dev server proxy or direct backend
      const wsUrl = `${protocol}//${host}/ws/telemetry`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Telemetry WebSocket connected.');
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'telemetry_batch') {
            setLatestTelemetryTick(data);

            // Update stations state with latest telemetry and predictions
            if (data.stations && data.stations.length > 0) {
              setStations(prev => {
                const map = new Map(prev.map(s => [s.id, s]));
                data.stations.forEach(update => {
                  const existing = map.get(update.station_id);
                  if (existing) {
                    map.set(update.station_id, {
                      ...existing,
                      current_reading: update.reading,
                      current_prediction: update.prediction,
                      active_alert: update.alert || existing.active_alert
                    });
                  }
                });
                return Array.from(map.values());
              });
            }

            // Update scenario tracking
            const scenarios = data.active_scenarios || {};
            setActiveScenarios(scenarios);

            // Check if demo scenario is currently active on Station 3
            const stn3Scenario = scenarios['3'];
            if (stn3Scenario && stn3Scenario.type === 'escalating_demo') {
              setDemoRunning(true);
              const elapsed = Math.round(stn3Scenario.elapsed);
              let phaseName = 'Phase 1: Baseline Normal Weather';
              if (elapsed > 115) phaseName = 'Phase 4: CRITICAL Extreme Cloudburst & Ground Tremor!';
              else if (elapsed > 65) phaseName = 'Phase 3: WARNING Saturated Slope & Runoff';
              else if (elapsed > 25) phaseName = 'Phase 2: WATCH Soil Moisture Escalating';

              setDemoProgress({ phaseName, elapsed });
            } else {
              setDemoRunning(false);
            }

            // Check if any station triggered a new alert in this tick
            data.stations.forEach(stnUpdate => {
              if (stnUpdate.alert && stnUpdate.alert.is_new) {
                // Play audible alarm
                if (stnUpdate.alert.risk_level === 'Critical') {
                  alertAudio.playCriticalAlarm();
                } else {
                  alertAudio.playWarningChime();
                }

                // Prepend new alert to local state
                setAlerts(prev => {
                  if (prev.some(a => a.id === stnUpdate.alert.id)) return prev;
                  return [stnUpdate.alert, ...prev];
                });

                // Refresh notification dispatch list
                fetchNotificationLogs().then(setNotifications).catch(console.error);
              }
            });

          }
        } catch (err) {
          console.warn('Error processing WS message:', err);
        }
      };

      ws.onerror = (err) => {
        console.warn('WebSocket error:', err);
        setWsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket closed. Retrying in 3 seconds...');
        setWsConnected(false);
        if (shouldReconnect) {
          reconnectTimeout = setTimeout(connectWs, 3000);
        }
      };
    }

    connectWs();

    // Heartbeat interval
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping');
      }
    }, 15000);

    return () => {
      shouldReconnect = false;
      clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Automatic high-frequency fallback polling when WebSocket is disconnected or through HTTP-only tunnels
  useEffect(() => {
    if (wsConnected) return;
    const pollInterval = setInterval(async () => {
      try {
        const [stns, alrts] = await Promise.all([fetchStations(), fetchAlerts()]);
        setStations(stns);
        setAlerts(alrts);
      } catch (err) {
        // silent fallback
      }
    }, 2500);
    return () => clearInterval(pollInterval);
  }, [wsConnected]);

  // Alert Handlers
  async function handleAcknowledgeAlert(alertId) {
    try {
      await acknowledgeAlert(alertId);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'ACKNOWLEDGED' } : a));
    } catch (e) {
      console.error('Error acknowledging alert:', e);
    }
  }

  async function handleResolveAlert(alertId) {
    try {
      await resolveAlert(alertId);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'RESOLVED' } : a));
    } catch (e) {
      console.error('Error resolving alert:', e);
    }
  }

  // Launch Escalating Demo Scenario on STN-03 Shimla Ridge
  async function handleLaunchDemo() {
    try {
      await triggerSimulationScenario('escalating_demo', 3, 200, 1.0);
      setSelectedStationId(3);
      setDemoRunning(true);
      setDemoProgress({ phaseName: 'Phase 1: Baseline Normal Weather', elapsed: 0 });
    } catch (e) {
      console.error('Error launching demo:', e);
    }
  }

  // Reset / Stop scenario
  async function handleStopScenario(stationId) {
    try {
      await triggerSimulationScenario('normal', stationId, 60, 1.0);
      setDemoRunning(false);
    } catch (e) {
      console.error('Error stopping scenario:', e);
    }
  }

  // Quick action from card to focus on map
  const [mapFocusStation, setMapFocusStation] = useState(null);
  function handleViewMap(station) {
    setMapFocusStation(station);
    setActiveTab('map');
  }

  // Quick action to view charts for a station
  function handleSelectStation(stationId) {
    setSelectedStationId(stationId);
    setActiveTab('charts');
  }

  // Inject scenario helper
  async function handleInjectScenario(stationId, scenarioType) {
    try {
      await triggerSimulationScenario(scenarioType, stationId, 120, 1.0);
    } catch (e) {
      console.error('Failed to inject scenario:', e);
    }
  }

  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED');
  const criticalCount = activeAlerts.filter(a => a.risk_level === 'Critical').length;

  return (
    <div className="min-h-screen bg-sentinel-bg text-gray-100 flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        wsConnected={wsConnected}
        activeAlertCount={activeAlerts.length}
        criticalCount={criticalCount}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        onLaunchDemo={handleLaunchDemo}
        demoRunning={demoRunning}
        activeScenarios={activeScenarios}
      />

      {/* Emergency Alert Banner if Critical / Warning alert is live */}
      <AlertBanner
        activeAlerts={activeAlerts}
        onSelectStation={handleSelectStation}
        onNavigateAlerts={() => setActiveTab('alerts')}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {activeTab === 'dashboard' && (
          <Dashboard
            stations={stations}
            activeAlerts={activeAlerts}
            onSelectStation={handleSelectStation}
            onViewMap={handleViewMap}
            onInjectScenario={handleInjectScenario}
            onLaunchDemo={handleLaunchDemo}
            onStopScenario={handleStopScenario}
            demoRunning={demoRunning}
            demoProgress={demoProgress}
            activeScenarios={activeScenarios}
          />
        )}

        {activeTab === 'map' && (
          <MapView
            stations={stations}
            selectedStation={mapFocusStation}
            onSelectStation={setMapFocusStation}
            onInspectCharts={handleSelectStation}
          />
        )}

        {activeTab === 'charts' && (
          <SensorCharts
            stations={stations}
            selectedStationId={selectedStationId}
            onSelectStationId={setSelectedStationId}
            latestTelemetryTick={latestTelemetryTick}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertFeed
            alerts={alerts}
            notifications={notifications}
            onAcknowledge={handleAcknowledgeAlert}
            onResolve={handleResolveAlert}
            onSelectStation={handleSelectStation}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            stations={stations}
            onRefreshStations={loadInitialData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-sentinel-border bg-sentinel-card/80 py-4 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-400">LandSlide Sentinel</span>
            <span>•</span>
            <span>AI-Driven Geological Early Warning System</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] font-mono">
            <span>FastAPI + WebSockets</span>
            <span>•</span>
            <span>Scikit-Learn Gradient Boosting</span>
            <span>•</span>
            <span>SQLite WAL</span>
            <span>•</span>
            <span>React & Leaflet</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
