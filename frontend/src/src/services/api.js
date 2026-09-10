const API_BASE = '/api';

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
  const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
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

export async function fetchModelMetrics() {
  const res = await fetch(`${API_BASE}/model/metrics`);
  if (!res.ok) throw new Error('Failed to fetch model metrics');
  return res.json();
}

export async function retrainModel() {
  const res = await fetch(`${API_BASE}/model/train`, { method: 'POST' });
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

export async function triggerSimulationScenario(scenario_type, station_id = null, duration_seconds = 180, intensity = 1.0) {
  const res = await fetch(`${API_BASE}/simulation/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario_type, station_id, duration_seconds, intensity })
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
