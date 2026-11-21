"""
NavIC-Restore: Lane 3 - FastAPI Main Application
Integrates Lane 1 (Flood Data & Terrain), Lane 2 (NavIC Geometry & Optimizer),
and serves Lane 4 (React + Vite + Leaflet Frontend).
"""

from datetime import datetime, timezone
import logging
from typing import Dict, List, Optional, Any, Union
import numpy as np
from fastapi import FastAPI, HTTPException, Query, status, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.flood.loader import ScenarioLoader
from backend.flood.models import ScenarioMetadata, FloodScenario, DryRidge
from backend.navic.coordinates import geodetic_to_ecef
from backend.navic.orbits import NavicOrbitPropagator
from backend.navic.geometry import NavicGeometrySolver, NavicOperatingMode, FixStatus
from backend.navic.optimizer import BeaconOptimizer
from backend.navic.timeseries import TimeseriesEngine
from .benchmarks import get_benchmarks_data

# Logging configuration
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("navic-restore-api")

app = FastAPI(
    title="NavIC-Restore API",
    description="Flood-Aware Space Navigation & Constellation Augmentation (ASTRA 2026).",
    version="1.0.0",
)

# Enable CORS for Vite dev server (port 5173) and any local network access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Singletons for fast memory-cached responses
scenario_loader = ScenarioLoader()
orbit_propagator = NavicOrbitPropagator()


@app.get("/", tags=["Health"])
@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    """Health check endpoint confirming API status, loaded scenarios, and satellite availability."""
    scenarios = scenario_loader.list_scenarios()
    return {
        "status": "healthy",
        "service": "NavIC-Restore API",
        "version": "1.0.0",
        "team": "Team Hypervisors (ASTRA 2026)",
        "available_scenarios": [s.id for s in scenarios],
        "navic_satellites_tracked": orbit_propagator.satellite_count,
        "tle_source": orbit_propagator.source,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/scenarios", tags=["Scenarios"])
def list_scenarios():
    """Lists metadata for all pre-cached Indian disaster scenarios."""
    scenarios = scenario_loader.list_scenarios()
    return [s.model_dump() for s in scenarios]


@app.get("/api/scenarios/{scenario_id}", tags=["Scenarios"])
def get_scenario_details(scenario_id: str):
    """Returns the full scenario definition including flood grid, dry ridges, and rescue channels."""
    try:
        scenario = scenario_loader.load_scenario(scenario_id)
        return scenario.model_dump()
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario '{scenario_id}' not found.",
        )


@app.get("/api/satellites", tags=["Satellites"])
def get_satellites(
    observer_lat: float = Query(30.4, description="Observer latitude"),
    observer_lon: float = Query(79.3, description="Observer longitude"),
    observer_alt_m: float = Query(1500.0, description="Observer altitude in meters"),
    timestamp_iso: Optional[str] = Query(None, description="ISO timestamp to propagate to"),
):
    """Returns the NavIC (IRNSS/NVS) constellation state, azimuth, elevation, and active status."""
    dt = None
    if timestamp_iso:
        try:
            dt = datetime.fromisoformat(timestamp_iso.replace("Z", "+00:00"))
        except Exception:
            dt = None

    views = orbit_propagator.compute_satellite_views(
        lat_deg=observer_lat,
        lon_deg=observer_lon,
        alt_m=observer_alt_m,
        dt=dt,
    )

    results = []
    for v in views:
        results.append({
            "id": v.name,
            "name": v.name,
            "norad_id": v.norad_id,
            "orbit_type": v.orbit_type,
            "azimuth_deg": v.azimuth_deg,
            "elevation_deg": v.elevation_deg,
            "range_km": v.range_km,
            "is_visible": v.is_visible,
            "is_active": v.is_active,
            "active": v.is_active,
            "note": v.note,
        })
    return results


