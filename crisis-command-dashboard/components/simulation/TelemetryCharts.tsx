"use client";
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TickData } from '@/lib/simulation';
import { BarChart3, Activity, Zap, Shield, HeartPulse, Truck, Building2, Radio } from 'lucide-react';

interface TelemetryChartsProps {
  ticksHistory: TickData[];
  currentTick: number;
  className?: string;
}

export default function TelemetryCharts({ ticksHistory, currentTick, className = "" }: TelemetryChartsProps) {
  const data = ticksHistory.filter(t => t.tick <= Math.ceil(currentTick)).map(t => ({
    tick: t.tick,
    activeIncidents: t.state_summary?.active_incidents_count || 0,
    busyUnits: t.state_summary?.busy_units || 0
  }));

  const latestState = ticksHistory.length > 0 ? ticksHistory[ticksHistory.length - 1] : null;

  // Compute exact vehicle fleet usage from dispatches
  const fleetStats = useMemo(() => {
    if (!latestState) return { amb: { inUse: 0, total: 10 }, fir: { inUse: 0, total: 10 }, pol: { inUse: 0, total: 10 } };
    const dispatches = latestState.dispatches || [];
    const busyAmb = new Set(dispatches.filter(d => d.unit_id.startsWith('Amb') || d.unit_type.toLowerCase().includes('amb')).map(d => d.unit_id)).size;
    const busyFir = new Set(dispatches.filter(d => d.unit_id.startsWith('Fir') || d.unit_type.toLowerCase().includes('fir')).map(d => d.unit_id)).size;
    const busyPol = new Set(dispatches.filter(d => d.unit_id.startsWith('Pol') || d.unit_type.toLowerCase().includes('pol')).map(d => d.unit_id)).size;

    return {
      amb: { inUse: busyAmb, total: 10 },
      fir: { inUse: busyFir, total: 10 },
      pol: { inUse: busyPol, total: 10 }
    };
  }, [latestState]);

  // Facilities list
  const facilities = useMemo(() => {
    if (!latestState || !latestState.infrastructure_status) return [];
    return latestState.infrastructure_status.map((hub) => {
      const occ = hub.current_occupancy || 0;
      const cap = hub.max_capacity || 5;
      const pct = Math.min(100, Math.round((occ / cap) * 100));
      return {
        id: hub.id,
        name: hub.name,
        type: hub.type,
        occupancy: occ,
        capacity: cap,
        available: Math.max(0, cap - occ),
        percentage: pct,
      };
    });
  }, [latestState]);

  return (
    <div className={`p-4 space-y-4 overflow-y-auto h-full ${className}`}>
      {/* 1. Live Engine Telemetry Chart Card */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary animate-pulse" />
            <h2 className="font-bold text-sm text-foreground">GNN Simulation Telemetry</h2>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
            Tick {currentTick.toFixed(1)}
          </span>
        </div>

        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="tick" stroke="#64748b" fontSize={10} />
              <YAxis yAxisId="left" stroke="#ef4444" fontSize={10} />
              <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" fontSize={10} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
              />
              <Line yAxisId="left" name="Incidents" type="stepAfter" dataKey="activeIncidents" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line yAxisId="right" name="Busy Units" type="stepAfter" dataKey="busyUnits" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {data.length > 0 && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-muted/50 border border-border/50 rounded-xl p-2 text-center">
              <div className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Active Incidents</div>
              <div className="text-red-500 text-lg font-mono font-bold">{data[data.length-1].activeIncidents}</div>
            </div>
            <div className="bg-muted/50 border border-border/50 rounded-xl p-2 text-center">
              <div className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Dispatched Units</div>
              <div className="text-cyan-500 text-lg font-mono font-bold">{data[data.length-1].busyUnits} / 30</div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Mobile Vehicle Fleets Exact Numbers Card */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
        <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-primary" />
            Vehicle Fleet Status
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">30 Units Total</span>
        </h3>

        <div className="space-y-3 text-xs">
          {/* Ambulances */}
          <div className="bg-muted/30 border border-border/40 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5 text-foreground">
                <HeartPulse className="w-3.5 h-3.5 text-red-500" />
                Ambulance Medical Fleet
              </span>
              <span className="font-mono font-bold text-foreground">
                <span className="text-red-500">{fleetStats.amb.inUse} In Use</span>
                <span className="text-muted-foreground"> / {fleetStats.amb.total - fleetStats.amb.inUse} Avail</span>
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden flex">
              <div 
                className="bg-red-500 h-full transition-all duration-300"
                style={{ width: `${(fleetStats.amb.inUse / fleetStats.amb.total) * 100}%` }}
              />
              <div 
                className="bg-emerald-500/40 h-full transition-all duration-300"
                style={{ width: `${((fleetStats.amb.total - fleetStats.amb.inUse) / fleetStats.amb.total) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>Deployed: {fleetStats.amb.inUse}</span>
              <span>Available: {fleetStats.amb.total - fleetStats.amb.inUse} / {fleetStats.amb.total}</span>
            </div>
          </div>

          {/* Fire Trucks */}
          <div className="bg-muted/30 border border-border/40 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5 text-foreground">
                <Zap className="w-3.5 h-3.5 text-orange-500" />
                Fire Engine Squadrons
              </span>
              <span className="font-mono font-bold text-foreground">
                <span className="text-orange-500">{fleetStats.fir.inUse} In Use</span>
                <span className="text-muted-foreground"> / {fleetStats.fir.total - fleetStats.fir.inUse} Avail</span>
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden flex">
              <div 
                className="bg-orange-500 h-full transition-all duration-300"
                style={{ width: `${(fleetStats.fir.inUse / fleetStats.fir.total) * 100}%` }}
              />
              <div 
                className="bg-emerald-500/40 h-full transition-all duration-300"
                style={{ width: `${((fleetStats.fir.total - fleetStats.fir.inUse) / fleetStats.fir.total) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>Deployed: {fleetStats.fir.inUse}</span>
              <span>Available: {fleetStats.fir.total - fleetStats.fir.inUse} / {fleetStats.fir.total}</span>
            </div>
          </div>

          {/* Police Cars */}
          <div className="bg-muted/30 border border-border/40 rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5 text-foreground">
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                Police Cruiser Patrols
              </span>
              <span className="font-mono font-bold text-foreground">
                <span className="text-blue-500">{fleetStats.pol.inUse} In Use</span>
                <span className="text-muted-foreground"> / {fleetStats.pol.total - fleetStats.pol.inUse} Avail</span>
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden flex">
              <div 
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${(fleetStats.pol.inUse / fleetStats.pol.total) * 100}%` }}
              />
              <div 
                className="bg-emerald-500/40 h-full transition-all duration-300"
                style={{ width: `${((fleetStats.pol.total - fleetStats.pol.inUse) / fleetStats.pol.total) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>Deployed: {fleetStats.pol.inUse}</span>
              <span>Available: {fleetStats.pol.total - fleetStats.pol.inUse} / {fleetStats.pol.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Stationary Facilities & Hubs Capacity Detail Card */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
        <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            Stationary Hubs & Facility Capacity
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">{facilities.length} Facilities</span>
        </h3>

        <div className="space-y-2.5 text-xs">
          {facilities.map((fac) => (
            <div key={fac.id} className="p-2.5 rounded-xl border border-border/50 bg-muted/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: fac.percentage >= 80 ? '#ef4444' : fac.percentage >= 50 ? '#f59e0b' : '#10b981' }} />
                  {fac.name}
                </div>
                <span className="text-[10px] uppercase font-bold font-mono px-1.5 py-0.5 rounded bg-muted">
                  {fac.type}
                </span>
              </div>

              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-muted-foreground">
                  Occupancy: <b className="text-foreground">{fac.occupancy}</b> / {fac.capacity}
                </span>
                <span className={fac.available === 0 ? "text-red-500 font-bold" : "text-emerald-500 font-semibold"}>
                  {fac.available === 0 ? "AT MAX CAPACITY" : `${fac.available} Slots Free (${fac.percentage}%)`}
                </span>
              </div>

              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    fac.percentage >= 80 ? 'bg-red-500' : fac.percentage >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.max(4, fac.percentage)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
