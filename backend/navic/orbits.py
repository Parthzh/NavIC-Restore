"""
NavIC-Restore: Lane 2 - NavIC Satellite Orbit Propagation & Visibility Engine
Skyfield ephemeris propagation from live CelesTrak or local fallback TLEs.
"""

import math
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

import numpy as np
import requests
from skyfield.api import EarthSatellite, load, wgs84

from .coordinates import geodetic_to_ecef, compute_az_el_range

# Official ISRO NavIC / IRNSS Constellation Metadata
NAVIC_METADATA = {
    39199: {"name": "IRNSS-1A", "type": "GSO (Inclined)", "sub_lon": 55.0, "default_active": False, "note": "Atomic clock degraded, messaging service only"},
    39635: {"name": "IRNSS-1B", "type": "GSO (Inclined)", "sub_lon": 55.0, "default_active": True, "note": "Operational"},
    40269: {"name": "IRNSS-1C", "type": "GEO (Equatorial)", "sub_lon": 83.0, "default_active": True, "note": "Operational Geostationary 83.0°E"},
    41241: {"name": "IRNSS-1E", "type": "GSO (Inclined)", "sub_lon": 111.75, "default_active": True, "note": "Operational"},
    41469: {"name": "IRNSS-1G", "type": "GEO (Equatorial)", "sub_lon": 129.5, "default_active": True, "note": "Operational Geostationary 129.5°E"},
    43286: {"name": "IRNSS-1I", "type": "GSO (Inclined)", "sub_lon": 55.0, "default_active": True, "note": "Operational (Replacement for 1A)"},
    56759: {"name": "NVS-01", "type": "GSO (Inclined)", "sub_lon": 111.75, "default_active": True, "note": "Operational Next-Gen Navigation Satellite"}
}


class SatelliteView:
    def __init__(
        self,
        norad_id: int,
        name: str,
        orbit_type: str,
        azimuth_deg: float,
        elevation_deg: float,
        range_km: float,
        is_visible: bool,
        is_active: bool,
        ecef_position_m: np.ndarray,
        note: str = ""
    ):
        self.norad_id = norad_id
        self.name = name
        self.orbit_type = orbit_type
        self.azimuth_deg = round(azimuth_deg, 2)
        self.elevation_deg = round(elevation_deg, 2)
        self.range_km = round(range_km, 1)
        self.is_visible = is_visible
        self.is_active = is_active
        self.ecef_position_m = ecef_position_m
        self.note = note

    def to_dict(self) -> Dict[str, Any]:
        return {
            "norad_id": self.norad_id,
            "name": self.name,
            "orbit_type": self.orbit_type,
            "azimuth_deg": self.azimuth_deg,
            "elevation_deg": self.elevation_deg,
            "range_km": self.range_km,
            "is_visible": self.is_visible,
            "is_active": self.is_active,
            "note": self.note
        }


class NavicOrbitPropagator:
    """
    Propagates NavIC satellite orbits using Skyfield SGP4 ephemeris.
    Loads live TLEs from CelesTrak with automatic fallback to data/fallback_navic_tle.txt.
    """

    def __init__(self, fallback_tle_path: Optional[str] = None):
        self.ts = load.timescale()
        if fallback_tle_path is None:
            repo_root = Path(__file__).resolve().parent.parent.parent
            self.fallback_tle_path = repo_root / "data" / "fallback_navic_tle.txt"
        else:
            self.fallback_tle_path = Path(fallback_tle_path)

        self._satellites: Dict[str, EarthSatellite] = {}
        self.source = "Unloaded"
        self._load_tle_catalog()

    def _load_tle_catalog(self):
        """Loads TLE data from live CelesTrak endpoint or local fallback file."""
        celestrak_url = "https://celestrak.org/NORAD/elements/gp.php?GROUP=irnss&FORMAT=tle"
        lines = []

        try:
            resp = requests.get(celestrak_url, timeout=3.5)
            if resp.status_code == 200 and len(resp.text) > 100:
                lines = resp.text.strip().splitlines()
                self.source = "CelesTrak (Live)"
        except Exception:
            pass

        if not lines and self.fallback_tle_path.exists():
            with open(self.fallback_tle_path, "r", encoding="utf-8") as f:
                lines = f.read().strip().splitlines()
            self.source = "Local Fallback TLE"

        # Filter out empty or whitespace-only lines
        clean_lines = [l.strip() for l in lines if l.strip()]

        idx = 0
        while idx < len(clean_lines) - 2:
            name_line = clean_lines[idx].strip()
            line1 = clean_lines[idx + 1].strip()
            line2 = clean_lines[idx + 2].strip()

            if line1.startswith("1 ") and line2.startswith("2 "):
                clean_name = name_line.split("(")[0].strip()
                try:
                    sat = EarthSatellite(line1, line2, clean_name, self.ts)
                    self._satellites[clean_name] = sat
                except Exception:
                    pass
                idx += 3
            else:
                idx += 1

    @property
    def satellite_count(self) -> int:
        return len(self._satellites)

    def get_satellite_ecef_positions(self, dt: Optional[datetime] = None) -> Dict[str, np.ndarray]:
        """Returns ECEF positions in meters [x, y, z] for all satellites at given timestamp."""
        if dt is None:
            dt = datetime.now(timezone.utc)
        elif dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        t = self.ts.from_datetime(dt)
        positions = {}
        for name, sat in self._satellites.items():
            try:
                geocentric = sat.at(t)
                # itrf_xyz returns [x, y, z] in km in ITRS / ECEF reference frame
                try:
                    xyz_km = geocentric.itrf_xyz().km
                except Exception:
                    xyz_km = geocentric.position.km
                positions[name] = np.array([xyz_km[0] * 1000.0, xyz_km[1] * 1000.0, xyz_km[2] * 1000.0], dtype=np.float64)
            except Exception:
                pass
        return positions

    def compute_satellite_views(
        self,
        lat_deg: float,
        lon_deg: float,
        alt_m: float = 0.0,
        horizon_mask_deg: float = 5.0,
        dt: Optional[datetime] = None,
        active_list: Optional[List[str]] = None
    ) -> List[SatelliteView]:
        """
        Computes topocentric view (Azimuth, Elevation, Range, visibility)
        from a specific ground point on Earth.
        """
        user_ecef = geodetic_to_ecef(lat_deg, lon_deg, alt_m)
        sat_positions = self.get_satellite_ecef_positions(dt)
        views = []

        for name, sat in self._satellites.items():
            if name not in sat_positions:
                continue

            sat_ecef = sat_positions[name]
            norad_id = sat.model.satnum
            catalog_entry = NAVIC_METADATA.get(norad_id, {})
            orbit_type = catalog_entry.get("type", "GSO")
            default_active = catalog_entry.get("default_active", True)
            note = catalog_entry.get("note", "")

            if active_list is not None:
                is_active = (name in active_list) or (str(norad_id) in active_list)
            else:
                is_active = default_active

            az_deg, el_deg, range_m = compute_az_el_range(user_ecef, sat_ecef, lat_deg, lon_deg)
            is_visible = el_deg >= horizon_mask_deg

            views.append(SatelliteView(
                norad_id=norad_id,
                name=name,
                orbit_type=orbit_type,
                azimuth_deg=az_deg,
                elevation_deg=el_deg,
                range_km=range_m / 1000.0,
                is_visible=is_visible,
                is_active=is_active,
                ecef_position_m=sat_ecef,
                note=note
            ))

        return views
