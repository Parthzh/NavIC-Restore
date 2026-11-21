"""
NavIC-Restore: Lane 3 - FastAPI Endpoint Integration Tests
Verifies all REST API endpoints integrate with Lane 1, Lane 2, and Lane 4.
"""

import unittest
from fastapi.testclient import TestClient

from backend.api.main import app


class TestNavicRestoreApi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_health_check(self):
        """Verifies GET /health and /api/health."""
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("chamoli_uttarakhand", data["available_scenarios"])
        self.assertGreaterEqual(data["navic_satellites_tracked"], 7)

    def test_02_get_scenarios(self):
        """Verifies GET /api/scenarios lists metadata."""
        resp = self.client.get("/api/scenarios")
        self.assertEqual(resp.status_code, 200)
        scenarios = resp.json()
        self.assertGreaterEqual(len(scenarios), 2)
        scenario_ids = [s["id"] for s in scenarios]
        self.assertIn("chamoli_uttarakhand", scenario_ids)
        self.assertIn("godavari_floodplain", scenario_ids)

    def test_03_get_scenario_details(self):
        """Verifies GET /api/scenarios/{id} returns full geometry."""
        resp = self.client.get("/api/scenarios/chamoli_uttarakhand")
        self.assertEqual(resp.status_code, 200)
        sc = resp.json()
        self.assertIn("metadata", sc)
        self.assertIn("grid", sc)
        self.assertIn("dry_ridges", sc)
        self.assertIn("rescue_channels", sc)
        self.assertGreater(len(sc["grid"]), 10)
        self.assertGreater(len(sc["dry_ridges"]), 0)

    def test_04_get_satellites(self):
        """Verifies GET /api/satellites returns NavIC satellites."""
        resp = self.client.get("/api/satellites?observer_lat=30.4&observer_lon=79.3")
        self.assertEqual(resp.status_code, 200)
        sats = resp.json()
        self.assertGreaterEqual(len(sats), 7)
        sat_names = [s["name"] for s in sats]
        self.assertTrue(any("IRNSS" in name or "NVS" in name for name in sat_names))

    def test_05_dop_grid_baseline_and_augmented(self):
        """Verifies POST /api/dop-grid for Mode 01 vs Mode 02."""
        # Mode 01 Baseline
        payload_m1 = {
            "scenario_id": "chamoli_uttarakhand",
            "mode": "baseline",
            "uere_m": 3.0,
        }
        resp_m1 = self.client.post("/api/dop-grid", json=payload_m1)
        self.assertEqual(resp_m1.status_code, 200)
        grid_m1 = resp_m1.json()
        self.assertIsInstance(grid_m1, list)
        self.assertGreater(len(grid_m1), 0)
        first_cell = grid_m1[0]
        self.assertIn("status", first_cell)
        self.assertIn("error_m", first_cell)

        # Mode 02 Pseudolite
        payload_m2 = {
            "scenario_id": "chamoli_uttarakhand",
            "mode": "pseudolite",
            "beacon": {
                "lat": 30.42,
                "lon": 79.33,
                "height_m": 50.0,
            },
            "uere_m": 3.0,
        }
        resp_m2 = self.client.post("/api/dop-grid", json=payload_m2)
        self.assertEqual(resp_m2.status_code, 200)
        grid_m2 = resp_m2.json()
        self.assertIsInstance(grid_m2, list)

    def test_06_optimize_beacon(self):
        """Verifies POST /api/optimize-beacon algorithmically picks dry ridge."""
        payload = {
            "scenario_id": "chamoli_uttarakhand",
            "beacon_height_m": 50.0,
            "uere_m": 3.0,
        }
        resp = self.client.post("/api/optimize-beacon", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("beacon", data)
        self.assertIn("optimal_ridge", data)
        self.assertIn("metrics", data)
        self.assertGreater(data["gdop_reduction_pct"], 0.0)

    def test_07_timeseries_24h(self):
        """Verifies POST /api/timeseries-24h returns 24 data points."""
        payload = {
            "scenario_id": "chamoli_uttarakhand",
            "point": {"lat": 30.41, "lon": 79.32},
            "uere_m": 3.0,
        }
        resp = self.client.post("/api/timeseries-24h", json=payload)
        self.assertEqual(resp.status_code, 200)
        points = resp.json()
        self.assertIsInstance(points, list)
        self.assertEqual(len(points), 24)
        first_p = points[0]
        self.assertIn("time", first_p)
        self.assertIn("mode01_baseline", first_p)
        self.assertIn("mode02_pseudolite", first_p)
        self.assertIn("mode03_barometer", first_p)

    def test_08_benchmarks(self):
        """Verifies GET /api/benchmarks returns official ISRO/NRSC citations."""
        resp = self.client.get("/api/benchmarks")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("benchmarks", data)
        self.assertIn("disclaimers", data)
        self.assertGreaterEqual(len(data["benchmarks"]), 3)


if __name__ == "__main__":
    unittest.main()
