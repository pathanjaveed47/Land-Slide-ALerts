import React, { useState } from 'react';
import { 
  ShieldAlert, CheckCircle2, XCircle, Clock, MapPin, 
  User, RefreshCw, AlertTriangle, Filter, Sparkles 
} from 'lucide-react';
import { verifySOSReport } from '../services/api';

export default function SOSReportFeed({ 
  reports, 
  isAuthority, 
  onRefresh, 
  onOpenSubmitModal 
}) {
  const [filter, setFilter] = useState('ALL');
  const [verifyingId, setVerifyingId] = useState(null);

  const handleVerify = async (reportId, status) => {
    setVerifyingId(reportId);
    try {
      await verifySOSReport(reportId, status);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Error updating report: ${err.message}`);
    } finally {
      setVerifyingId(null);
    }
  };

  const filteredReports = reports.filter(r => {
    if (filter === 'ALL') return true;
    if (filter === 'VERIFIED') return r.verification_status === 'VERIFIED';
    if (filter === 'PENDING') return r.verification_status === 'PENDING';
    if (filter === 'REJECTED') return r.verification_status === 'REJECTED';
    return true;
  });

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'HYDROLOGICAL_ANOMALY':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">💧 Hydrological Anomaly</span>;
      case 'SLOPE_DEFORMATION':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">📐 Slope Deformation</span>;
      case 'ACTIVE_MASS_MOVEMENT':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">⚠️ Active Mass Movement</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-700 text-slate-300">{cat}</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Verified
          </span>
        );
      case 'PENDING':
        return (
          <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </span>
        );
      case 'REJECTED':
        return (
          <span className="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
            <XCircle className="w-3.5 h-3.5" /> Discarded
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">
              Crowdsourced Citizen SOS & Precursor Feed
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
              Hugging Face Flan-T5 + USGS Criteria
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Unstructured ground anomaly observations submitted by citizens and local observers, filtered for authentic morphological indicators.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenSubmitModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-amber-500/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Submit Field Observation
          </button>
          <button
            onClick={onRefresh}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors"
            title="Refresh Feed"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-2">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </span>
        {['ALL', 'PENDING', 'VERIFIED', 'REJECTED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === f
                ? 'bg-slate-700 text-white shadow-md font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {f} {f === 'ALL' ? `(${reports.length})` : `(${reports.filter(r => r.verification_status === f).length})`}
          </button>
        ))}
      </div>

      {/* Reports Feed */}
      {filteredReports.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
          <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">No citizen SOS reports matching the active filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((report) => (
            <div
              key={report.id || report.report_uuid}
              className={`p-5 bg-slate-900/90 border rounded-2xl shadow-lg transition-all space-y-3 relative overflow-hidden ${
                report.verification_status === 'VERIFIED'
                  ? 'border-emerald-500/40 shadow-emerald-500/5'
                  : report.verification_status === 'PENDING'
                  ? 'border-amber-500/30'
                  : 'border-slate-800 opacity-70'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-slate-800 text-slate-300 rounded-lg">
                    <User className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-200 block font-mono">
                      {report.reporter_id}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(report.timestamp).toLocaleTimeString()} · {new Date(report.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {getStatusBadge(report.verification_status)}
              </div>

              {/* Message Text */}
              <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 font-sans">
                "{report.text}"
              </p>

              {/* Category & Confidence */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  {getCategoryBadge(report.detected_category)}
                  <span className="text-[11px] text-slate-400">
                    Confidence: <strong className="text-slate-200">{(report.confidence * 100).toFixed(0)}%</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  {report.latitude.toFixed(4)}°N, {report.longitude.toFixed(4)}°E
                </div>
              </div>

              {/* Authority Actions */}
              {isAuthority && report.verification_status === 'PENDING' && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <button
                    disabled={verifyingId === report.id}
                    onClick={() => handleVerify(report.id, 'VERIFIED')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verify & Escalate Alert
                  </button>
                  <button
                    disabled={verifyingId === report.id}
                    onClick={() => handleVerify(report.id, 'REJECTED')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Dismiss / Spam
                  </button>
                </div>
              )}

              {report.reviewed_by && (
                <div className="text-[10px] text-slate-500 pt-1">
                  Reviewed by: <span className="font-mono text-slate-400">{report.reviewed_by}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
