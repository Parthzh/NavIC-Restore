"""
NavIC-Restore: Lane 1 - Flood Data & Terrain Models
Schema definitions for SAR flood extents, DEM elevations, dry-ridge masks, and rescue channels.
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class PassableType(str, Enum):
    DRY = "dry"
    AMBULANCE_PASSABLE = "ambulance_passable"  # Depth <= 0.3m
    BOAT_ONLY = "boat_only"                    # 0.3m < Depth <= 1.5m
    DEEP_FLOOD = "deep_flood"                  # Depth > 1.5m


class TerrainType(str, Enum):
    MOUNTAIN_CANYON = "mountain_canyon"
    RIVER_FLOODPLAIN = "river_floodplain"
    URBAN_VALLEY = "urban_valley"
    COASTAL = "coastal"


class Coordinate2D(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lon: float = Field(..., ge=-180.0, le=180.0)


class BoundingBox(BaseModel):
    min_lat: float
    max_lat: float
    min_lon: float
    max_lon: float


class FloodCell(BaseModel):
    lat: float
    lon: float
    elevation_m: float
    flood_depth_m: float
    is_flooded: bool
    passable_type: PassableType
    horizon_mask_deg: float = Field(default=5.0, ge=0.0, le=90.0)


class DryRidge(BaseModel):
    id: str
    name: str
    lat: float
    lon: float
    elevation_m: float
    height_above_flood_m: float
    recommended_tether_height_m: float = Field(default=50.0, ge=10.0, le=150.0)
    is_recommended: bool = True
    description: str


class RescueWaypoint(BaseModel):
    lat: float
    lon: float
    depth_m: float


class RescueChannel(BaseModel):
    id: str
    name: str
    channel_type: str  # "ambulance" | "boat" | "aerial_tether"
    max_depth_m: float
    avg_depth_m: float
    waypoints: List[RescueWaypoint]


class ScenarioMetadata(BaseModel):
    id: str
    name: str
    region: str
    state: str
    description: str
    terrain_type: TerrainType
    center: Coordinate2D
    bounding_box: BoundingBox
    sar_source: str = "EOS-04 C-band SAR (Bhoonidhi NRSC)"
    dem_source: str = "Cartosat-1 DEM 30m (Bhuvan NRSC)"
    benchmark_reference: Optional[str] = None


class FloodScenario(BaseModel):
    metadata: ScenarioMetadata
    grid: List[FloodCell]
    dry_ridges: List[DryRidge]
    rescue_channels: List[RescueChannel]
