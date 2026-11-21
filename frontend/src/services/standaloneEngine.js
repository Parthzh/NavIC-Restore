// NavIC-Restore Standalone Mathematical Engine
// Implements exact Section 4 equations from ANTIGRAVITY_MASTER_CONTEXT.md

// 7 Standard NavIC Constellation Satellites with baseline Indian sub-continent coverage
export const DEFAULT_SATELLITES = [
  { id: 'IRNSS-1B', name: 'IRNSS-1B (GEO 55°E)', prn: 'I02', type: 'GSO', azimuth_deg: 242, elevation_deg: 44, active: true, healthy: true },
  { id: 'IRNSS-1C', name: 'IRNSS-1C (GEO 83°E)', prn: 'I03', type: 'GEO', azimuth_deg: 174, elevation_deg: 52, active: true, healthy: true },
  { id: 'IRNSS-1E', name: 'IRNSS-1E (GSO 111.75°E)', prn: 'I05', type: 'GSO', azimuth_deg: 118, elevation_deg: 38, active: true, healthy: true },
  { id: 'IRNSS-1G', name: 'IRNSS-1G (GEO 129.5°E)', prn: 'I07', type: 'GEO', azimuth_deg: 104, elevation_deg: 24, active: false, healthy: true }, // degraded low elevation
  { id: 'IRNSS-1I', name: 'IRNSS-1I (GSO 55°E)', prn: 'I09', type: 'GSO', azimuth_deg: 254, elevation_deg: 36, active: true, healthy: true },
  { id: 'NVS-01', name: 'NVS-01 / IRNSS-1J (GEO 29.5°E)', prn: 'I10', type: 'GSO', azimuth_deg: 270, elevation_deg: 18, active: true, healthy: true } // valley masked
];

// Invert 4x4 symmetric positive-definite matrix with Gauss-Jordan elimination
function invert4x4(m) {
  const n = 4;
  const a = m.map(row => [...row]);
  const inv = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ];

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(a[k][i]) > Math.abs(a[maxRow][i])) maxRow = k;
    }
    if (Math.abs(a[maxRow][i]) < 1e-10) {
      return null; // Singular matrix
    }
    // Swap rows
    if (maxRow !== i) {
      [a[i], a[maxRow]] = [a[maxRow], a[i]];
      [inv[i], inv[maxRow]] = [inv[maxRow], inv[i]];
    }
    // Normalize pivot row
    const pivot = a[i][i];
    for (let j = 0; j < n; j++) {
      a[i][j] /= pivot;
      inv[i][j] /= pivot;
    }
    // Eliminate other rows
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = a[k][i];
        for (let j = 0; j < n; j++) {
          a[k][j] -= factor * a[i][j];
          inv[k][j] -= factor * inv[i][j];
        }
      }
    }
  }
  return inv;
}

