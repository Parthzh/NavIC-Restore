"""
NavIC-Restore: Lane 2 - Geodetic, ECEF, and Local ENU Coordinate Transformations
WGS-84 standard ellipsoid conversions.
"""

import math
import numpy as np
from typing import Tuple

# WGS-84 Ellipsoid Constants
WGS84_A = 6378137.0                      # Semi-major axis (meters)
WGS84_F = 1.0 / 298.257223563            # Flattening
WGS84_B = WGS84_A * (1.0 - WGS84_F)      # Semi-minor axis (meters)
WGS84_E2 = 2.0 * WGS84_F - WGS84_F ** 2  # First eccentricity squared
WGS84_EP2 = (WGS84_A ** 2 - WGS84_B ** 2) / (WGS84_B ** 2)  # Second eccentricity squared


def geodetic_to_ecef(lat_deg: float, lon_deg: float, alt_m: float = 0.0) -> np.ndarray:
    """
    Converts WGS-84 Geodetic coordinates (latitude, longitude in degrees, altitude in meters)
    to Earth-Centered, Earth-Fixed (ECEF) coordinates [x, y, z] in meters.
    """
    lat_rad = math.radians(lat_deg)
    lon_rad = math.radians(lon_deg)
    sin_lat = math.sin(lat_rad)
    cos_lat = math.cos(lat_rad)
    sin_lon = math.sin(lon_rad)
    cos_lon = math.cos(lon_rad)

    n_val = WGS84_A / math.sqrt(1.0 - WGS84_E2 * (sin_lat ** 2))
    x = (n_val + alt_m) * cos_lat * cos_lon
    y = (n_val + alt_m) * cos_lat * sin_lon
    z = (n_val * (1.0 - WGS84_E2) + alt_m) * sin_lat
    return np.array([x, y, z], dtype=np.float64)


def ecef_to_geodetic(x: float, y: float, z: float) -> Tuple[float, float, float]:
    """
    Converts ECEF [x, y, z] in meters to WGS-84 Geodetic (latitude deg, longitude deg, altitude meters)
    using Bowring's closed-form algorithm (accurate to millimeters).
    """
    p = math.sqrt(x * x + y * y)
    if p < 1e-6:
        # Near poles
        lat = 90.0 if z > 0 else -90.0
        lon = 0.0
        alt = abs(z) - WGS84_B
        return lat, lon, alt

    theta = math.atan2(z * WGS84_A, p * WGS84_B)
    sin_theta = math.sin(theta)
    cos_theta = math.cos(theta)

    lat_rad = math.atan2(
        z + WGS84_EP2 * WGS84_B * (sin_theta ** 3),
        p - WGS84_E2 * WGS84_A * (cos_theta ** 3)
    )
    lon_rad = math.atan2(y, x)

    sin_lat = math.sin(lat_rad)
    n_val = WGS84_A / math.sqrt(1.0 - WGS84_E2 * (sin_lat ** 2))
    alt_m = (p / math.cos(lat_rad)) - n_val

    return math.degrees(lat_rad), math.degrees(lon_rad), alt_m


def get_enu_rotation_matrix(lat_deg: float, lon_deg: float) -> np.ndarray:
    """
    Returns 3x3 orthonormal rotation matrix R_ENU that rotates ECEF vectors into local East-North-Up:
    v_enu = R_ENU @ v_ecef
    """
    lat_rad = math.radians(lat_deg)
    lon_rad = math.radians(lon_deg)
    sin_lat = math.sin(lat_rad)
    cos_lat = math.cos(lat_rad)
    sin_lon = math.sin(lon_rad)
    cos_lon = math.cos(lon_rad)

    return np.array([
        [-sin_lon, cos_lon, 0.0],
        [-sin_lat * cos_lon, -sin_lat * sin_lon, cos_lat],
        [cos_lat * cos_lon, cos_lat * sin_lon, sin_lat]
    ], dtype=np.float64)


def ecef_to_enu(v_ecef: np.ndarray, ref_lat_deg: float, ref_lon_deg: float) -> np.ndarray:
    """Rotates an ECEF vector to local ENU at reference coordinate."""
    r_enu = get_enu_rotation_matrix(ref_lat_deg, ref_lon_deg)
    return r_enu @ v_ecef


def compute_az_el_range(
    user_ecef: np.ndarray,
    sat_ecef: np.ndarray,
    user_lat_deg: float,
    user_lon_deg: float
) -> Tuple[float, float, float]:
    """
    Computes topocentric Azimuth (degrees [0, 360)), Elevation (degrees [-90, 90]),
    and Slant Range (meters) from user to satellite.
    """
    diff_ecef = sat_ecef - user_ecef
    range_m = float(np.linalg.norm(diff_ecef))

    diff_enu = ecef_to_enu(diff_ecef, user_lat_deg, user_lon_deg)
    east, north, up = diff_enu[0], diff_enu[1], diff_enu[2]

    # Azimuth clockwise from North: atan2(east, north)
    az_rad = math.atan2(east, north)
    az_deg = (math.degrees(az_rad) + 360.0) % 360.0

    # Elevation above local horizon: atan2(up, horizontal_range)
    horiz_dist = math.sqrt(east * east + north * north)
    el_rad = math.atan2(up, horiz_dist)
    el_deg = math.degrees(el_rad)

    return az_deg, el_deg, range_m
