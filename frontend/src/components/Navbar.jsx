import React from 'react';
import { Radio, ShieldAlert, Sparkles, Satellite, BookOpen, Wifi, WifiOff } from 'lucide-react';

export default function Navbar({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  mode,
  onSelectMode,
  onOptimize,
  isOptimizing,
  isBackend,
  onOpenScience
}) {
  return (
    <header className="h-16 bg-space-800/90 border-b border-space-700/80 px-4 flex items-center justify-between backdrop-blur z-20 select-none">
      {/* Brand & Mission */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-navic-orange to-amber-600 flex items-center justify-center shadow-lg shadow-navic-orange/20">
          <Satellite className="w-6 h-6 text-white animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-wider text-white">NAVIC RESTORE</span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-space-700 text-navic-cyan border border-navic-cyan/30">
              ASTRA 2026
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Flood-Aware NavIC Satellite Augmentation · ISRO Data Portals
          </p>
        </div>
      </div>

      {/* Center Controls: Scenario & Mode Selector */}
      <div className="flex items-center gap-3">
        {/* Scenario Dropdown */}
        <div className="relative">
          <select
            value={selectedScenarioId}
            onChange={(e) => onSelectScenario(e.target.value)}
            className="bg-space-900 border border-space-600 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-navic-orange cursor-pointer"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                📍 {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Operating Modes Toggle (The 3 Core Pitch Modes) */}
        <div className="flex bg-space-900/90 p-1 rounded-lg border border-space-700 text-xs">
          <button
            onClick={() => onSelectMode('baseline')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              mode === 'baseline'
                ? 'bg-navic-red/20 text-navic-red border border-navic-red/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Mode 01: Degraded 3-4 NavIC satellites with mountain shadow (High GDOP / No Fix)"
          >
            Mode 01 · Baseline
          </button>
          <button
            onClick={() => onSelectMode('pseudolite')}
            className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              mode === 'pseudolite'
                ? 'bg-navic-green/20 text-navic-green border border-navic-green/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Mode 02: Tethered Drone Pseudolite anchored on SAR-verified dry ground (Sub-5m Fix)"
          >
            <Radio className="w-3.5 h-3.5 text-navic-green" />
            Mode 02 · Pseudolite
          </button>
          <button
            onClick={() => onSelectMode('barometer')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              mode === 'barometer'
                ? 'bg-navic-amber/20 text-navic-amber border border-navic-amber/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Mode 03: Failsafe Barometer + Cartosat-1 DEM altitude clamp"
          >
            Mode 03 · Failsafe
          </button>
        </div>

        {/* One-Click Auto-Optimize Button */}
        <button
          onClick={onOptimize}
          disabled={isOptimizing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-navic-orange text-space-900 font-semibold text-xs hover:brightness-110 active:scale-95 transition-all shadow-md shadow-navic-orange/20"
          title="Algorithmically find optimal dry-ridge staging point (Omega_Dry ∩ Omega_LoS)"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isOptimizing ? 'Optimizing...' : 'Auto-Optimize Beacon'}</span>
        </button>
      </div>

      {/* Right Controls: Engine Status & Science Modal Button */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenScience}
          className="p-1.5 rounded-lg bg-space-700/60 hover:bg-space-600 text-slate-300 hover:text-white border border-space-600/50 transition-colors"
          title="About & ISRO Research Benchmarks"
        >
          <BookOpen className="w-4 h-4" />
        </button>

        <div
          className={`flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded border ${
            isBackend
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
              : 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30'
          }`}
          title={isBackend ? 'Connected to FastAPI Backend' : 'Running High-Performance Standalone Math Engine'}
        >
          {isBackend ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span className="hidden md:inline">{isBackend ? 'FastAPI Live' : 'Standalone Math Engine'}</span>
        </div>
      </div>
    </header>
  );
}
