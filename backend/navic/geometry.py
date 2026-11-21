"""
NavIC-Restore: Lane 2 - Geometry Matrix, ENU Projection, and DOP Metric Solver
Direct mathematical implementation of Section 4:
- Section 4.1: Linearized Geometry Matrix G
- Section 4.2: Mode 02 Tethered Pseudolite Augmentation G_aug
- Section 4.3: Mode 03 Barometer / DEM Altitude Constraint G_alt
- Section 4.4: ENU Rotation, Cofactor Matrix Q, GDOP/PDOP/HDOP/VDOP & Expected Error
"""

import math
from enum import Enum
from typing import Dict, List, Optional, Tuple, Any
import numpy as np

from .coordinates import geodetic_to_ecef, get_enu_rotation_matrix, compute_az_el_range


class NavicOperatingMode(str, Enum):
    BASELINE = "baseline"        # Mode 01: Degraded 3-4 NavIC satellites + valley terrain shadow
    PSEUDOLITE = "pseudolite"    # Mode 02: Tethered drone beacon on dry ridge
    BAROMETER = "barometer"      # Mode 03: Barometer / Bhuvan DEM vertical altitude constraint


class FixStatus(str, Enum):
    FIX_OPTIMAL = "FIX_OPTIMAL"      # GDOP <= 4.0, modeled error <= 5.0m
    FIX_USABLE = "FIX_USABLE"        # 4.0 < GDOP <= 8.0
    FIX_DEGRADED = "FIX_DEGRADED"    # 8.0 < GDOP <= 15.0
    NO_FIX = "NO_FIX"                # Singular matrix (rank < 4 or cond > 1e8 or GDOP > 15.0)


class DopResult:
    def __init__(
        self,
        status: FixStatus,
        gdop: Optional[float] = None,
        pdop: Optional[float] = None,
        hdop: Optional[float] = None,
        vdop: Optional[float] = None,
        tdop: Optional[float] = None,
        expected_error_m: Optional[float] = None,
        visible_sats_count: int = 0,
        active_sats_count: int = 0,
        condition_number: Optional[float] = None,
        mode: NavicOperatingMode = NavicOperatingMode.BASELINE
    ):
        self.status = status
        self.gdop = round(gdop, 2) if gdop is not None else None
        self.pdop = round(pdop, 2) if pdop is not None else None
        self.hdop = round(hdop, 2) if hdop is not None else None
        self.vdop = round(vdop, 2) if vdop is not None else None
        self.tdop = round(tdop, 2) if tdop is not None else None
        self.expected_error_m = round(expected_error_m, 2) if expected_error_m is not None else None
        self.visible_sats_count = visible_sats_count
        self.active_sats_count = active_sats_count
        self.condition_number = round(condition_number, 2) if condition_number is not None else None
        self.mode = mode

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status.value,
            "gdop": self.gdop,
            "pdop": self.pdop,
            "hdop": self.hdop,
            "vdop": self.vdop,
            "tdop": self.tdop,
            "expected_error_m": self.expected_error_m,
            "visible_sats_count": self.visible_sats_count,
            "active_sats_count": self.active_sats_count,
            "condition_number": self.condition_number,
            "mode": self.mode.value
        }


