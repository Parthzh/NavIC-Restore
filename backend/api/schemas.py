"""
NavIC-Restore: Lane 3 - Pydantic Request & Response Schemas
Adheres strictly to shared/contracts.json.
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from backend.flood.models import (
    Coordinate2D,
    ScenarioMetadata,
    FloodCell,
    DryRidge,
    RescueChannel,
    PassableType,
    TerrainType,
)
from backend.navic.solver import FixStatus


class Coordinate3D(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lon: float = Field(..., ge=-180.0, le=180.0)
    elevation_m: Optional[float] = Field(default=0.0)
    height_m: Optional[float] = Field(default=50.0, ge=10.0, le=150.0)


class BeaconInput(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lon: float = Field(..., ge=-180.0, le=180.0)
    elevation_m: Optional[float] = None
    height_m: float = Field(default=50.0, ge=10.0, le=150.0)


class OperatingMode(str, Enum):
    BASELINE = "baseline"        # Mode 01
    PSEUDOLITE = "pseudolite"    # Mode 02
    BAROMETER = "barometer"      # Mode 03


class DopGridRequest(BaseModel):
    scenario_id: str
    timestamp_iso: Optional[str] = None
    active_satellites: Optional[List[str]] = None
    mode: OperatingMode = OperatingMode.BASELINE
    beacon: Optional[BeaconInput] = None
    uere_m: float = Field(default=3.0, ge=1.0, le=10.0)


class GridCellDop(BaseModel):
    lat: float
    lon: float
    elevation_m: float
    flood_depth_m: float
    is_flooded: bool
    passable_type: PassableType
    horizon_mask_deg: float
    visible_sats: int
    gdop: Optional[float] = None
    pdop: Optional[float] = None
    hdop: Optional[float] = None
    vdop: Optional[float] = None
    tdop: Optional[float] = None
    error_m: Optional[float] = None
    status: FixStatus


class DopGridResponse(BaseModel):
    scenario_id: str
    mode: str
    timestamp_iso: str
    active_satellite_count: int
    total_cells: int
    fix_3d_count: int
    degraded_fix_count: int
    no_fix_count: int
    mean_gdop: Optional[float] = None
    mean_error_m: Optional[float] = None
    grid: List[GridCellDop]


class OptimizeBeaconRequest(BaseModel):
    scenario_id: str
    timestamp_iso: Optional[str] = None
    active_satellites: Optional[List[str]] = None
    min_dist_m: float = Field(default=200.0, ge=50.0)
    max_dist_m: float = Field(default=15000.0, le=30000.0)
    beacon_height_m: float = Field(default=50.0, ge=10.0, le=150.0)
    uere_m: float = Field(default=3.0, ge=1.0, le=10.0)


class Timeseries24hRequest(BaseModel):
    scenario_id: str
    point: Coordinate2D
    beacon: Optional[Coordinate3D] = None
    uere_m: float = Field(default=3.0, ge=1.0, le=10.0)


class HourlyErrorPoint(BaseModel):
    hour: int
    timestamp_iso: str
    visible_sats: int
    mode01_baseline_error_m: Optional[float]
    mode01_status: str
    mode02_pseudolite_error_m: Optional[float]
    mode02_status: str
    mode03_barometer_error_m: Optional[float]
    mode03_status: str


class Timeseries24hResponse(BaseModel):
    scenario_id: str
    point: Coordinate2D
    beacon_used: Optional[Coordinate3D] = None
    data: List[HourlyErrorPoint]
    summary: Dict[str, Any]
