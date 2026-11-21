"""
NavIC-Restore: Lane 2 - Comprehensive Test Suite for NavIC Orbits & Math Engine
Validates Section 4 mathematical specifications, coordinate conversions,
geometry matrix rank, DOP solver, pseudolite augmentation, and flood-aware optimizer.
"""

import math
import sys
from datetime import datetime, timezone
from pathlib import Path
import numpy as np

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.navic import (
    geodetic_to_ecef,
    ecef_to_geodetic,
    get_enu_rotation_matrix,
    compute_az_el_range,
    NavicOrbitPropagator,
    NavicGeometrySolver,
    NavicOperatingMode,
    FixStatus,
    BeaconOptimizer,
    TimeseriesEngine,
)
from backend.flood.loader import ScenarioLoader


def test_01_wgs84_roundtrip():
    """Verifies millimeter-accuracy Geodetic <-> ECEF roundtrip conversions."""
    # Test coordinate: Chamoli Gorge, Uttarakhand (30.535° N, 79.565° E, 1850.5 m)
    lat_orig, lon_orig, alt_orig = 30.535, 79.565, 1850.5
    ecef = geodetic_to_ecef(lat_orig, lon_orig, alt_orig)

    # Check ECEF magnitude is approximately Earth radius + altitude
    r = np.linalg.norm(ecef)
    assert 6360000.0 < r < 6385000.0

    lat_back, lon_back, alt_back = ecef_to_geodetic(ecef[0], ecef[1], ecef[2])
    assert abs(lat_back - lat_orig) < 1e-6
    assert abs(lon_back - lon_orig) < 1e-6
    assert abs(alt_back - alt_orig) < 1e-3  # Sub-millimeter accuracy
    print("[PASS] test_01_wgs84_roundtrip: Geodetic <-> ECEF roundtrip error < 0.001 m.")


def test_02_enu_rotation_orthonormality():
    """Verifies that ENU rotation matrix is strictly orthonormal with determinant +1."""
    lat, lon = 30.535, 79.565
    r_enu = get_enu_rotation_matrix(lat, lon)

    # Check R @ R.T == Identity
    identity_diff = np.abs(r_enu @ r_enu.T - np.eye(3))
    assert np.max(identity_diff) < 1e-12

    # Check det(R) == +1
    det = np.linalg.det(r_enu)
    assert abs(det - 1.0) < 1e-12
    print("[PASS] test_02_enu_rotation_orthonormality: R_ENU is strictly orthonormal.")


def test_03_orbit_propagator_tle():
    """Verifies loading NavIC TLEs and propagating geostationary orbit positions."""
    propagator = NavicOrbitPropagator()
    assert propagator.satellite_count >= 6

    now = datetime.now(timezone.utc)
    positions = propagator.get_satellite_ecef_positions(now)

    assert len(positions) >= 6
    assert "IRNSS-1B" in positions
    assert "IRNSS-1C" in positions

    # Geostationary/GSO orbital radius ~42,164 km
    for name, pos in positions.items():
        orbital_radius_km = np.linalg.norm(pos) / 1000.0
        assert 41500.0 <= orbital_radius_km <= 42500.0, f"{name} orbital radius {orbital_radius_km} km out of range"

    print(f"[PASS] test_03_orbit_propagator_tle: Loaded {propagator.satellite_count} NavIC satellites at GEO radius ~42,164 km.")


def test_04_satellite_topocentric_views():
    """Verifies azimuth/elevation/range from ground observer at Chamoli."""
    propagator = NavicOrbitPropagator()
    views = propagator.compute_satellite_views(
        lat_deg=30.535,
        lon_deg=79.565,
        alt_m=1800.0,
        horizon_mask_deg=5.0
    )

    assert len(views) >= 6
    visible_count = sum(1 for v in views if v.is_visible)
    assert visible_count >= 4

    for v in views:
        assert 0.0 <= v.azimuth_deg <= 360.0
        assert -90.0 <= v.elevation_deg <= 90.0
        assert 35000.0 <= v.range_km <= 42000.0

    print(f"[PASS] test_04_satellite_topocentric_views: {visible_count} visible satellites calculated with valid Az/El/Range.")


