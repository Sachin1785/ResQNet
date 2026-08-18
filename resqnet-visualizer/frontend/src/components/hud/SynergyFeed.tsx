"use client";
import React from 'react';
import { TickData } from '@/types/simulation';

interface SynergyFeedProps {
  ticksHistory: TickData[];
  currentTick: number;
}

export default function SynergyFeed({ ticksHistory, currentTick }: SynergyFeedProps) {
  // Get all synergy dispatches up to current tick
  const synergyEvents = ticksHistory
    .filter(t => t.tick <= currentTick)
    .flatMap(t => t.dispatches.map(d => ({...d, tick: t.tick})))
    .filter(d => d.synergy_bundle)
    .reverse()
    .slice(0, 10); // keep last 10
    
  return (
    <div className="absolute right-6 top-24 w-80 flex flex-col gap-3 z-40">
      {synergyEvents.map((evt, i) => (
        <div key={`${evt.unit_id}-${evt.incident_id}-${evt.tick}`} 
             className="bg-amber-900/80 backdrop-blur-md border border-amber-500/50 p-3 rounded-lg shadow-xl shadow-amber-900/20 text-white animate-in slide-in-from-right-4 fade-in">
          <div className="text-amber-400 font-black text-xs mb-1 flex items-center gap-2">
            <span>⚡ SYNERGY BONUS</span>
            <span className="text-amber-200/50 ml-auto">Tick {evt.tick}</span>
          </div>
          <p className="text-sm text-amber-50 leading-tight">
            Synchronized Task Force deployed! {evt.unit_type} <b>{evt.unit_id}</b> bound for {evt.incident_type} <b>{evt.incident_id}</b>.
          </p>
        </div>
      ))}
    </div>
  );
}
