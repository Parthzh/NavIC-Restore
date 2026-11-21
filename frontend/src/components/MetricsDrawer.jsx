import React from 'react';
import { ShieldCheck, AlertCircle, Compass, Radio, Activity, Navigation, Mountain } from 'lucide-react';
import TimeseriesChart from './TimeseriesChart';

export default function MetricsDrawer({
  mode,
  summary,
  beacon,
  onChangeBeaconHeight,
  uereM,
  onChangeUere,
  selectedCell,
  timeseriesData,
  activeScenario
}) {
  return (
    <aside className="w-80 sm:w-96 bg-space-800/95 border-l border-space-700/80 flex flex-col h-[calc(100vh-6.5rem)] overflow-y-auto p-4 gap-4 z-10 backdrop-blur select-none">
      {/* Primary Positioning Fix Status Badge */}
      <div className="p-3.5 rounded-xl border bg-space-900/90 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Positioning Geometry Status</span>
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
            summary.coverage_pct >= 85
              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
              : summary.coverage_pct >= 40
              ? 'bg-amber-950/60 text-amber-400 border border-amber-500/40'
              : 'bg-red-950/60 text-red-400 border border-red-500/40'
          }`}>
            {summary.coverage_pct >= 85 ? 'Target Sub-5m Fix' : summary.coverage_pct >= 40 ? 'Degraded Fix' : 'No Fix (>15m)'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="bg-space-800 p-2.5 rounded-lg border border-space-700/60">
            <div className="text-[10px] text-slate-400 uppercase font-medium">Sub-5m Corridor</div>
            <div className={`text-xl font-bold font-mono ${summary.coverage_pct >= 85 ? 'text-navic-green' : 'text-navic-red'}`}>
              {summary.coverage_pct}%
            </div>
            <div className="text-[9px] text-slate-500">of rescue corridor</div>
          </div>

          <div className="bg-space-800 p-2.5 rounded-lg border border-space-700/60">
            <div className="text-[10px] text-slate-400 uppercase font-medium">Avg Modeled Error</div>
            <div className="text-xl font-bold font-mono text-slate-100">
              {summary.avg_error_m} <span className="text-xs font-normal text-slate-400">m</span>
            </div>
            <div className="text-[9px] text-slate-500">Mean 3D uncertainty</div>
          </div>
        </div>
      </div>

      {/* Mode Comparison Card */}
      <div className="p-3 rounded-lg bg-space-900/70 border border-space-700/60 text-xs space-y-2">
        <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-navic-cyan" />
          <span>Active Mode Impact</span>
        </div>

        <div className="text-[11px] text-slate-400">
          {mode === 'baseline' && (
            <p className="text-red-400/90 leading-relaxed">
              ⚠️ <strong className="text-red-300">Mode 01 (Baseline):</strong> 3 active NavIC satellites + mountain horizon shadow leaves rank-deficient GᵀG (4×4). Complete loss of fix across valley floor.
            </p>
          )}
          {mode === 'pseudolite' && (
            <p className="text-emerald-400/90 leading-relaxed">
              ✅ <strong className="text-emerald-300">Mode 02 (Pseudolite):</strong> Drone beacon anchored on SAR dry ridge transmits local pseudorange → restores 4th matrix row. High-precision fix across rescue paths.
            </p>
          )}
          {mode === 'barometer' && (
            <p className="text-amber-400/90 leading-relaxed">
              🛡️ <strong className="text-amber-300">Mode 03 (Barometer):</strong> Barometric pressure & Bhuvan Cartosat-1 DEM clamp the altitude row (G_alt), restoring vertical fix when beacon LoS is blocked.
            </p>
          )}
        </div>
      </div>

      {/* Draggable Pseudolite Drone Controls */}
      <div className="p-3.5 rounded-xl border border-space-700/80 bg-space-900/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Radio className="w-4 h-4 text-navic-orange" />
            <span>Tethered Drone Beacon</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
            SAR Dry Ridge
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
            <span>Tether Height ($h_p$):</span>
            <span className="font-mono font-bold text-navic-cyan">{beacon.height_m} m</span>
          </div>
          <input
            type="range"
            min="10"
            max="150"
            step="5"
            value={beacon.height_m}
            onChange={(e) => onChangeBeaconHeight(Number(e.target.value))}
            className="w-full accent-navic-orange bg-space-700 rounded-lg h-1.5 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
            <span>10 m (Tower)</span>
            <span>80 m (Optimal)</span>
            <span>150 m (High Drone)</span>
          </div>
        </div>

        <div className="pt-1 border-t border-space-700/60">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
            <span>Range Error (σ_UERE):</span>
            <span className="font-mono text-slate-200">{uereM.toFixed(1)} m</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="5.0"
            step="0.5"
            value={uereM}
            onChange={(e) => onChangeUere(Number(e.target.value))}
            className="w-full accent-navic-cyan bg-space-700 rounded-lg h-1.5 cursor-pointer"
          />
        </div>
      </div>

      {/* Selected Cell Inspector */}
      {selectedCell && (
        <div className="p-3 rounded-lg bg-space-900/90 border border-space-700/80 text-xs space-y-1.5">
          <div className="flex items-center justify-between font-semibold text-slate-200">
            <span>Inspected Coordinate</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
              selectedCell.is_flooded ? 'bg-blue-950 text-blue-400 border border-blue-500/30' : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
            }`}>
              {selectedCell.is_flooded ? `Flooded (${selectedCell.flood_depth_m}m)` : 'Dry Ground'}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Lat: {selectedCell.lat.toFixed(4)}° · Lon: {selectedCell.lon.toFixed(4)}°
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1 border-t border-space-700/60 font-mono">
            <div>Elevation: <strong className="text-slate-200">{selectedCell.elevation_m}m</strong></div>
            <div>GDOP: <strong className={selectedCell.gdop ? 'text-navic-green' : 'text-red-400'}>{selectedCell.gdop || 'N/A'}</strong></div>
            <div>Visible Sats: <strong className="text-slate-200">{selectedCell.visible_sats}</strong></div>
            <div>Expected Error: <strong className={selectedCell.error_m <= 5 ? 'text-navic-green' : 'text-red-400'}>{selectedCell.error_m}m</strong></div>
          </div>
        </div>
      )}

      {/* 24-Hour Positioning Error Chart */}
      <div className="flex-1 min-h-[220px] p-3 rounded-xl border border-space-700/80 bg-space-900/80 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300">24-Hour Diurnal Error (Meters)</span>
          <span className="text-[9px] text-slate-500">Mode 01 vs 02 vs 03</span>
        </div>
        <div className="flex-1 w-full min-h-[160px]">
          <TimeseriesChart data={timeseriesData} />
        </div>
      </div>

      {/* Required Engineering Honesty Disclaimer */}
      <div className="p-2.5 rounded-lg bg-space-900/60 border border-space-700/40 text-[10px] text-slate-400 leading-tight">
        <strong className="text-slate-300">Prototype Disclaimer:</strong> Modeled routes are computational estimates based on EOS-04 SAR & Cartosat-1 DEM. Physical pseudolite deployment requires RF licensing and local hardware clock synchronization.
      </div>
    </aside>
  );
}
