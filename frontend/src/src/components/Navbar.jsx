import React from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Map, 
  LineChart, 
  Bell, 
  Settings, 
  Volume2, 
  VolumeX, 
  Play, 
  Radio,
  Mountain
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  wsConnected, 
  activeAlertCount, 
  criticalCount,
  isMuted, 
  setIsMuted,
  onLaunchDemo,
  demoRunning,
  activeScenarios
}) {
  const scenarioKeys = Object.keys(activeScenarios || {});
  const hasActiveScenario = scenarioKeys.length > 0;

  return (
    <header className="bg-sentinel-card border-b border-sentinel-border sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Mountain className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-wider text-white">LANDSLIDE</span>
                <span className="font-black text-lg tracking-wider text-blue-400">SENTINEL</span>
                <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs px-2 py-0.5 rounded-full font-mono">
                  AI-EWS
                </span>
              </div>
              <p className="text-xs text-gray-400 hidden sm:block">IoT Sensor Early Warning & Geotechnical Risk Prediction</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'map'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Map className="h-4 w-4" />
              <span>GIS Map</span>
            </button>

            <button
              onClick={() => setActiveTab('charts')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'charts'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <LineChart className="h-4 w-4" />
              <span>Telemetry</span>
            </button>

            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium relative transition-colors ${
                activeTab === 'alerts'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Bell className="h-4 w-4" />
              <span>Alerts</span>
              {activeAlertCount > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse ${
                  criticalCount > 0 ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'
                }`}>
                  {activeAlertCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'admin'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Admin & ML</span>
            </button>
          </nav>

          {/* Quick Actions & Live Indicator */}
          <div className="flex items-center space-x-3">
            
            {/* Quick Demo Button */}
            <button
              onClick={onLaunchDemo}
              disabled={demoRunning}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-all ${
                demoRunning
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse cursor-wait'
                  : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-red-500/20'
              }`}
              title="Runs a 3-minute escalating disaster demo on Station 3 (Safe -> Critical)"
            >
              <Play className={`h-3.5 w-3.5 ${demoRunning ? 'animate-spin' : 'fill-white'}`} />
              <span>{demoRunning ? 'Demo Escalating...' : 'Demo Escalation'}</span>
            </button>

            {/* Audio Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
              title={isMuted ? 'Unmute Emergency Alarms' : 'Mute Emergency Alarms'}
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
            </button>

            {/* WebSocket Connection Status */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 bg-gray-900 border border-gray-800 rounded-full text-xs">
              <span className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-gray-400 font-mono text-[11px]">
                {wsConnected ? 'LIVE FEED' : 'RECONNECTING'}
              </span>
            </div>

          </div>

        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden justify-around py-2 border-t border-gray-800 text-xs">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`flex flex-col items-center py-1 ${activeTab === 'dashboard' ? 'text-blue-400' : 'text-gray-400'}`}>
            <Activity className="h-4 w-4" />
            <span>Overview</span>
          </button>
          <button 
            onClick={() => setActiveTab('map')} 
            className={`flex flex-col items-center py-1 ${activeTab === 'map' ? 'text-blue-400' : 'text-gray-400'}`}>
            <Map className="h-4 w-4" />
            <span>Map</span>
          </button>
          <button 
            onClick={() => setActiveTab('charts')} 
            className={`flex flex-col items-center py-1 ${activeTab === 'charts' ? 'text-blue-400' : 'text-gray-400'}`}>
            <LineChart className="h-4 w-4" />
            <span>Trends</span>
          </button>
          <button 
            onClick={() => setActiveTab('alerts')} 
            className={`flex flex-col items-center py-1 relative ${activeTab === 'alerts' ? 'text-blue-400' : 'text-gray-400'}`}>
            <Bell className="h-4 w-4" />
            <span>Alerts</span>
            {activeAlertCount > 0 && (
              <span className="absolute top-0 right-3 h-2 w-2 bg-red-500 rounded-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('admin')} 
            className={`flex flex-col items-center py-1 ${activeTab === 'admin' ? 'text-blue-400' : 'text-gray-400'}`}>
            <Settings className="h-4 w-4" />
            <span>Admin</span>
          </button>
        </div>

      </div>
    </header>
  );
}
