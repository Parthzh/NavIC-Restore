"""
NavIC-Restore: Lane 1 Automated Test Suite
Verifies scenario loading, SAR flood depth integrity, dry-ridge physical exclusion,
and Cartosat-1 DEM horizon masking.
"""

import unittest
from pathlib import Path
from backend.flood import (
    ScenarioLoader,
    PassableType,
    TerrainType,
)


class TestFloodDataAndTerrain(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.loader = ScenarioLoader()

    def test_list_scenarios(self):
        scenarios = self.loader.list_scenarios()
        ids = [s.id for s in scenarios]
        self.assertIn("chamoli_uttarakhand", ids)
        self.assertIn("godavari_floodplain", ids)

    def test_chamoli_scenario_integrity(self):
        sc = self.loader.load_scenario("chamoli_uttarakhand")
        self.assertEqual(sc.metadata.terrain_type, TerrainType.MOUNTAIN_CANYON)
        self.assertGreaterEqual(len(sc.grid), 200)

        # High mountain terrain check: gorge floor should be >1800m, ridges >2500m
        elevations = [c.elevation_m for c in sc.grid]
        self.assertGreater(min(elevations), 1800.0)
        self.assertGreater(max(elevations), 2800.0)

        # High horizon masking in Himalayan gorge: valley floor must exceed 25 degrees
        max_horizon = max(c.horizon_mask_deg for c in sc.grid)
        self.assertGreaterEqual(max_horizon, 30.0)

        # Verify rescue channels
        self.assertGreaterEqual(len(sc.rescue_channels), 2)
        channel_types = [c.channel_type for c in sc.rescue_channels]
        self.assertIn("boat", channel_types)
        self.assertIn("ambulance", channel_types)

    def test_godavari_scenario_integrity(self):
        sc = self.loader.load_scenario("godavari_floodplain")
        self.assertEqual(sc.metadata.terrain_type, TerrainType.RIVER_FLOODPLAIN)
        self.assertGreaterEqual(len(sc.grid), 200)

        # Lowland floodplain check: elevations around 38m - 60m
        elevations = [c.elevation_m for c in sc.grid]
        self.assertGreater(min(elevations), 30.0)
        self.assertLess(max(elevations), 80.0)

        # Low horizon mask in flat river basin
        for c in sc.grid:
            self.assertLessEqual(c.horizon_mask_deg, 6.0)

        # Ambulance passable (<0.3m) channel exists
        ambulance_channels = self.loader.get_rescue_channels("godavari_floodplain", channel_type="ambulance")
        self.assertGreaterEqual(len(ambulance_channels), 1)
        self.assertLessEqual(ambulance_channels[0].max_depth_m, 0.35)

    def test_dry_ridges_physical_exclusion(self):
        """CRITICAL: Optimizer candidates must strictly be on dry ground (flood_depth <= 0.05m)."""
        for scenario_id in ["chamoli_uttarakhand", "godavari_floodplain"]:
            dry_ridges = self.loader.get_dry_ridges(scenario_id)
            self.assertGreaterEqual(len(dry_ridges), 2)

            for ridge in dry_ridges:
                depth = self.loader.get_flood_depth_at(scenario_id, ridge.lat, ridge.lon)
                self.assertLessEqual(
                    depth,
                    0.05,
                    f"Violation in {scenario_id}: Ridge '{ridge.name}' is submerged with depth {depth}m!",
                )
                self.assertTrue(
                    self.loader.is_point_dry(scenario_id, ridge.lat, ridge.lon),
                    f"Ridge {ridge.name} failed dry-ground check",
                )
                self.assertGreater(ridge.height_above_flood_m, 5.0)

    def test_spatial_query_nearest_cell(self):
        # Query center of Chamoli
        cell = self.loader.get_nearest_cell("chamoli_uttarakhand", 30.535, 79.565)
        self.assertIsNotNone(cell)
        self.assertAlmostEqual(cell.lat, 30.535, delta=0.01)
        self.assertAlmostEqual(cell.lon, 79.565, delta=0.01)


if __name__ == "__main__":
    unittest.main()
