export const GLOBAL_HOST = (typeof window !== 'undefined' && window.location && window.location.origin)
  ? window.location.origin
  : 'http://127.0.0.1:8000';

export const API_BASE = `${GLOBAL_HOST}/api`;

// --- Stations ---
export async function fetchStations() {
  const res = await fetch(`${API_BASE}/stations`);
  if (!res.ok) throw new Error('Failed to fetch stations');
  return res.json();
}

export async function fetchStation(id) {
  const res = await fetch(`${API_BASE}/stations/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch station ${id}`);
  return res.json();
}

export async function fetchStationReadings(id, limit = 60) {
  const res = await fetch(`${API_BASE}/stations/${id}/readings?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch readings for station ${id}`);
  return res.json();
}

export async function updateStationThresholds(id, warning_threshold, critical_threshold) {
  const res = await fetch(`${API_BASE}/stations/${id}/thresholds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ warning_threshold, critical_threshold })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to update thresholds');
  }
  return res.json();
}

// --- Alerts ---
export async function fetchAlerts(status = null, risk_level = null, limit = 50) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (risk_level) params.append('risk_level', risk_level);
  params.append('limit', limit);

  const res = await fetch(`${API_BASE}/alerts?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function acknowledgeAlert(alertId) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/ack`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to acknowledge alert');
  return res.json();
}

export async function resolveAlert(alertId) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/resolve`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to resolve alert');
  return res.json();
}

export async function fetchNotificationLogs(limit = 50) {
  const res = await fetch(`${API_BASE}/alerts/notifications?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

// --- Crowdsourced Citizen SOS & NLP (SIH2) ---
export async function submitSOSReport(report) {
  const res = await fetch(`${API_BASE}/sos/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to submit SOS report');
  }
  return res.json();
}

export async function fetchSOSReports(status = null, validOnly = null, limit = 50) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (validOnly !== null) params.append('valid_only', validOnly);
  params.append('limit', limit);

  const res = await fetch(`${API_BASE}/sos/reports?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch SOS reports');
  return res.json();
}

export async function verifySOSReport(reportId, verification_status, reviewer = 'CIVIL_DEFENSE_AUTHORITY') {
  const res = await fetch(`${API_BASE}/sos/reports/${reportId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verification_status, reviewer })
  });
  if (!res.ok) throw new Error('Failed to verify SOS report');
  return res.json();
}

// --- Authority & Mass Evacuation Controls (SIH2) ---
export async function fetchAuthorityStatus() {
  const res = await fetch(`${API_BASE}/authority/status`);
  if (!res.ok) throw new Error('Failed to fetch authority status');
  return res.json();
}

export async function toggleAuthorityMode() {
  const res = await fetch(`${API_BASE}/authority/toggle-mode`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle authority mode');
  return res.json();
}

export async function triggerMassEvacuation(evacData) {
  const res = await fetch(`${API_BASE}/evacuation/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evacData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to trigger mass evacuation');
  }
  return res.json();
}

export async function fetchEvacuationOrders() {
  const res = await fetch(`${API_BASE}/evacuation/orders`);
  if (!res.ok) throw new Error('Failed to fetch evacuation orders');
  return res.json();
}

export async function cancelEvacuationOrder(orderId) {
  const res = await fetch(`${API_BASE}/evacuation/orders/${orderId}/cancel`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to cancel evacuation order');
  return res.json();
}

// --- Machine Learning & Physics ---
export async function fetchModelMetrics() {
  const res = await fetch(`${API_BASE}/model/metrics`);
  if (!res.ok) throw new Error('Failed to fetch model metrics');
  return res.json();
}

export async function retrainModel() {
  const res = await fetch(`${API_BASE}/model/retrain`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to initiate retraining');
  return res.json();
}

export async function predictAdHocRisk(features) {
  const res = await fetch(`${API_BASE}/model/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(features)
  });
  if (!res.ok) throw new Error('Prediction failed');
  return res.json();
}

// --- Simulation Controls ---
export async function triggerSimulationScenario(scenario, station_id = null, duration_seconds = 180) {
  const res = await fetch(`${API_BASE}/simulation/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario, station_id, duration_seconds })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to inject scenario');
  }
  return res.json();
}

export async function fetchSimulationStatus() {
  const res = await fetch(`${API_BASE}/simulation/status`);
  if (!res.ok) throw new Error('Failed to fetch simulation status');
  return res.json();
}