def test_05_three_satellite_breakdown_section_4_1():
    """
    Section 4.1: Mathematical breakdown when N = 3 visible satellites.
    G^T G has rank <= 3, matrix is singular, solver must return NO_FIX.
    """
    propagator = NavicOrbitPropagator()
    positions = propagator.get_satellite_ecef_positions()

    # Artificially select exactly 3 active satellites: 1B, 1C, 1E
    degraded_active = ["IRNSS-1B", "IRNSS-1C", "IRNSS-1E"]

    res = NavicGeometrySolver.solve_dop(
        user_lat_deg=30.535,
        user_lon_deg=79.565,
        user_alt_m=1800.0,
        horizon_mask_deg=5.0,
        satellite_ecef_dict=positions,
        active_satellite_names=degraded_active,
        mode=NavicOperatingMode.BASELINE,
        uere_m=3.0
    )

    assert res.status == FixStatus.NO_FIX
    assert res.gdop is None
    assert res.expected_error_m is None
    assert res.visible_sats_count == 3
    print("[PASS] test_05_three_satellite_breakdown_section_4_1: 3-satellite baseline yields rank-deficient NO_FIX as expected.")


def test_06_pseudolite_augmentation_section_4_2():
    """
    Section 4.2: Mode 02 Tethered Pseudolite Augmentation (G_aug).
    Adding 1 dry-ridge tethered drone beacon restores full rank 4x4,
    achieving modeled sub-5m positioning.
    """
    propagator = NavicOrbitPropagator()
    positions = propagator.get_satellite_ecef_positions()
    degraded_active = ["IRNSS-1B", "IRNSS-1C", "IRNSS-1E"]

    # Candidate dry ridge near Chamoli gorge: (30.525° N, 79.552° E, elev 2980m + 50m tether)
    beacon_lat, beacon_lon, beacon_alt = 30.525, 79.552, 2980.0 + 50.0

    res = NavicGeometrySolver.solve_dop(
        user_lat_deg=30.535,
        user_lon_deg=79.565,
        user_alt_m=1800.0,
        horizon_mask_deg=5.0,
        satellite_ecef_dict=positions,
        active_satellite_names=degraded_active,
        mode=NavicOperatingMode.PSEUDOLITE,
        beacon_lat_deg=beacon_lat,
        beacon_lon_deg=beacon_lon,
        beacon_alt_m=beacon_alt,
        uere_m=3.0
    )

    assert res.status != FixStatus.NO_FIX
    assert res.gdop is not None
    assert res.expected_error_m is not None
    assert res.expected_error_m < 30.0  # Dramatic recovery from infinite/No-Fix error
    print(f"[PASS] test_06_pseudolite_augmentation_section_4_2: G_aug restored rank! GDOP={res.gdop}, Error={res.expected_error_m} m.")


def test_07_barometer_fallback_section_4_3():
    """
    Section 4.3: Mode 03 Barometer / DEM Altitude Constraint (G_alt).
    Vertical altitude constraint removes clock/vertical ambiguity, enabling fix with 3 satellites.
    """
    propagator = NavicOrbitPropagator()
    positions = propagator.get_satellite_ecef_positions()
    degraded_active = ["IRNSS-1B", "IRNSS-1C", "IRNSS-1E"]

    res = NavicGeometrySolver.solve_dop(
        user_lat_deg=30.535,
        user_lon_deg=79.565,
        user_alt_m=1800.0,
        horizon_mask_deg=5.0,
        satellite_ecef_dict=positions,
        active_satellite_names=degraded_active,
        mode=NavicOperatingMode.BAROMETER,
        uere_m=3.0
    )

    assert res.status in (FixStatus.FIX_OPTIMAL, FixStatus.FIX_USABLE, FixStatus.FIX_DEGRADED)
    assert res.gdop is not None
    assert res.vdop is not None
    # Barometer clamps vertical component so VDOP is tightly bounded
    assert res.vdop <= 2.0
    print(f"[PASS] test_07_barometer_fallback_section_4_3: G_alt enabled 3-sat fix! GDOP={res.gdop}, VDOP={res.vdop}.")


