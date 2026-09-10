import React, { useState } from 'react';
import { AlertOctagon, X, Siren, ShieldCheck, MapPin } from 'lucide-react';
import { triggerMassEvacuation } from '../services/api';

export default function EvacuationModal({ isOpen, onClose, stations, onEvacuationTriggered }) {
  const [selectedStationId, setSelectedStationId] = useState(stations[0]?.id || '');
  const [sectorName, setSectorName] = useState('Garhwal-Chamoli Mountain Sector');
  const [radiusKm, setRadiusKm] = useState('15.0');
  const [reason, setReason] = useState('Critical Limit-Equilibrium Shear Failure (FS < 1.0) & Severe Hydraulic Pore Water Surge detected.');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const currentStation = stations.find(s => s.id === parseInt(selectedStationId)) || stations[0];

  const handleStationChange = (stnId) => {
    setSelectedStationId(stnId);
    const stn = stations.find(s => s.id === parseInt(stnId));
    if (stn) {
      setSectorName(`${stn.region} - ${stn.name}`);
    }
  };

  const handleTrigger = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        station_id: currentStation?.id,
        sector_name: sectorName,
        latitude: currentStation?.latitude || 30.5562,
        longitude: currentStation?.longitude || 79.5667,
        radius_km: parseFloat(radiusKm),
        reason: reason,
        authorized_by: "NATIONAL_DISASTER_MANAGEMENT_AUTHORITY"
      };

      const res = await triggerMassEvacuation(payload);
      if (onEvacuationTriggered) onEvacuationTriggered(res);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to issue evacuation order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border-2 border-rose-600/80 rounded-2xl shadow-2xl shadow-rose-950/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-rose-950/70 border-b border-rose-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-600/30 text-rose-400 rounded-xl animate-pulse">
              <Siren className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-wide uppercase flex items-center gap-2">
                Trigger Sector Mass Evacuation
              </h3>
              <p className="text-xs text-rose-300">
                Disaster Response Authority Protocol: Level 3 Civil Defense Action
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-rose-400 hover:text-white rounded-lg hover:bg-rose-900/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleTrigger} className="p-6 space-y-5">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 leading-relaxed">
            <strong>Warning:</strong> Initiating a Mass Evacuation will project a live 8-vertex danger polygon over the GIS map, broadcast high-priority audio sirens across all connected screens, and dispatch automated civil defense logs.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Threat Station / Sector
            </label>
            <select
              value={selectedStationId}
              onChange={(e) => handleStationChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-rose-500"
            >
              {stations.map(stn => (
                <option key={stn.id} value={stn.id}>
                  {stn.name} ({stn.code}) — {stn.region} [FS: {stn.current_prediction?.factor_of_safety?.toFixed(2) || '1.80'}]
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Sector Name</label>
              <input
                type="text"
                value={sectorName}
                onChange={(e) => setSectorName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Danger Radius (km)</label>
              <input
                type="number"
                step="0.5"
                min="1.0"
                max="50.0"
                value={radiusKm}
                onChange={(e) => setRadiusKm(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Official Justification / Geotechnical Evidence
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-rose-500"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
            >
              <AlertOctagon className="w-4 h-4" />
              {submitting ? 'Broadcasting Protocol...' : 'CONFIRM & BROADCAST EVACUATION'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
