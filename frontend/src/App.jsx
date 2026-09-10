import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import AlertBanner from './components/AlertBanner';
import Dashboard from './components/Dashboard';
import MapView from './components/MapView';
import SensorCharts from './components/SensorCharts';
import SOSReportFeed from './components/SOSReportFeed';
import CitizenSOSModal from './components/CitizenSOSModal';
import EvacuationModal from './components/EvacuationModal';
import AlertFeed from './components/AlertFeed';
import AdminPanel from './components/AdminPanel';

import { 
  fetchStations, 
  fetchAlerts, 
  fetchNotificationLogs, 
  acknowledgeAlert, 
  resolveAlert,
  triggerSimulationScenario,
  fetchSOSReports,
  fetchEvacuationOrders,
  fetchAuthorityStatus,
  toggleAuthorityMode
} from './services/api';
import { alertAudio } from './utils/audio';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stations, setStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState(3);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [sosReports, setSosReports] = useState([]);
  const [evacuationOrders, setEvacuationOrders] = useState([]);
  const [isAuthority, setIsAuthority] = useState(true);

  // Modals
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [isEvacModalOpen, setIsEvacModalOpen] = useState(false);

  // Live WebSocket state
  const [wsConnected, setWsConnected] = useState(false);
  const [latestTelemetryTick, setLatestTelemetryTick] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [activeScenarios, setActiveScenarios] = useState({});
  const [demoRunning, setDemoRunning] = useState(false);

  const wsRef = useRef(null);

  // Sync mute with audio
  useEffect(() => {
    alertAudio.setMuted(isMuted);
  }, [isMuted]);

  // Initial data load
  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      const [stns, alrts, notifs, sos, evacs, auth] = await Promise.all([
        fetchStations().catch(() => []),
        fetchAlerts().catch(() => []),
        fetchNotificationLogs().catch(() => []),
        fetchSOSReports().catch(() => []),
        fetchEvacuationOrders().catch(() => []),
        fetchAuthorityStatus().catch(() => ({ is_authority: true }))
      ]);
      setStations(stns);
      setAlerts(alrts);
      setNotifications(notifs);
      setSosReports(sos);
      setEvacuationOrders(evacs);
      setIsAuthority(auth.is_authority);
    } catch (e) {
      console.error('Failed to load initial data:', e);
    }
  }

  // WebSocket Connection
  useEffect(() => {
    let reconnectTimeout = null;
    let shouldReconnect = true;

    function connectWs() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/telemetry`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Unified Telemetry & Hazard WebSocket connected.');
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'telemetry_update' || data.type === 'telemetry_batch') {
            setLatestTelemetryTick(data);
            if (data.active_scenarios) setActiveScenarios(data.active_scenarios);

            if (data.stations && data.stations.length > 0) {
              setStations(prev => {
                const map = new Map(prev.map(s => [s.id, s]));
                data.stations.forEach(update => {
                  const sId = update.id || update.station_id;
                  const existing = map.get(sId);
                  if (existing) {
                    map.set(sId, {
                      ...existing,
                      current_reading: update.current_reading || update.reading || existing.current_reading,
                      current_prediction: update.current_prediction || update.prediction || existing.current_prediction,
                      hazard_polygon: update.hazard_polygon !== undefined ? update.hazard_polygon : existing.hazard_polygon
                    });
                  } else {
                    map.set(sId, update);
                  }
                });
                return Array.from(map.values());
              });

              // Play audio alert if any station in critical/warning
              const hasCritical = data.stations.some(s => 
                (s.current_prediction?.risk_level === 'Critical') || 
                (s.current_prediction?.factor_of_safety && s.current_prediction.factor_of_safety < 1.05)
              );
              if (hasCritical && !isMuted) {
                alertAudio.playCriticalAlarm();
              }
            }
          }

          // Real-time Citizen SOS report
          else if (data.type === 'citizen_sos_report') {
            setSosReports(prev => [data, ...prev]);
            if (data.is_valid_hazard && !isMuted) {
              alertAudio.playWarningChime();
            }
          }

          // Real-time SOS report status update
          else if (data.type === 'sos_status_updated') {
            setSosReports(prev => prev.map(r => 
              (r.id === data.report_id || r.report_uuid === data.report_uuid)
                ? { ...r, verification_status: data.verification_status, reviewed_by: data.reviewed_by }
                : r
            ));
          }

          // Real-time Mass Evacuation order
          else if (data.type === 'mass_evacuation_ordered') {
            setEvacuationOrders(prev => [data, ...prev]);
            alertAudio.playCriticalAlarm();
          }

          // Real-time Evacuation order cancelled
          else if (data.type === 'evacuation_order_cancelled') {
            setEvacuationOrders(prev => prev.filter(o => o.id !== data.order_id && o.order_uuid !== data.order_uuid));
          }

        } catch (e) {
          console.error('Error parsing WebSocket frame:', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (shouldReconnect) {
          reconnectTimeout = setTimeout(connectWs, 3000);
        }
      };

      ws.onerror = (e) => {
        console.warn('WebSocket connection error:', e);
        ws.close();
      };
    }

    connectWs();

    return () => {
      shouldReconnect = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, [isMuted]);

  // Periodic refresh for alerts & logs
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [alrts, notifs] = await Promise.all([
          fetchAlerts().catch(() => []),
          fetchNotificationLogs().catch(() => [])
        ]);
        setAlerts(alrts);
        setNotifications(notifs);
      } catch (e) {
        console.error('Background polling error:', e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleToggleAuthority = async () => {
    try {
      const res = await toggleAuthorityMode();
      setIsAuthority(res.is_authority);
    } catch (e) {
      console.error('Failed to toggle authority:', e);
    }
  };

  const handleLaunchDemo = async () => {
    if (demoRunning) return;
    setDemoRunning(true);
    try {
      await triggerSimulationScenario('escalating_demo', 3, 180);
      setSelectedStationId(3);
      // Wait 180s or user cancel
      setTimeout(() => setDemoRunning(false), 185000);
    } catch (e) {
      console.error('Failed to launch demo:', e);
      setDemoRunning(false);
    }
  };

  const handleInjectScenario = async (stationId, scenarioType) => {
    try {
      await triggerSimulationScenario(scenarioType, stationId, 180);
    } catch (e) {
      alert(`Error injecting scenario: ${e.message}`);
    }
  };

  const handleAcknowledgeAlert = async (id) => {
    try {
      await acknowledgeAlert(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a));
    } catch (e) {
      alert(`Error acknowledging: ${e.message}`);
    }
  };

  const handleResolveAlert = async (id) => {
    try {
      await resolveAlert(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'RESOLVED' } : a));
    } catch (e) {
      alert(`Error resolving: ${e.message}`);
    }
  };

  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE');
  const criticalCount = stations.filter(s => s.current_prediction?.risk_level === 'Critical' || (s.current_prediction?.factor_of_safety && s.current_prediction.factor_of_safety < 1.05)).length;
  const pendingSosCount = sosReports.filter(r => r.verification_status === 'PENDING').length;
  const selectedStation = stations.find(s => s.id === selectedStationId) || stations[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* Top Navigation Bar */}
      <Navbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        wsConnected={wsConnected}
        activeAlertCount={activeAlerts.length}
        criticalCount={criticalCount}
        pendingSosCount={pendingSosCount}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        onLaunchDemo={handleLaunchDemo}
        demoRunning={demoRunning}
        isAuthority={isAuthority}
        onToggleAuthority={handleToggleAuthority}
        onOpenSOSModal={() => setIsSOSModalOpen(true)}
        onOpenEvacModal={() => setIsEvacModalOpen(true)}
      />

      {/* Emergency Active Hazard Banner */}
      <AlertBanner 
        stations={stations}
        activeAlerts={activeAlerts}
        evacuationOrders={evacuationOrders}
        onViewStation={(stn) => {
          setSelectedStationId(stn.id);
          setActiveTab('map');
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Overview Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <Dashboard 
            stations={stations}
            alerts={activeAlerts}
            onSelectStation={(id) => {
              setSelectedStationId(id);
              setActiveTab('charts');
            }}
            onViewMap={(stn) => {
              setSelectedStationId(stn.id);
              setActiveTab('map');
            }}
            onInjectScenario={handleInjectScenario}
            onLaunchDemo={handleLaunchDemo}
            demoRunning={demoRunning}
          />
        )}

        {/* GIS Map & Danger Zones Tab */}
        {activeTab === 'map' && (
          <MapView 
            stations={stations}
            selectedStation={selectedStation}
            onSelectStation={(stn) => setSelectedStationId(stn.id)}
            onInspectCharts={(id) => {
              setSelectedStationId(id);
              setActiveTab('charts');
            }}
            sosReports={sosReports}
            evacuationOrders={evacuationOrders}
          />
        )}

        {/* Sensor Analytics & Telemetry Charts Tab */}
        {activeTab === 'charts' && (
          <SensorCharts 
            stations={stations}
            selectedStationId={selectedStationId}
            onSelectStationId={setSelectedStationId}
            latestTelemetryTick={latestTelemetryTick}
          />
        )}

        {/* Crowdsourced Citizen SOS & NLP Tab */}
        {activeTab === 'sos' && (
          <SOSReportFeed 
            reports={sosReports}
            isAuthority={isAuthority}
            onRefresh={loadInitialData}
            onOpenSubmitModal={() => setIsSOSModalOpen(true)}
          />
        )}

        {/* Incident Alerts & Notifications Tab */}
        {activeTab === 'alerts' && (
          <AlertFeed 
            alerts={alerts}
            notifications={notifications}
            onAcknowledge={handleAcknowledgeAlert}
            onResolve={handleResolveAlert}
            onRefresh={loadInitialData}
          />
        )}

        {/* Admin & ML Calibration Console Tab */}
        {activeTab === 'admin' && (
          <AdminPanel 
            stations={stations}
            onInjectScenario={handleInjectScenario}
            onRefreshStations={loadInitialData}
          />
        )}

      </main>

      {/* Citizen SOS Submission Dialog */}
      <CitizenSOSModal 
        isOpen={isSOSModalOpen}
        onClose={() => setIsSOSModalOpen(false)}
        onReportSubmitted={(newRep) => {
          setSosReports(prev => [newRep, ...prev]);
        }}
      />

      {/* Authority Mass Evacuation Dialog */}
      <EvacuationModal 
        isOpen={isEvacModalOpen}
        onClose={() => setIsEvacModalOpen(false)}
        stations={stations}
        onEvacuationTriggered={(newEvac) => {
          setEvacuationOrders(prev => [newEvac, ...prev]);
          setActiveTab('map');
        }}
      />

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>GeoSentinel AI & LandSlide Sentinel — Unified Landslide Early Warning System</span>
          <span>Integrated Limit-Equilibrium Physics · Multi-Horizon ML · Crowdsource NLP · Real-time WebSockets</span>
        </div>
      </footer>

    </div>
  );
}
