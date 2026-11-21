"""
NavIC-Restore: Lane 1 - Scenario & Terrain Loader
Provides fast geospatial querying, flood depth lookups, dry-ridge filtering, and DEM masking.
"""

import json
import math
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .models import (
    FloodScenario,
    ScenarioMetadata,
    FloodCell,
    DryRidge,
    RescueChannel,
    PassableType,
)


class ScenarioLoader:
    def __init__(self, scenarios_dir: Optional[str] = None):
        if scenarios_dir is None:
            # Default to repo root / data / scenarios
            current_file = Path(__file__).resolve()
            repo_root = current_file.parent.parent.parent
            self.scenarios_dir = repo_root / "data" / "scenarios"
        else:
            self.scenarios_dir = Path(scenarios_dir)

        self._cache: Dict[str, FloodScenario] = {}

    def list_scenarios(self) -> List[ScenarioMetadata]:
        """Lists metadata for all pre-cached Indian scenarios."""
        scenarios = []
        if not self.scenarios_dir.exists():
            return scenarios

        for file_path in sorted(self.scenarios_dir.glob("*.json")):
            try:
                scenario_id = file_path.stem
                sc = self.load_scenario(scenario_id)
                scenarios.append(sc.metadata)
            except Exception as e:
                print(f"Warning: Failed to load scenario from {file_path.name}: {e}")
        return scenarios

    def load_scenario(self, scenario_id: str) -> FloodScenario:
        """Loads and caches a scenario JSON by id (e.g. 'chamoli_uttarakhand')."""
        if scenario_id in self._cache:
            return self._cache[scenario_id]

        file_path = self.scenarios_dir / f"{scenario_id}.json"
        if not file_path.exists():
            raise FileNotFoundError(f"Scenario '{scenario_id}' not found at {file_path}")

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        scenario = FloodScenario.model_validate(data)
        self._cache[scenario_id] = scenario
        return scenario

    def get_dry_ridges(self, scenario_id: str, min_height_above_flood_m: float = 0.0) -> List[DryRidge]:
        """
        Returns all verified dry-ridge candidate nodes.
        Strictly excludes any points submerged in floodwater (flood_depth_m > 0.05).
        """
        scenario = self.load_scenario(scenario_id)
        candidates = []
        for ridge in scenario.dry_ridges:
            if ridge.height_above_flood_m >= min_height_above_flood_m:
                # Double-check elevation against local flood depth
                cell = self.get_nearest_cell(scenario_id, ridge.lat, ridge.lon)
                if cell and cell.flood_depth_m <= 0.05:
                    candidates.append(ridge)
                elif cell is None:
                    candidates.append(ridge)
        return candidates

    def get_nearest_cell(self, scenario_id: str, lat: float, lon: float) -> Optional[FloodCell]:
        """Finds the nearest grid cell in the scenario to the given coordinate."""
        scenario = self.load_scenario(scenario_id)
        if not scenario.grid:
            return None

        min_dist_sq = float("inf")
        nearest = None
        for cell in scenario.grid:
            d_lat = cell.lat - lat
            d_lon = cell.lon - lon
            dist_sq = d_lat * d_lat + d_lon * d_lon
            if dist_sq < min_dist_sq:
                min_dist_sq = dist_sq
                nearest = cell
        return nearest

    def get_elevation_at(self, scenario_id: str, lat: float, lon: float) -> float:
        """Returns Cartosat-1 DEM elevation in meters at coordinate."""
        cell = self.get_nearest_cell(scenario_id, lat, lon)
        return cell.elevation_m if cell else 0.0

    def get_flood_depth_at(self, scenario_id: str, lat: float, lon: float) -> float:
        """Returns EOS-04 SAR flood depth in meters at coordinate."""
        cell = self.get_nearest_cell(scenario_id, lat, lon)
        return cell.flood_depth_m if cell else 0.0

    def get_horizon_mask_at(self, scenario_id: str, lat: float, lon: float) -> float:
        """Returns terrain horizon obstruction angle in degrees."""
        cell = self.get_nearest_cell(scenario_id, lat, lon)
        return cell.horizon_mask_deg if cell else 5.0

    def is_point_dry(self, scenario_id: str, lat: float, lon: float) -> bool:
        """Physical no-go check: True if flood_depth_m <= 0.05."""
        depth = self.get_flood_depth_at(scenario_id, lat, lon)
        return depth <= 0.05

    def get_rescue_channels(self, scenario_id: str, channel_type: Optional[str] = None) -> List[RescueChannel]:
        """Returns rescue navigation channels (e.g. ambulance passable or boat evacuation)."""
        scenario = self.load_scenario(scenario_id)
        if channel_type is None:
            return scenario.rescue_channels
        return [c for c in scenario.rescue_channels if c.channel_type == channel_type]