class NavicGeometrySolver:
    """
    Core Mathematical Geometry & DOP Engine.
    Constructs linearized geometry matrix G, applies G_aug / G_alt rows,
    projects into local ENU frame, and computes rigorous DOP cofactors.
    """

    @staticmethod
    def build_geometry_matrix(
        user_ecef: np.ndarray,
        user_lat_deg: float,
        user_lon_deg: float,
        satellite_ecef_dict: Dict[str, np.ndarray],
        active_satellite_names: List[str],
        horizon_mask_deg: float = 5.0,
        mode: NavicOperatingMode = NavicOperatingMode.BASELINE,
        beacon_ecef: Optional[np.ndarray] = None,
        min_beacon_dist_m: float = 50.0,
        max_beacon_dist_m: float = 25000.0
    ) -> Tuple[np.ndarray, int, int]:
        """
        Builds the N x 4 Geometry Matrix G in ECEF.
        Returns: (G_matrix, visible_satellite_count, total_rows_count)
        """
        g_rows = []
        visible_sats_count = 0

        # Section 4.1: Visible NavIC Satellites
        for sat_name in active_satellite_names:
            if sat_name not in satellite_ecef_dict:
                continue

            sat_ecef = satellite_ecef_dict[sat_name]
            az_deg, el_deg, range_m = compute_az_el_range(
                user_ecef, sat_ecef, user_lat_deg, user_lon_deg
            )

            # Check topographic canyon horizon shadow
            if el_deg < horizon_mask_deg:
                continue

            visible_sats_count += 1

            # Unit LOS vector from user to satellite: [ -(x_i - x_0)/r_i, -(y_i - y_0)/r_i, -(z_i - z_0)/r_i, 1 ]
            diff = sat_ecef - user_ecef
            los_unit = -diff / range_m
            g_rows.append([los_unit[0], los_unit[1], los_unit[2], 1.0])

        # Section 4.2: Mode 02 - Tethered Pseudolite Augmentation Row (G_aug)
        if mode == NavicOperatingMode.PSEUDOLITE and beacon_ecef is not None:
            diff_p = beacon_ecef - user_ecef
            range_p = float(np.linalg.norm(diff_p))

            if min_beacon_dist_m <= range_p <= max_beacon_dist_m:
                los_unit_p = -diff_p / range_p
                # Append pseudolite row: [ -(x_p - x_0)/r_p, -(y_p - y_0)/r_p, -(z_p - z_0)/r_p, 1 ]
                g_rows.append([los_unit_p[0], los_unit_p[1], los_unit_p[2], 1.0])

        # Section 4.3: Mode 03 - Barometer / DEM Altitude Constraint Row (G_alt)
        elif mode == NavicOperatingMode.BAROMETER:
            r0 = float(np.linalg.norm(user_ecef))
            if r0 > 1000.0:
                # Upward radial unit normal vector, 4th column is 0 (clock independent)
                g_rows.append([user_ecef[0] / r0, user_ecef[1] / r0, user_ecef[2] / r0, 0.0])

        if not g_rows:
            return np.zeros((0, 4), dtype=np.float64), 0, 0

        g_matrix = np.array(g_rows, dtype=np.float64)
        return g_matrix, visible_sats_count, len(g_rows)

    @classmethod
    def solve_dop(
        cls,
        user_lat_deg: float,
        user_lon_deg: float,
        user_alt_m: float,
        horizon_mask_deg: float,
        satellite_ecef_dict: Dict[str, np.ndarray],
        active_satellite_names: List[str],
        mode: NavicOperatingMode = NavicOperatingMode.BASELINE,
        beacon_lat_deg: Optional[float] = None,
        beacon_lon_deg: Optional[float] = None,
        beacon_alt_m: Optional[float] = None,
        uere_m: float = 3.0
    ) -> DopResult:
        """
        Solves GDOP, PDOP, HDOP, VDOP, TDOP, and expected 3D error at coordinate.
        Handles singular matrices and condition numbers > 1e8 cleanly.
        """
        user_ecef = geodetic_to_ecef(user_lat_deg, user_lon_deg, user_alt_m)

        beacon_ecef = None
        if beacon_lat_deg is not None and beacon_lon_deg is not None and beacon_alt_m is not None:
            beacon_ecef = geodetic_to_ecef(beacon_lat_deg, beacon_lon_deg, beacon_alt_m)

        g, vis_count, total_rows = cls.build_geometry_matrix(
            user_ecef=user_ecef,
            user_lat_deg=user_lat_deg,
            user_lon_deg=user_lon_deg,
            satellite_ecef_dict=satellite_ecef_dict,
            active_satellite_names=active_satellite_names,
            horizon_mask_deg=horizon_mask_deg,
            mode=mode,
            beacon_ecef=beacon_ecef
        )

        # Invertibility check: system must have at least 4 independent rows
        if total_rows < 4:
            return DopResult(
                status=FixStatus.NO_FIX,
                visible_sats_count=vis_count,
                active_sats_count=len(active_satellite_names),
                mode=mode
            )

        # Section 4.4: Local ENU Transformation
        # G_enu = G @ [ [R_enu^T, 0], [0, 1] ]
        r_enu = get_enu_rotation_matrix(user_lat_deg, user_lon_deg)
        g_spatial = g[:, 0:3]
        g_spatial_enu = g_spatial @ (r_enu.T)
        g_enu = np.column_stack([g_spatial_enu, g[:, 3]])

        # Normal Matrix M = G_enu^T @ G_enu
        gtg = g_enu.T @ g_enu

        # Numerical condition & rank check
        rank = np.linalg.matrix_rank(gtg)
        if rank < 4:
            return DopResult(
                status=FixStatus.NO_FIX,
                visible_sats_count=vis_count,
                active_sats_count=len(active_satellite_names),
                mode=mode
            )

        cond = float(np.linalg.cond(gtg))
        if cond > 1e8 or np.isnan(cond) or np.isinf(cond):
            return DopResult(
                status=FixStatus.NO_FIX,
                visible_sats_count=vis_count,
                active_sats_count=len(active_satellite_names),
                condition_number=cond,
                mode=mode
            )

        # Cofactor Matrix Q = (G_enu^T G_enu)^(-1)
        try:
            q = np.linalg.inv(gtg)
        except np.linalg.LinAlgError:
            return DopResult(
                status=FixStatus.NO_FIX,
                visible_sats_count=vis_count,
                active_sats_count=len(active_satellite_names),
                condition_number=cond,
                mode=mode
            )

        q_ee = max(0.0, float(q[0, 0]))
        q_nn = max(0.0, float(q[1, 1]))
        q_uu = max(0.0, float(q[2, 2]))
        q_tt = max(0.0, float(q[3, 3]))

        hdop = math.sqrt(q_ee + q_nn)
        vdop = math.sqrt(q_uu)
        pdop = math.sqrt(q_ee + q_nn + q_uu)
        tdop = math.sqrt(q_tt)
        gdop = math.sqrt(q_ee + q_nn + q_uu + q_tt)

        # Expected 3D positioning error (meters)
        expected_error_m = pdop * uere_m

        # Fix Status Classification
        if gdop > 15.0 or expected_error_m > 50.0:
            status = FixStatus.NO_FIX
        elif gdop <= 4.0 and expected_error_m <= 5.0:
            status = FixStatus.FIX_OPTIMAL
        elif gdop <= 8.0:
            status = FixStatus.FIX_USABLE
        else:
            status = FixStatus.FIX_DEGRADED

        return DopResult(
            status=status,
            gdop=gdop,
            pdop=pdop,
            hdop=hdop,
            vdop=vdop,
            tdop=tdop,
            expected_error_m=expected_error_m,
            visible_sats_count=vis_count,
            active_sats_count=len(active_satellite_names),
            condition_number=cond,
            mode=mode
        )
