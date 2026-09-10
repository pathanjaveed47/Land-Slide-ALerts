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
  Mountain,
  Users,
  ShieldCheck,
  AlertOctagon,
  Sparkles
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  wsConnected, 
  activeAlertCount, 
  criticalCount,
  pendingSosCount,
  isMuted, 
  setIsMuted,
  onLaunchDemo,
  demoRunning,
  isAuthority,
  onToggleAuthority,
  onOpenSOSModal,
  onOpenEvacModal
}) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Mountain className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base sm:text-lg tracking-wider text-white">GEOSENTINEL</span>
                <span className="font-black text-base sm:text-lg tracking-wider text-amber-400">AI</span>
                <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                  UNIFIED EWS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">IoT Sensor Simulation · Geotechnical Physics (FS) · Crowdsource NLP</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'map'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Map className="h-4 w-4" />
              <span>GIS & Danger Zones</span>
            </button>

            <button
              onClick={() => setActiveTab('charts')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'charts'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LineChart className="h-4 w-4" />
              <span>Telemetry & FS</span>
            </button>

            <button
              onClick={() => setActiveTab('sos')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold relative transition-colors ${
                activeTab === 'sos'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Citizen SOS</span>
              {pendingSosCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 animate-pulse">
                  {pendingSosCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold relative transition-colors ${
                activeTab === 'alerts'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Bell className="h-4 w-4" />
              <span>Alerts</span>
              {activeAlertCount > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse ${
                  criticalCount > 0 ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'
                }`}>
                  {activeAlertCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'admin'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Admin & ML</span>
            </button>
          </nav>

          {/* Quick Actions & Role Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Authority Role Toggle */}
            <button
              onClick={onToggleAuthority}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                isAuthority 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/20' 
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Toggle Disaster Response Authority vs Public Observer Mode"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${isAuthority ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className="hidden lg:inline">{isAuthority ? 'Authority Mode' : 'Observer Mode'}</span>
            </button>

            {/* Mass Evacuation Trigger (Authority Mode Only) */}
            {isAuthority && (
              <button
                onClick={onOpenEvacModal}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/30 transition-all animate-pulse"
                title="Trigger Mass Evacuation Order"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Evacuate</span>
              </button>
            )}

            {/* Submit SOS button */}
            <button
              onClick={onOpenSOSModal}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition-all"
              title="Submit Citizen Hazard Observation"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              <span className="hidden sm:inline">SOS Report</span>
            </button>

            {/* Demo Escalation */}
            <button
              onClick={onLaunchDemo}
              disabled={demoRunning}
              className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl shadow-sm transition-all ${
                demoRunning
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse cursor-wait'
                  : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-red-500/20'
              }`}
              title="Runs a 3-minute escalating disaster demo on Station 3 (Safe -> Critical)"
            >
              <Play className={`h-3 w-3 ${demoRunning ? 'animate-spin' : 'fill-white'}`} />
              <span>{demoRunning ? 'Escalating...' : 'Demo'}</span>
            </button>

            {/* Audio Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title={isMuted ? 'Unmute Emergency Alarms' : 'Mute Emergency Alarms'}
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
            </button>

            {/* WebSocket Connection Status */}
            <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-full text-xs">
              <span className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-slate-400 font-mono text-[11px]">
                {wsConnected ? 'LIVE FEED' : 'OFFLINE'}
              </span>
            </div>

          </div>

        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden justify-around py-2 border-t border-slate-800 text-xs">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`flex flex-col items-center py-1 ${activeTab === 'dashboard' ? 'text-blue-400' : 'text-slate-400'}`}>
            <Activity className="h-4 w-4" />
            <span>Overview</span>
          </button>
          <button 
            onClick={() => setActiveTab('map')} 
            className={`flex flex-col items-center py-1 ${activeTab === 'map' ? 'text-blue-400' : 'text-slate-400'}`}>
            <Map className="h-4 w-4" />
            <span>Map</span>
          </button>
          <button 
            onClick={() => setActiveTab('charts')} 
            className={`flex flex-col items-center py-1 ${activeTab === 'charts' ? 'text-blue-400' : 'text-slate-400'}`}>
            <LineChart className="h-4 w-4" />
            <span>Trends</span>
          </button>
          <button 
            onClick={() => setActiveTab('sos')} 
            className={`flex flex-col items-center py-1 ${activeTab === 'sos' ? 'text-blue-400' : 'text-slate-400'}`}>
            <Users className="h-4 w-4" />
            <span>SOS</span>
          </button>
          <button 
            onClick={() => setActiveTab('alerts')} 
            className={`flex flex-col items-center py-1 relative ${activeTab === 'alerts' ? 'text-blue-400' : 'text-slate-400'}`}>
            <Bell className="h-4 w-4" />
            <span>Alerts</span>
          </button>
          <button 
            onClick={() => setActiveTab('admin')} 
            className={`flex flex-col items-center py-1 ${activeTab === 'admin' ? 'text-blue-400' : 'text-slate-400'}`}>
            <Settings className="h-4 w-4" />
            <span>Admin</span>
          </button>
        </div>

      </div>
    </header>
  );
}
