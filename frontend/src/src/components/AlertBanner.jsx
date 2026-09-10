import React from 'react';
import { AlertOctagon, AlertTriangle, ArrowRight, X } from 'lucide-react';

export default function AlertBanner({ activeAlerts, onSelectStation, onNavigateAlerts }) {
  if (!activeAlerts || activeAlerts.length === 0) return null;

  // Highest severity alert
  const criticalAlert = activeAlerts.find(a => a.risk_level === 'Critical');
  const primaryAlert = criticalAlert || activeAlerts[0];
  const isCritical = primaryAlert.risk_level === 'Critical';

  return (
    <div className={`w-full py-2.5 px-4 text-xs font-medium transition-all duration-300 flex items-center justify-between ${
      isCritical 
        ? 'bg-red-600 text-white shadow-lg shadow-red-950/80 animate-pulse-fast' 
        : 'bg-orange-600 text-white shadow-md'
    }`}>
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          {isCritical ? (
            <AlertOctagon className="h-4 w-4 shrink-0 animate-bounce" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span className="font-bold uppercase tracking-wider text-[11px] bg-black/20 px-2 py-0.5 rounded">
            {primaryAlert.risk_level} ALERT
          </span>
          <span className="hidden sm:inline font-semibold">
            {primaryAlert.station_name || 'Station'}: {primaryAlert.message}
          </span>
          <span className="hidden md:inline text-white/90">
            • Risk Score: {primaryAlert.risk_score?.toFixed(1)}/100
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigateAlerts()}
            className="bg-black/30 hover:bg-black/40 text-white px-2.5 py-1 rounded font-semibold text-[11px] flex items-center space-x-1 transition-colors"
          >
            <span>Emergency Action Protocol</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
