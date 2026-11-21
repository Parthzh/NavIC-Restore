import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import SatelliteBar from './components/SatelliteBar';
import MapComponent from './components/MapComponent';
import MetricsDrawer from './components/MetricsDrawer';
import ScienceModal from './components/ScienceModal';

import {
  fetchScenarios,
  fetchScenarioDetails,
  fetchSatellites,
  requestDopGrid,
  requestOptimization,
  requestTimeseries
} from './services/api';

export default function App() {
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('chamoli_uttarakhand');
  const [scenarioData, setScenarioData] = useState(null);
  const [satellites, setSatellites] = useState([]);
  const [mode, setMode] = useState('pseudolite'); // Mode 01 'baseline' | Mode 02 'pseudolite' | Mode 03 'barometer'
  const [beacon, setBeacon] = useState({
    lat: 30.548,
    lon: 79.575,
    elevation_m: 2310,
    height_m: 60
  });
  const [uereM, setUereM] = useState(3.0);
  const [dopGrid, setDopGrid] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [timeseriesData, setTimeseriesData] = useState([]);
  const [summary, setSummary] = useState({ avg_error_m: 3.8, coverage_pct: 91.2 });
  const [isBackend, setIsBackend] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isScienceOpen, setIsScienceOpen] = useState(false);

  // 1. Initial Load: Fetch Scenarios & NavIC Constellation
  useEffect(() => {
    async function init() {
      const scenRes = await fetchScenarios();
      setScenarios(scenRes.data);
      setIsBackend(scenRes.isBackend);

      const satRes = await fetchSatellites();
      setSatellites(satRes.data);

      const detailRes = await fetchScenarioDetails('chamoli_uttarakhand');
      setScenarioData(detailRes.data);

      if (detailRes.data?.dry_ridges?.[0]) {
        const ridge = detailRes.data.dry_ridges.find(r => r.is_recommended) || detailRes.data.dry_ridges[0];
        setBeacon({
          lat: ridge.lat,
          lon: ridge.lon,
          elevation_m: ridge.elevation_m,
          height_m: ridge.recommended_tether_height_m || 50
        });
      }
    }
    init();
  }, []);

  // 2. Scenario Switch Handler
  const handleSelectScenario = async (id) => {
    setSelectedScenarioId(id);
    const detailRes = await fetchScenarioDetails(id);
    setScenarioData(detailRes.data);
    setSelectedCell(null);

    if (detailRes.data?.dry_ridges?.[0]) {
      const ridge = detailRes.data.dry_ridges.find(r => r.is_recommended) || detailRes.data.dry_ridges[0];
      setBeacon({
        lat: ridge.lat,
        lon: ridge.lon,
        elevation_m: ridge.elevation_m,
        height_m: ridge.recommended_tether_height_m || 50
      });
    }
  };

  // 3. Recalculate DOP Grid & Summary
  const refreshGrid = useCallback(async () => {
    if (!scenarioData) return;

    const payload = {
      scenario_id: selectedScenarioId,
      active_satellites_list: satellites,
      mode: mode,
      beacon: beacon,
      uere_m: uereM
    };

    const res = await requestDopGrid(payload, scenarioData);
    setDopGrid(res.data);
    setIsBackend(res.isBackend);

    // Compute summary metrics across flooded cells
    const flooded = res.data.filter(c => c.is_flooded);
    if (flooded.length > 0) {
      let sumErr = 0;
      let sub5mCount = 0;
      for (const c of flooded) {
        sumErr += (c.status === 'NO_FIX' ? 25.0 : c.error_m);
        if (c.status === 'SUB_5M') sub5mCount++;
      }
      setSummary({
        avg_error_m: Number((sumErr / flooded.length).toFixed(1)),
        coverage_pct: Number(((sub5mCount / flooded.length) * 100).toFixed(1))
      });
    }

    // Refresh timeseries chart
    const seriesRes = await requestTimeseries({
      scenario_id: selectedScenarioId,
      point: selectedCell || scenarioData.metadata.center,
      beacon: beacon,
      uere_m: uereM
    }, scenarioData);
    setTimeseriesData(seriesRes.data);
  }, [scenarioData, selectedScenarioId, satellites, mode, beacon, uereM, selectedCell]);

  useEffect(() => {
    refreshGrid();
  }, [refreshGrid]);

  // 4. Satellite Kill-Switch Toggle
  const handleToggleSatellite = (satId) => {
    setSatellites(prev => prev.map(s => s.id === satId ? { ...s, active: !s.active } : s));
  };

  const handleResetConstellation = () => {
    setSatellites(prev => prev.map(s => ({ ...s, active: true })));
  };

  const handleSimulateDegraded = () => {
    // Keep only 3 satellites active to simulate severe Himalayan mountain valley shadow
    setSatellites(prev => prev.map((s, idx) => ({ ...s, active: idx < 3 })));
  };

  // 5. Auto-Optimize Beacon on Dry Ground
  const handleOptimize = async () => {
    if (!scenarioData) return;
    setIsOptimizing(true);
    const optRes = await requestOptimization({
      scenario_id: selectedScenarioId,
      active_satellites_list: satellites,
      uere_m: uereM
    }, scenarioData);

    if (optRes.data && optRes.data.beacon) {
      setBeacon(optRes.data.beacon);
      setMode('pseudolite'); // Switch to Mode 02 to demonstrate fix
    }
    setIsOptimizing(false);
  };

  // 6. Direct Ridge Deployment Click
  const handleDeployToRidge = (ridge) => {
    setBeacon({
      lat: ridge.lat,
      lon: ridge.lon,
      elevation_m: ridge.elevation_m,
      height_m: ridge.recommended_tether_height_m || 50
    });
    setMode('pseudolite');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-space-900 text-slate-100">
      {/* Top Mission Control Bar */}
      <Navbar
        scenarios={scenarios}
        selectedScenarioId={selectedScenarioId}
        onSelectScenario={handleSelectScenario}
        mode={mode}
        onSelectMode={setMode}
        onOptimize={handleOptimize}
        isOptimizing={isOptimizing}
        isBackend={isBackend}
        onOpenScience={() => setIsScienceOpen(true)}
      />

      {/* NavIC Satellite Constellation Health & Kill Switches */}
      <SatelliteBar
        satellites={satellites}
        onToggleSatellite={handleToggleSatellite}
        onResetConstellation={handleResetConstellation}
        onSimulateDegraded={handleSimulateDegraded}
      />

      {/* Main Workspace: Interactive Map & Live Metrics Drawer */}
      <div className="flex flex-1 h-[calc(100vh-6.5rem)] overflow-hidden relative">
        <main className="flex-1 h-full relative">
          <MapComponent
            scenario={scenarioData}
            dopGrid={dopGrid}
            mode={mode}
            beacon={beacon}
            onUpdateBeaconPosition={(lat, lon) => setBeacon(prev => ({ ...prev, lat, lon }))}
            selectedCell={selectedCell}
            onSelectCell={setSelectedCell}
            onDeployToRidge={handleDeployToRidge}
            satellites={satellites}
          />
        </main>

        <MetricsDrawer
          mode={mode}
          summary={summary}
          beacon={beacon}
          onChangeBeaconHeight={(h) => setBeacon(prev => ({ ...prev, height_m: h }))}
          uereM={uereM}
          onChangeUere={setUereM}
          selectedCell={selectedCell}
          timeseriesData={timeseriesData}
          activeScenario={scenarioData?.metadata}
        />
      </div>

      {/* Science & Research Benchmarks Modal */}
      <ScienceModal
        isOpen={isScienceOpen}
        onClose={() => setIsScienceOpen(false)}
      />
    </div>
  );
}