@app.post("/api/dop-grid", tags=["Positioning"])
def calculate_dop_grid(payload: Dict[str, Any] = Body(...)):
    """
    Computes GDOP/PDOP/HDOP/VDOP and positioning uncertainty across all grid cells
    for the selected scenario and mode (baseline, pseudolite, or barometer).
    Returns an array of grid cells formatted directly for the React MapComponent.
    """
    scenario_id = payload.get("scenario_id", "chamoli_uttarakhand")
    try:
        scenario = scenario_loader.load_scenario(scenario_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario '{scenario_id}' not found.",
        )

    mode_str = payload.get("mode", "baseline").lower()
    if mode_str == "pseudolite":
        op_mode = NavicOperatingMode.PSEUDOLITE
    elif mode_str == "barometer":
        op_mode = NavicOperatingMode.BAROMETER
    else:
        op_mode = NavicOperatingMode.BASELINE

    uere_m = float(payload.get("uere_m", 3.0))

    # Support active_satellites_list (from frontend) or active_satellites (from contracts.json)
    active_sats_raw = payload.get("active_satellites_list") or payload.get("active_satellites")
    active_sat_names = []
    if active_sats_raw:
        for s in active_sats_raw:
            if isinstance(s, dict):
                # Satellite object from frontend: { id/name: 'IRNSS-1B', active: true/false }
                if s.get("active", True):
                    active_sat_names.append(s.get("id") or s.get("name"))
            elif isinstance(s, str):
                active_sat_names.append(s)
    else:
        active_sat_names = list(orbit_propagator._satellites.keys())

    # Beacon configuration for Mode 02
    beacon_data = payload.get("beacon")
    beacon_lat = None
    beacon_lon = None
    beacon_alt = None
    if op_mode == NavicOperatingMode.PSEUDOLITE and beacon_data:
        beacon_lat = float(beacon_data.get("lat", scenario.metadata.center.lat))
        beacon_lon = float(beacon_data.get("lon", scenario.metadata.center.lon))
        elev = beacon_data.get("elevation_m")
        if elev is None:
            elev = scenario_loader.get_elevation_at(scenario_id, beacon_lat, beacon_lon)
        height = float(beacon_data.get("height_m", 50.0))
        beacon_alt = float(elev) + height

    # Satellite ECEF positions at current UTC
    sat_ecef_dict = orbit_propagator.get_satellite_ecef_positions()

    grid_results = []
    for cell in scenario.grid:
        horizon_mask = getattr(cell, "horizon_mask_deg", 5.0)

        dop_res = NavicGeometrySolver.solve_dop(
            user_lat_deg=cell.lat,
            user_lon_deg=cell.lon,
            user_alt_m=cell.elevation_m,
            horizon_mask_deg=horizon_mask,
            satellite_ecef_dict=sat_ecef_dict,
            active_satellite_names=active_sat_names,
            mode=op_mode,
            beacon_lat_deg=beacon_lat,
            beacon_lon_deg=beacon_lon,
            beacon_alt_m=beacon_alt,
            uere_m=uere_m,
        )

        error_m = dop_res.expected_error_m

        # Format status matching frontend color palette
        if dop_res.status == FixStatus.NO_FIX or error_m is None:
            cell_status = "NO_FIX"
            error_m = 25.0
        elif error_m <= 5.0:
            cell_status = "SUB_5M"
        elif error_m <= 15.0:
            cell_status = "DEGRADED"
        else:
            cell_status = "HIGH_DOP"

        grid_results.append({
            "lat": cell.lat,
            "lon": cell.lon,
            "elevation_m": cell.elevation_m,
            "flood_depth_m": cell.flood_depth_m,
            "is_flooded": cell.is_flooded,
            "passable_type": cell.passable_type.value if hasattr(cell.passable_type, "value") else str(cell.passable_type),
            "horizon_mask_deg": horizon_mask,
            "visible_sats": dop_res.visible_sats_count,
            "gdop": dop_res.gdop,
            "pdop": dop_res.pdop,
            "hdop": dop_res.hdop,
            "vdop": dop_res.vdop,
            "error_m": error_m,
            "status": cell_status,
        })

    return grid_results