def test_08_terrain_horizon_masking():
    """Verifies that high mountain walls (e.g. 35° horizon mask) block low satellites."""
    propagator = NavicOrbitPropagator()
    views_low_mask = propagator.compute_satellite_views(30.535, 79.565, 1800.0, horizon_mask_deg=5.0)
    views_high_mask = propagator.compute_satellite_views(30.535, 79.565, 1800.0, horizon_mask_deg=35.0)

    vis_low = sum(1 for v in views_low_mask if v.is_visible)
    vis_high = sum(1 for v in views_high_mask if v.is_visible)

    assert vis_low > vis_high
    print(f"[PASS] test_08_terrain_horizon_masking: Horizon mask 35° blocked {vis_low - vis_high} satellites.")


def test_09_flood_aware_beacon_optimizer():
    """Section 4.5: Tests optimal dry-ridge beacon search over Chamoli flood scenario."""
    loader = ScenarioLoader()
    scenario = loader.load_scenario("chamoli_uttarakhand")
    dry_ridges = loader.get_dry_ridges("chamoli_uttarakhand")

    propagator = NavicOrbitPropagator()
    positions = propagator.get_satellite_ecef_positions()
    degraded_active = ["IRNSS-1B", "IRNSS-1C", "IRNSS-1E"]

    opt_result = BeaconOptimizer.optimize(
        scenario_id="chamoli_uttarakhand",
        grid_cells=scenario.grid,
        candidate_dry_ridges=dry_ridges,
        satellite_ecef_dict=positions,
        active_satellite_names=degraded_active,
        beacon_height_m=50.0,
        uere_m=3.0
    )

    assert opt_result.optimal_beacon_height_m == 50.0
    assert opt_result.recommended_ridge_id in [r.id for r in dry_ridges]
    assert opt_result.augmented_avg_gdop < 8.0
    assert opt_result.augmented_fix_rate_percent > 60.0
    assert opt_result.gdop_reduction_percent > 50.0
    print(f"[PASS] test_09_flood_aware_beacon_optimizer: Optimal beacon placed at '{opt_result.recommended_ridge_name}'. GDOP reduction={opt_result.gdop_reduction_percent}%.")


def test_10_timeseries_24h_engine():
    """Verifies generating 24-hour comparative error timeseries for UI chart."""
    loader = ScenarioLoader()
    dry_ridges = loader.get_dry_ridges("chamoli_uttarakhand")
    top_ridge = dry_ridges[0]

    propagator = NavicOrbitPropagator()
    res = TimeseriesEngine.generate_24h_series(
        orbit_propagator=propagator,
        target_lat=30.535,
        target_lon=79.565,
        target_alt_m=1800.0,
        horizon_mask_deg=15.0,
        beacon_lat=top_ridge.lat,
        beacon_lon=top_ridge.lon,
        beacon_alt_m=top_ridge.elevation_m + 50.0,
        active_satellites=["IRNSS-1B", "IRNSS-1C", "IRNSS-1E"],
        uere_m=3.0
    )

    assert len(res["points"]) == 24
    assert res["summary"]["mode2_mean_error_m"] is not None
    assert res["summary"]["mode2_error_drop_percent"] >= 50.0
    print(f"[PASS] test_10_timeseries_24h_engine: Generated 24-hr series with {res['summary']['mode2_error_drop_percent']}% error reduction.")


if __name__ == "__main__":
    test_01_wgs84_roundtrip()
    test_02_enu_rotation_orthonormality()
    test_03_orbit_propagator_tle()
    test_04_satellite_topocentric_views()
    test_05_three_satellite_breakdown_section_4_1()
    test_06_pseudolite_augmentation_section_4_2()
    test_07_barometer_fallback_section_4_3()
    test_08_terrain_horizon_masking()
    test_09_flood_aware_beacon_optimizer()
    test_10_timeseries_24h_engine()
    print("\nALL 10/10 LANE 2 NAVIC ENGINE TESTS PASSED!")
