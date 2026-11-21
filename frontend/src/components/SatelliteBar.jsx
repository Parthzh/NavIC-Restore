import React from 'react';
import { Satellite, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';

export default function SatelliteBar({ satellites, onToggleSatellite, onResetConstellation, onSimulateDegraded }) {
  const activeCount = satellites.filter(s => s.active).length;

  return (
    <div className="bg-space-800/80 border-b border-space-700/60 px-4 py-2 flex items-center justify-between text-xs select-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <Satellite className="w-3.5 h-3.5 text-navic-cyan" />
          <span>NavIC Constellation:</span>
          <span className={`font-mono font-bold px-1.5 py-0.2 rounded text-[11px] ${
            activeCount >= 4 ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' : 'bg-red-950/60 text-red-400 border border-red-500/30'
          }`}>
            {activeCount} / {satellites.length} Active
          </span>
        </div>

        {/* Individual Satellite Kill-Switches */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {satellites.map(sat => {
            return (
              <button
                key={sat.id}
                onClick={() => onToggleSatellite(sat.id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md border font-mono transition-all ${
                  sat.active
                    ? 'bg-space-900 border-space-600 text-slate-200 hover:border-navic-cyan'
                    : 'bg-red-950/20 border-red-900/40 text-red-400/60 line-through'
                }`}
                title={`${sat.name} · Az: ${sat.azimuth_deg}° · El: ${sat.elevation_deg}° · Click to toggle satellite on/off`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${sat.active ? 'bg-navic-green animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[11px] font-semibold">{sat.id}</span>
                <span className="text-[9px] text-slate-400">{sat.elevation_deg}°</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Constellation Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSimulateDegraded}
          className="px-2.5 py-1 rounded bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-600/40 text-[11px] font-medium transition-all"
          title="Simulate acute 3-satellite Himalayan degraded state"
        >
          Simulate 3-Sat Degradation
        </button>
        <button
          onClick={onResetConstellation}
          className="p-1 rounded bg-space-700/60 hover:bg-space-600 text-slate-300 transition-colors"
          title="Reset Constellation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
