"""
NavIC-Restore: Lane 2 - NavIC Orbits, Geometry Matrix & Math Engine Package
ASTRA 2026 Overnight Hackathon - Mathematical Engine for Team Hypervisors
"""

from .coordinates import (
    WGS84_A,
    WGS84_F,
    WGS84_B,
    WGS84_E2,
    WGS84_EP2,
    geodetic_to_ecef,
    ecef_to_geodetic,
    get_enu_rotation_matrix,
    ecef_to_enu,
    compute_az_el_range,
)

from .orbits import (
    NavicOrbitPropagator,
    SatelliteView,
    NAVIC_METADATA,
)

from .geometry import (
    NavicOperatingMode,
    FixStatus,
    DopResult,
    NavicGeometrySolver,
)

from .optimizer import (
    BeaconOptimizer,
    BeaconOptimizationResult,
    CandidateRidgeEvaluation,
)

from .timeseries import (
    TimeseriesEngine,
    HourlyComparisonPoint,
)

__all__ = [
    "WGS84_A",
    "WGS84_F",
    "WGS84_B",
    "WGS84_E2",
    "WGS84_EP2",
    "geodetic_to_ecef",
    "ecef_to_geodetic",
    "get_enu_rotation_matrix",
    "ecef_to_enu",
    "compute_az_el_range",
    "NavicOrbitPropagator",
    "SatelliteView",
    "NAVIC_METADATA",
    "NavicOperatingMode",
    "FixStatus",
    "DopResult",
    "NavicGeometrySolver",
    "BeaconOptimizer",
    "BeaconOptimizationResult",
    "CandidateRidgeEvaluation",
    "TimeseriesEngine",
    "HourlyComparisonPoint",
]