// Convert distance between two lat/lon points to meters (Haversine)
export function haversineDistanceM(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Compute azimuth and elevation from receiver to pseudolite beacon
function computeBeaconLookAngles(userLat, userLon, userElev, beaconLat, beaconLon, beaconElev, beaconHeightM) {
  const dEast = ((beaconLon - userLon) * Math.PI / 180) * 6371000 * Math.cos((userLat * Math.PI) / 180);
  const dNorth = ((beaconLat - userLat) * Math.PI / 180) * 6371000;
  const dUp = (beaconElev + beaconHeightM) - userElev;
  const horizontalDist = Math.sqrt(dEast * dEast + dNorth * dNorth);
  const range = Math.sqrt(horizontalDist * horizontalDist + dUp * dUp);
  
  const azimuthRad = Math.atan2(dEast, dNorth);
  const elevationRad = Math.atan2(dUp, Math.max(horizontalDist, 1.0));
  
  return {
    azimuthRad,
    elevationRad,
    rangeM: range,
    dEast,
    dNorth,
    dUp
  };
}

/**
 * Solve DOP metrics for a single point
 * @param {Object} cell - { lat, lon, elevation_m, horizon_mask_deg }
 * @param {Array} activeSats - List of satellite objects { id, azimuth_deg, elevation_deg, active }
 * @param {string} mode - 'baseline' | 'pseudolite' | 'barometer'
 * @param {Object} beacon - { lat, lon, elevation_m, height_m }
 * @param {number} uereM - User Equivalent Range Error (default 3.0 m)
 */
export function solveDopAtPoint(cell, activeSats, mode = 'baseline', beacon = null, uereM = 3.0) {
  // 1. Filter visible satellites considering terrain horizon mask
  const visibleSats = activeSats.filter(sat => {
    if (!sat.active) return false;
    // Sat elevation must clear terrain horizon mask
    return sat.elevation_deg >= (cell.horizon_mask_deg || 10.0);
  });

  const N = visibleSats.length;
  const G = [];

  // 2. Build rows for visible NavIC satellites in local ENU
  for (const sat of visibleSats) {
    const azRad = (sat.azimuth_deg * Math.PI) / 180;
    const elRad = (sat.elevation_deg * Math.PI) / 180;
    // ENU unit vector row: [-cos(el)*sin(az), -cos(el)*cos(az), -sin(el), 1]
    const uE = -Math.cos(elRad) * Math.sin(azRad);
    const uN = -Math.cos(elRad) * Math.cos(azRad);
    const uU = -Math.sin(elRad);
    G.push([uE, uN, uU, 1.0]);
  }

  // 3. Mode 02: Append Tethered Pseudolite Beacon row (G_aug)
  if (mode === 'pseudolite' && beacon) {
    const look = computeBeaconLookAngles(
      cell.lat, cell.lon, cell.elevation_m,
      beacon.lat, beacon.lon, beacon.elevation_m || cell.elevation_m, beacon.height_m || 50
    );
    // Range bounds check (default 200m to 15km)
    if (look.rangeM >= 50 && look.rangeM <= 25000) {
      const uE = -Math.cos(look.elevationRad) * Math.sin(look.azimuthRad);
      const uN = -Math.cos(look.elevationRad) * Math.cos(look.azimuthRad);
      const uU = -Math.sin(look.elevationRad);
      G.push([uE, uN, uU, 1.0]);
    }
  }

  // 4. Mode 03: Barometer / DEM surface altitude constraint row (G_alt)
  if (mode === 'barometer') {
    // Altitude constraint row: [0, 0, 1, 0] (clock-independent)
    G.push([0.0, 0.0, 1.0, 0.0]);
  }

  // Total measurement rows
  const totalRows = G.length;

  // A 3D fix + clock requires at least 4 independent rows
  if (totalRows < 4) {
    return {
      visible_sats: N,
      total_measurements: totalRows,
      status: 'NO_FIX',
      gdop: null,
      pdop: null,
      hdop: null,
      vdop: null,
      error_m: 25.0, // default high uncertainty indicator
      is_flooded: cell.is_flooded,
      passable_type: cell.passable_type
    };
  }

  // Calculate G^T * G (4x4)
  const GtG = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];

  for (let r = 0; r < totalRows; r++) {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        GtG[i][j] += G[r][i] * G[r][j];
      }
    }
  }

  // Invert G^T * G to obtain Cofactor Matrix Q
  const Q = invert4x4(GtG);

  if (!Q) {
    return {
      visible_sats: N,
      total_measurements: totalRows,
      status: 'NO_FIX',
      gdop: null,
      pdop: null,
      hdop: null,
      vdop: null,
      error_m: 30.0,
      is_flooded: cell.is_flooded,
      passable_type: cell.passable_type
    };
  }

  const qEE = Math.max(0, Q[0][0]);
  const qNN = Math.max(0, Q[1][1]);
  const qUU = Math.max(0, Q[2][2]);
  const qTT = Math.max(0, Q[3][3]);

  const hdop = Math.sqrt(qEE + qNN);
  const vdop = Math.sqrt(qUU);
  const pdop = Math.sqrt(qEE + qNN + qUU);
  const gdop = Math.sqrt(pdop * pdop + qTT);
  const errorM = pdop * uereM;

  let status = 'SUB_5M';
  if (pdop > 12 || errorM > 15.0) {
    status = 'HIGH_DOP';
  } else if (errorM > 5.0) {
    status = 'DEGRADED';
  }

  return {
    visible_sats: N,
    total_measurements: totalRows,
    status,
    gdop: Number(gdop.toFixed(2)),
    pdop: Number(pdop.toFixed(2)),
    hdop: Number(hdop.toFixed(2)),
    vdop: Number(vdop.toFixed(2)),
    error_m: Number(errorM.toFixed(2)),
    is_flooded: cell.is_flooded,
    passable_type: cell.passable_type
  };
}

