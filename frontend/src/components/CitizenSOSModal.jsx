import React, { useState } from 'react';
import { AlertTriangle, Send, X, ShieldAlert, Sparkles, CheckCircle, Ban } from 'lucide-react';
import { submitSOSReport } from '../services/api';

const TEMPLATES = [
  {
    label: "Tension Cracks (Deformation)",
    text: "Fresh tension cracks widening behind the road retaining wall and hillside trees are visibly tilting.",
    lat: 30.5600,
    lon: 79.5700
  },
  {
    label: "Muddy Springs (Hydrology)",
    text: "Muddy dark brown springs suddenly bubbling from the toe of the slope near residential houses.",
    lat: 11.5580,
    lon: 76.1310
  },
  {
    label: "Falling Rocks (Mass Movement)",
    text: "Continuous rolling rocks and audible rumbling noises heard from the upper mountain spur.",
    lat: 30.1480,
    lon: 78.3650
  },
  {
    label: "Spam Noise (Test Filter)",
    text: "Special promotional discount 50% off crypto tokens visit http://scam-site.org today!",
    lat: 31.1050,
    lon: 77.1740
  }
];

export default function CitizenSOSModal({ isOpen, onClose, onReportSubmitted }) {
  const [reporterId, setReporterId] = useState('CITIZEN_REPORTER');
  const [text, setText] = useState('');
  const [lat, setLat] = useState('30.5562');
  const [lon, setLon] = useState('79.5667');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleApplyTemplate = (tpl) => {
    setText(tpl.text);
    setLat(tpl.lat.toString());
    setLon(tpl.lon.toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || text.length < 5) {
      setError("Please provide a detailed description (at least 5 characters).");
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await submitSOSReport({
        reporter_id: reporterId,
        text: text.trim(),
        latitude: parseFloat(lat),
        longitude: parseFloat(lon)
      });
      setResult(res);
      if (onReportSubmitted) onReportSubmitted(res);
    } catch (err) {
      setError(err.message || "Failed to submit citizen report");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setText('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Citizen SOS Report & NLP Validation
                <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  Flan-T5 Powered
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Submit field observations for instant AI morphological hazard parsing & spam filtering
              </p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Quick presets */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Quick Geotechnical Test Templates:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((tpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className="text-left p-2.5 bg-slate-800/60 hover:bg-slate-700/70 border border-slate-700 rounded-xl text-xs text-slate-300 hover:text-white transition-all"
                >
                  <span className="font-semibold text-amber-400 block">{tpl.label}</span>
                  <span className="text-slate-400 text-[11px] truncate block">{tpl.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Reporter Identifier / Call Sign
              </label>
              <input
                type="text"
                value={reporterId}
                onChange={(e) => setReporterId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                placeholder="e.g. WAYANAD_WARD_7"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Latitude (°N)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Longitude (°E)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Observed Slope Hazard Description (Unstructured Text)
              </label>
              <textarea
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Describe what you see: muddy springs, tension cracks, leaning poles, ground rumbling..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* AI Classification Feedback */}
            {result && (
              <div className={`p-4 rounded-xl border ${
                result.is_valid_hazard 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                  {result.is_valid_hazard ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <span>Authentic Geotechnical Hazard Verified!</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-5 h-5 text-rose-400" />
                      <span>Report Discarded as Spam / Non-Hazard</span>
                    </>
                  )}
                </div>
                <div className="text-xs space-y-1 mt-2 text-slate-300">
                  <p><strong className="text-white">Detected Category:</strong> <span className="font-mono text-amber-300">{result.detected_category}</span></p>
                  <p><strong className="text-white">AI Confidence:</strong> {(result.confidence * 100).toFixed(1)}%</p>
                  <p><strong className="text-white">System Status:</strong> {result.message}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { resetForm(); onClose(); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Analyzing with NLP...' : 'Submit Observation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
