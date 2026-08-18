"use client";
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TickData } from '@/types/simulation';

interface TelemetryChartsProps {
  ticksHistory: TickData[];
  currentTick: number;
}

export default function TelemetryCharts({ ticksHistory, currentTick }: TelemetryChartsProps) {
  const data = ticksHistory.filter(t => t.tick <= Math.ceil(currentTick)).map(t => ({
    tick: t.tick,
    activeIncidents: t.state_summary.active_incidents_count || 0,
    busyUnits: t.state_summary.busy_units || 0
  }));

  return (
    <div className="absolute left-6 top-6 w-96 bg-slate-900/90 backdrop-blur-md rounded-xl p-4 border border-slate-700 shadow-2xl z-40">
      <h2 className="text-white font-bold mb-4 text-sm flex items-center justify-between">
        <span>Global Telemetry</span>
        <span className="text-cyan-400 font-mono text-xs">Live Ticks</span>
      </h2>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="tick" stroke="#64748b" fontSize={10} />
            <YAxis yAxisId="left" stroke="#ef4444" fontSize={10} />
            <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" fontSize={10} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Line yAxisId="left" type="stepAfter" dataKey="activeIncidents" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line yAxisId="right" type="stepAfter" dataKey="busyUnits" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {data.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-slate-800 rounded p-2 text-center">
            <div className="text-slate-400 text-xs">Active Incidents</div>
            <div className="text-red-400 text-xl font-mono font-bold">{data[data.length-1].activeIncidents}</div>
          </div>
          <div className="bg-slate-800 rounded p-2 text-center">
            <div className="text-slate-400 text-xs">Busy Units</div>
            <div className="text-cyan-400 text-xl font-mono font-bold">{data[data.length-1].busyUnits}</div>
          </div>
        </div>
      )}
    </div>
  );
}