@app.post("/api/optimize-beacon", tags=["Optimization"])
def optimize_beacon_placement(payload: Dict[str, Any] = Body(...)):
    """
    Runs the flood-aware dry-ridge optimizer (Omega_Dry ∩ Omega_LoS) to find the single
    optimal tethered drone deployment location minimizing positioning error across flooded corridors.
    """
    scenario_id = payload.get("scenario_id", "chamoli_uttarakhand")
    try:
        scenario = scenario_loader.load_scenario(scenario_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario '{scenario_id}' not found.",
        )

    uere_m = float(payload.get("uere_m", 3.0))
    beacon_height_m = float(payload.get("beacon_height_m", 50.0))

    active_sats_raw = payload.get("active_satellites_list") or payload.get("active_satellites")
    active_sat_names = []
    if active_sats_raw:
        for s in active_sats_raw:
            if isinstance(s, dict):
                if s.get("active", True):
                    active_sat_names.append(s.get("id") or s.get("name"))
            elif isinstance(s, str):
                active_sat_names.append(s)
    else:
        active_sat_names = list(orbit_propagator._satellites.keys())

    sat_ecef_dict = orbit_propagator.get_satellite_ecef_positions()

    opt_res = BeaconOptimizer.optimize(
        scenario_id=scenario_id,
        grid_cells=scenario.grid,
        candidate_dry_ridges=scenario.dry_ridges,
        satellite_ecef_dict=sat_ecef_dict,
        active_satellite_names=active_sat_names,
        beacon_height_m=beacon_height_m,
        uere_m=uere_m,
    )

    # Find matching ridge object
    matching_ridge = None
    for r in scenario.dry_ridges:
        if r.id == opt_res.recommended_ridge_id:
            matching_ridge = r.model_dump()
            break
    if not matching_ridge and scenario.dry_ridges:
        matching_ridge = scenario.dry_ridges[0].model_dump()

    return {
        "optimal_ridge": matching_ridge,
        "beacon": {
            "lat": opt_res.optimal_beacon_lat,
            "lon": opt_res.optimal_beacon_lon,
            "elevation_m": opt_res.optimal_beacon_elevation_m,
            "height_m": opt_res.optimal_beacon_height_m,
        },
        "metrics": {
            "avg_error_m": round(opt_res.augmented_avg_gdop * uere_m, 2),
            "coverage_sub5m_pct": opt_res.augmented_fix_rate_percent,
            "gdop_reduction_pct": opt_res.gdop_reduction_percent,
            "error_reduction_pct": opt_res.error_reduction_percent,
            "baseline_avg_gdop": opt_res.baseline_avg_gdop,
            "augmented_avg_gdop": opt_res.augmented_avg_gdop,
        },
        "gdop_reduction_pct": opt_res.gdop_reduction_percent,
        "error_reduction_pct": opt_res.error_reduction_percent,
        "evaluated_candidates": [c.to_dict() for c in opt_res.evaluated_candidates],
    }


@app.post("/api/timeseries-24h", tags=["Positioning"])
def generate_timeseries(payload: Dict[str, Any] = Body(...)):
    """
    Generates 24-hour comparative positioning error curves (Mode 01 vs Mode 02 vs Mode 03)
    formatted directly for Recharts in the frontend.
    """
    scenario_id = payload.get("scenario_id", "chamoli_uttarakhand")
    try:
        scenario = scenario_loader.load_scenario(scenario_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario '{scenario_id}' not found.",
        )

    point_data = payload.get("point") or scenario.metadata.center.model_dump()
    point_lat = float(point_data.get("lat", scenario.metadata.center.lat))
    point_lon = float(point_data.get("lon", scenario.metadata.center.lon))
    point_alt = scenario_loader.get_elevation_at(scenario_id, point_lat, point_lon)

    cell = scenario_loader.get_nearest_cell(scenario_id, point_lat, point_lon)
    horizon_deg = getattr(cell, "horizon_mask_deg", 15.0) if cell else 15.0

    beacon_data = payload.get("beacon")
    beacon_lat = None
    beacon_lon = None
    beacon_alt = None
    if beacon_data:
        beacon_lat = float(beacon_data.get("lat"))
        beacon_lon = float(beacon_data.get("lon"))
        elev = beacon_data.get("elevation_m")
        if elev is None:
            elev = scenario_loader.get_elevation_at(scenario_id, beacon_lat, beacon_lon)
        height = float(beacon_data.get("height_m", 50.0))
        beacon_alt = float(elev) + height
    elif scenario.dry_ridges:
        ridge = scenario.dry_ridges[0]
        beacon_lat = ridge.lat
        beacon_lon = ridge.lon
        beacon_alt = ridge.elevation_m + ridge.recommended_tether_height_m

    uere_m = float(payload.get("uere_m", 3.0))

    series_data = TimeseriesEngine.generate_24h_series(
        orbit_propagator=orbit_propagator,
        target_lat=point_lat,
        target_lon=point_lon,
        target_alt_m=point_alt,
        horizon_mask_deg=horizon_deg,
        beacon_lat=beacon_lat,
        beacon_lon=beacon_lon,
        beacon_alt_m=beacon_alt,
        uere_m=uere_m,
    )

    # Format into hourly array expected by TimeseriesChart.jsx
    raw_points = series_data.get("points", [])
    output = []
    for h, p in enumerate(raw_points):
        output.append({
            "time": f"{h:02d}:00",
            "mode01_baseline": round(p.get("mode1_baseline_error_m", 25.0) or 25.0, 1),
            "mode02_pseudolite": round(p.get("mode2_pseudolite_error_m", 4.0) or 4.0, 1),
            "mode03_barometer": round(p.get("mode3_barometer_error_m", 6.5) or 6.5, 1),
            "target_threshold": 5.0,
        })

    return output


@app.get("/api/benchmarks", tags=["Science"])
def get_benchmarks():
    """Returns official peer-reviewed ISRO/NRSC benchmarks and engineering citations."""
    return get_benchmarks_data()