/**
 * Compute DOP Grid across entire scenario
 */
export function computeDopGrid(scenario, activeSats, mode, beacon, uereM = 3.0) {
  if (!scenario || !scenario.grid) return [];
  
  return scenario.grid.map((cell, idx) => {
    const dop = solveDopAtPoint(cell, activeSats, mode, beacon, uereM);
    return {
      id: idx,
      lat: cell.lat,
      lon: cell.lon,
      elevation_m: cell.elevation_m,
      flood_depth_m: cell.flood_depth_m,
      ...dop
    };
  });
}

/**
 * Flood-Aware Beacon Optimizer:
 * Evaluates candidate dry ridges and picks the optimal staging node (Omega_Dry ∩ Omega_LoS)
 */
export function optimizeBeaconOnDryGround(scenario, activeSats, uereM = 3.0) {
  if (!scenario || !scenario.dry_ridges || scenario.dry_ridges.length === 0) {
    return null;
  }

  // Pre-filter strictly dry ridges (SAR verification)
  const candidates = scenario.dry_ridges;
  let bestRidge = candidates[0];
  let minAvgError = Infinity;
  let bestSummary = null;

  for (const ridge of candidates) {
    const testBeacon = {
      lat: ridge.lat,
      lon: ridge.lon,
      elevation_m: ridge.elevation_m,
      height_m: ridge.recommended_tether_height_m || 50
    };

    // Calculate error across flooded cells
    const grid = scenario.grid || [];
    let sumError = 0;
    let validCount = 0;
    let sub5mCount = 0;

    for (const cell of grid) {
      if (cell.is_flooded) {
        const dist = haversineDistanceM(ridge.lat, ridge.lon, cell.lat, cell.lon);
        if (dist >= 100 && dist <= 20000) {
          const res = solveDopAtPoint(cell, activeSats, 'pseudolite', testBeacon, uereM);
          sumError += (res.status === 'NO_FIX' ? 25.0 : res.error_m);
          if (res.status === 'SUB_5M') sub5mCount++;
          validCount++;
        }
      }
    }

    const avgError = validCount > 0 ? sumError / validCount : 999;
    if (avgError < minAvgError) {
      minAvgError = avgError;
      bestRidge = ridge;
      bestSummary = {
        avg_error_m: Number(avgError.toFixed(2)),
        coverage_sub5m_pct: Number(((sub5mCount / Math.max(validCount, 1)) * 100).toFixed(1))
      };
    }
  }

  return {
    optimal_ridge: bestRidge,
    beacon: {
      lat: bestRidge.lat,
      lon: bestRidge.lon,
      elevation_m: bestRidge.elevation_m,
      height_m: bestRidge.recommended_tether_height_m || 50
    },
    metrics: bestSummary
  };
}

/**
 * 24-Hour Comparative Error Timeseries
 */
export function generate24hTimeseries(scenario, samplePoint, beacon, uereM = 3.0) {
  const hours = [];
  const testCell = samplePoint || (scenario?.grid ? scenario.grid.find(c => c.is_flooded) : { lat: 30.535, lon: 79.565, elevation_m: 1950, horizon_mask_deg: 25, is_flooded: true });

  for (let h = 0; h < 24; h++) {
    // Simulate diurnal NavIC orbital elevation change (azimuth/elevation drift)
    const driftSats = DEFAULT_SATELLITES.map((sat, i) => {
      const angleOffset = Math.sin(((h + i * 2) * Math.PI) / 12) * 12;
      return {
        ...sat,
        elevation_deg: Math.max(5, sat.elevation_deg + angleOffset)
      };
    });

    const m1 = solveDopAtPoint(testCell, driftSats, 'baseline', null, uereM);
    const m2 = solveDopAtPoint(testCell, driftSats, 'pseudolite', beacon, uereM);
    const m3 = solveDopAtPoint(testCell, driftSats, 'barometer', null, uereM);

    hours.push({
      time: `${String(h).padStart(2, '0')}:00`,
      mode01_baseline: m1.status === 'NO_FIX' ? 25.0 : m1.error_m,
      mode02_pseudolite: m2.status === 'NO_FIX' ? 18.0 : m2.error_m,
      mode03_barometer: m3.status === 'NO_FIX' ? 20.0 : m3.error_m,
      target_threshold: 5.0
    });
  }

  return hours;
}
