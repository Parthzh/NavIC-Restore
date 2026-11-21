import chamoliData from '../data/chamoli_uttarakhand.json';
import godavariData from '../data/godavari_floodplain.json';
import {
  DEFAULT_SATELLITES,
  computeDopGrid,
  optimizeBeaconOnDryGround,
  generate24hTimeseries
} from './standaloneEngine';

const LOCAL_SCENARIOS = {
  chamoli_uttarakhand: chamoliData,
  godavari_floodplain: godavariData
};

export async function fetchScenarios() {
  try {
    const res = await fetch('/api/scenarios', { signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      const data = await res.json();
      return { data, isBackend: true };
    }
  } catch (e) {
    // Backend offline; use local scenarios
  }

  const list = Object.values(LOCAL_SCENARIOS).map(s => s.metadata);
  return { data: list, isBackend: false };
}

export async function fetchScenarioDetails(id) {
  try {
    const res = await fetch(`/api/scenarios/${id}`, { signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      const data = await res.json();
      return { data, isBackend: true };
    }
  } catch (e) {
    // fallback
  }

  return { data: LOCAL_SCENARIOS[id] || LOCAL_SCENARIOS.chamoli_uttarakhand, isBackend: false };
}

export async function fetchSatellites() {
  try {
    const res = await fetch('/api/satellites', { signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      const data = await res.json();
      return { data, isBackend: true };
    }
  } catch (e) {
    // fallback
  }

  return { data: DEFAULT_SATELLITES, isBackend: false };
}

export async function requestDopGrid(payload, scenarioData) {
  try {
    const res = await fetch('/api/dop-grid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1500)
    });
    if (res.ok) {
      const data = await res.json();
      return { data, isBackend: true };
    }
  } catch (e) {
    // fallback
  }

  // Standalone calculation
  const grid = computeDopGrid(
    scenarioData,
    payload.active_satellites_list || DEFAULT_SATELLITES,
    payload.mode,
    payload.beacon,
    payload.uere_m
  );
  return { data: grid, isBackend: false };
}

export async function requestOptimization(payload, scenarioData) {
  try {
    const res = await fetch('/api/optimize-beacon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1500)
    });
    if (res.ok) {
      const data = await res.json();
      return { data, isBackend: true };
    }
  } catch (e) {
    // fallback
  }

  const result = optimizeBeaconOnDryGround(
    scenarioData,
    payload.active_satellites_list || DEFAULT_SATELLITES,
    payload.uere_m
  );
  return { data: result, isBackend: false };
}

export async function requestTimeseries(payload, scenarioData) {
  try {
    const res = await fetch('/api/timeseries-24h', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1500)
    });
    if (res.ok) {
      const data = await res.json();
      return { data, isBackend: true };
    }
  } catch (e) {
    // fallback
  }

  const series = generate24hTimeseries(
    scenarioData,
    payload.point,
    payload.beacon,
    payload.uere_m
  );
  return { data: series, isBackend: false };
}
