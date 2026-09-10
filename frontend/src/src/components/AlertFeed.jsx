import React, { useState } from 'react';
import { 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Mail, 
  MessageSquare, 
  ShieldCheck, 
  Send, 
  ExternalLink,
  Info,
  Radio
} from 'lucide-react';

export default function AlertFeed({ 
  alerts, 
  notifications, 
  onAcknowledge, 
  onResolve, 
  onSelectStation 
}) {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [viewTab, setViewTab] = useState('alerts'); // 'alerts' or 'dispatches'

  const filteredAlerts = alerts.filter(a => {
    if (filterStatus === 'ALL') return true;
    return a.status === filterStatus;
  });

  const activeCount = alerts.filter(a => a.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">

      {/* Header & Sub-tabs */}
      <div className="bg-sentinel-card border border-sentinel-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <AlertOctagon className="h-5 w-5 text-red-500" />
            <span>Hazard Alert Feed & Emergency Dispatch</span>
          </h3>
          <p className="text-xs text-gray-400">
            Real-time tiered warnings, geotechnical factor breakdowns, and simulated multi-channel dispatch
          </p>
        </div>

        {/* View switcher & status filters */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Main Subtabs */}
          <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800 text-xs">
            <button
              onClick={() => setViewTab('alerts')}
              className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition-colors ${
                viewTab === 'alerts' ? 'bg-blue-600 text-white font-medium' : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>Incident Alerts</span>
              {activeCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {activeCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setViewTab('dispatches')}
              className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition-colors ${
                viewTab === 'dispatches' ? 'bg-blue-600 text-white font-medium' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              <span>SMS / Email Dispatch Log ({notifications.length})</span>
            </button>
          </div>

          {/* Status filters (only for alerts view) */}
          {viewTab === 'alerts' && (
            <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800 text-xs">
              {['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'].map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    filterStatus === st ? 'bg-gray-800 text-white font-medium' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* VIEW 1: INCIDENT ALERTS LIST */}
      {viewTab === 'alerts' && (
        <div className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="bg-sentinel-card border border-sentinel-border rounded-xl p-12 text-center">
              <ShieldCheck className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white">No Alerts Matching Filter</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                No active or unhandled geotechnical hazards in this category. Slopes are operating within nominal thresholds.
              </p>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const isCritical = alert.risk_level === 'Critical';
              const isResolved = alert.status === 'RESOLVED';
              const isAcknowledged = alert.status === 'ACKNOWLEDGED';

              return (
                <div
                  key={alert.id}
                  className={`rounded-xl border p-5 transition-all shadow-md ${
                    isResolved
                      ? 'bg-gray-900/60 border-gray-800 opacity-75'
                      : isCritical
                      ? 'bg-red-950/25 border-red-500/80 shadow-red-500/10'
                      : 'bg-orange-950/20 border-orange-500/60'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    
                    {/* Left details */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Risk Level Badge */}
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center space-x-1 ${
                          isCritical ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-500 text-black'
                        }`}>
                          {isCritical ? <AlertOctagon className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                          <span>{alert.risk_level}</span>
                        </span>

                        {/* Station Tag */}
                        <button
                          onClick={() => onSelectStation(alert.station_id)}
                          className="font-mono text-xs px-2.5 py-0.5 rounded bg-gray-800 text-blue-400 border border-gray-700 hover:bg-gray-700 transition-colors flex items-center space-x-1"
                        >
                          <span>{alert.station_code || 'STN'} • {alert.station_name}</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>

                        {/* Timestamp */}
                        <span className="text-xs text-gray-400 flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(alert.timestamp).toLocaleString()}</span>
                        </span>

                        {/* Status Badge */}
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase ${
                          isResolved ? 'bg-gray-800 text-emerald-400 border border-emerald-500/30' :
                          isAcknowledged ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}>
                          {alert.status}
                        </span>
                      </div>

                      {/* Alert Message */}
                      <h4 className="text-base font-bold text-white">
                        {alert.message}
                      </h4>

                      {/* Contributing Factors Breakdown */}
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                          Geotechnical Triggers Detected:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(alert.contributing_factors || []).map((factor, fIdx) => (
                            <span 
                              key={fIdx}
                              className="text-xs px-2.5 py-1 rounded-md bg-gray-800/90 text-gray-200 border border-gray-700/80 font-mono"
                            >
                              • {factor}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Protocol Action */}
                      <div className="p-3 bg-gray-950/70 rounded-lg border border-gray-800 text-xs">
                        <span className="font-semibold text-amber-400 block mb-0.5 uppercase tracking-wider text-[10px]">
                          Emergency Protocol Action Required:
                        </span>
                        <p className="text-gray-200 leading-relaxed">
                          {alert.suggested_action}
                        </p>
                      </div>

                      {/* Notifications Dispatched summary */}
                      {alert.notifications && alert.notifications.length > 0 && (
                        <div className="text-xs text-gray-400 flex items-center space-x-3 pt-1">
                          <span className="text-[11px] font-semibold text-gray-400">Automated Dispatch:</span>
                          <span className="flex items-center space-x-1 text-blue-400">
                            <MessageSquare className="h-3 w-3" />
                            <span>SMS Sent</span>
                          </span>
                          <span className="flex items-center space-x-1 text-purple-400">
                            <Mail className="h-3 w-3" />
                            <span>Email Dispatched</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right Action Buttons */}
                    {!isResolved && (
                      <div className="flex md:flex-col items-center gap-2 justify-end min-w-[140px]">
                        {!isAcknowledged && (
                          <button
                            onClick={() => onAcknowledge(alert.id)}
                            className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>Acknowledge</span>
                          </button>
                        )}
                        <button
                          onClick={() => onResolve(alert.id)}
                          className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Mark Resolved</span>
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: SMS / EMAIL DISPATCH LOG */}
      {viewTab === 'dispatches' && (
        <div className="space-y-4">
          
          {/* Dispatch Info Banner */}
          <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-4 flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-gray-300 leading-relaxed">
              <span className="font-bold text-white block mb-0.5">Automated Dispatch Architecture</span>
              Emergency SMS and Email notifications are triggered automatically whenever an active monitoring station crosses into <strong>Warning</strong> or <strong>Critical</strong> thresholds. In this environment, messages are formatted, logged to the console and database, and can be instantaneously routed to Twilio SMS and SendGrid Email APIs via backend dispatch hooks in <code className="text-blue-300 font-mono">backend/app/alerts.py</code>.
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="bg-sentinel-card border border-sentinel-border rounded-xl p-12 text-center text-gray-400 text-xs">
              No notifications dispatched yet. Trigger an escalating demo or scenario to see simulated SMS/Email dispatches.
            </div>
          ) : (
            <div className="bg-sentinel-card border border-sentinel-border rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-gray-900 border-b border-gray-800 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Channel</th>
                      <th className="px-4 py-3">Recipient</th>
                      <th className="px-4 py-3">Dispatched Payload</th>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Delivery Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/80 font-mono text-[11px]">
                    {notifications.map(n => (
                      <tr key={n.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded font-bold uppercase flex items-center space-x-1 w-max ${
                            n.channel === 'SMS' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          }`}>
                            {n.channel === 'SMS' ? <MessageSquare className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                            <span>{n.channel}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white font-medium">
                          {n.recipient}
                        </td>
                        <td className="px-4 py-3 text-gray-300 font-sans max-w-md">
                          <p className="line-clamp-2">{n.message}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {new Date(n.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold uppercase text-[10px]">
                            {n.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
