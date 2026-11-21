import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';

export default function TimeseriesChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="text-xs text-slate-500 flex items-center justify-center h-full">Loading timeseries...</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
        <XAxis
          dataKey="time"
          stroke="#475569"
          fontSize={10}
          tickLine={false}
          interval={3}
        />
        <YAxis
          stroke="#475569"
          fontSize={10}
          tickLine={false}
          domain={[0, 30]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#0c1222',
            borderColor: '#1e294b',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#f8fafc'
          }}
          formatter={(value, name) => {
            const labels = {
              mode01_baseline: 'Mode 01 Baseline',
              mode02_pseudolite: 'Mode 02 Pseudolite',
              mode03_barometer: 'Mode 03 Failsafe'
            };
            return [`${value} m`, labels[name] || name];
          }}
        />
        <ReferenceLine y={5.0} stroke="#00E676" strokeDasharray="3 3" label={{ value: 'Sub-5m Target', fill: '#00E676', fontSize: 9 }} />
        
        {/* Mode 01: Baseline (Red) */}
        <Line
          type="monotone"
          dataKey="mode01_baseline"
          stroke="#FF1744"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        {/* Mode 02: Tethered Pseudolite (Green) */}
        <Line
          type="monotone"
          dataKey="mode02_pseudolite"
          stroke="#00E676"
          strokeWidth={2.5}
          dot={false}
          isAnimationActive={false}
        />
        {/* Mode 03: Barometer Fallback (Amber) */}
        <Line
          type="monotone"
          dataKey="mode03_barometer"
          stroke="#FFA000"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
