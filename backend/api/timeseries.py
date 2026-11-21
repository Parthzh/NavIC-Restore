"""
NavIC-Restore: Lane 3 - 24-Hour Diurnal Positioning Error Generator
Simulates constellation geometry over 24 hours to generate comparative error curves
(Mode 01 Baseline vs Mode 02 Pseudolite vs Mode 03 Barometer) for Recharts in the frontend.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
import numpy as np

from backend.flood.loader import ScenarioLoader
from backend.navic.coordinates import geodetic_to_ecef
from backend.navic.orbits import NavicOrbitPropagator
from backend.navic.solver import DopCalculator, FixStatus
from .schemas import Coordinate2D, Coordinate3D, HourlyErrorPoint, Timeseries24hResponse


class TimeseriesGenerator:
    def __init__(self, loader: Optional[ScenarioLoader] = None, propagator: Optional[NavicOrbitPropagator] = None):
        self.loader = loader or ScenarioLoader()
        self.propagator = propagator or NavicOrbitPropagator()

    def generate_24h_series(
        self,
        scenario_id: str,
        point: Coordinate2D,
        beacon: Optional[Coordinate3D] = None,
        uere_m: float = 3.0,
    ) -> Timeseries24hResponse:
        """
        Calculates hourly positioning error across all 3 modes for the next 24 hours.
        """
        scenario = self.loader.load_scenario(scenario_id)
        user_alt = self.loader.get_elevation_at(scenario_id, point.lat, point.lon)

        # Retrieve or default beacon
        if beacon is None and scenario.dry_ridges:
            ridge = scenario.dry_ridges[0]
            beacon = Coordinate3D(
                lat=ridge.lat,
                lon=ridge.lon,
                elevation_m=ridge.elevation_m,
                height_m=ridge.recommended_tether_height_m,
            )

        beacon_ecef = None
        if beacon is not None:
            beacon_ecef = geodetic_to_ecef(
                beacon.lat,
                beacon.lon,
                (beacon.elevation_m or user_alt) + (beacon.height_m or 50.0),
            )

        # Start from current UTC hour
        now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        data_points: List[HourlyErrorPoint] = []

        m1_errors = []
        m2_errors = []
        m3_errors = []

        for h in range(24):
            dt = now + timedelta(hours=h)
            dt_iso = dt.isoformat()

            # Propagate satellites
            sat_states = self.propagator.get_satellites(
                timestamp_iso=dt_iso,
                observer_lat=point.lat,
                observer_lon=point.lon,
                observer_alt_m=user_alt,
            )

            # Terrain horizon angle at point
            cell = self.loader.get_nearest_cell(scenario_id, point.lat, point.lon)
            horizon_deg = cell.horizon_mask_deg if cell else 15.0

            active_sats = [
                s for s in sat_states
                if s.is_active and s.elevation_deg >= horizon_deg
            ]
            sat_ecefs = [np.array(s.ecef_m) for s in active_sats]

            # Mode 01: Baseline
            res_m1 = DopCalculator.compute_dop(
                satellite_ecefs=sat_ecefs,
                user_lat=point.lat,
                user_lon=point.lon,
                user_alt_m=user_alt,
                mode="baseline",
                uere_m=uere_m,
            )

            # Mode 02: Pseudolite
            res_m2 = DopCalculator.compute_dop(
                satellite_ecefs=sat_ecefs,
                user_lat=point.lat,
                user_lon=point.lon,
                user_alt_m=user_alt,
                mode="pseudolite",
                beacon_ecef=beacon_ecef,
                uere_m=uere_m,
            )

            # Mode 03: Barometer / DEM
            res_m3 = DopCalculator.compute_dop(
                satellite_ecefs=sat_ecefs,
                user_lat=point.lat,
                user_lon=point.lon,
                user_alt_m=user_alt,
                mode="barometer",
                uere_m=uere_m,
            )

            m1_err = res_m1.error_m
            m2_err = res_m2.error_m
            m3_err = res_m3.error_m

            if m1_err is not None:
                m1_errors.append(m1_err)
            if m2_err is not None:
                m2_errors.append(m2_err)
            if m3_err is not None:
                m3_errors.append(m3_err)

            data_points.append(
                HourlyErrorPoint(
                    hour=h,
                    timestamp_iso=dt_iso,
                    visible_sats=len(active_sats),
                    mode01_baseline_error_m=m1_err,
                    mode01_status=res_m1.status.value,
                    mode02_pseudolite_error_m=m2_err,
                    mode02_status=res_m2.status.value,
                    mode03_barometer_error_m=m3_err,
                    mode03_status=res_m3.status.value,
                )
            )

        summary = {
            "mode01_avg_error_m": round(float(np.mean(m1_errors)), 2) if m1_errors else None,
            "mode02_avg_error_m": round(float(np.mean(m2_errors)), 2) if m2_errors else None,
            "mode03_avg_error_m": round(float(np.mean(m3_errors)), 2) if m3_errors else None,
            "mode01_outage_hours": sum(1 for p in data_points if p.mode01_status == "NO_FIX"),
            "mode02_outage_hours": sum(1 for p in data_points if p.mode02_status == "NO_FIX"),
            "mode03_outage_hours": sum(1 for p in data_points if p.mode03_status == "NO_FIX"),
        }

        return Timeseries24hResponse(
            scenario_id=scenario_id,
            point=point,
            beacon_used=beacon,
            data=data_points,
            summary=summary,
        )
