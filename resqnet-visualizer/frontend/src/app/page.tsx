"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSimulationStream } from "@/hooks/useSimulationStream";
import { useAnimationTimer } from "@/hooks/useAnimationTimer";
import TimelineScrubber from "@/components/controls/TimelineScrubber";
import SynergyFeed from "@/components/hud/SynergyFeed";
import TelemetryCharts from "@/components/hud/TelemetryCharts";
import MapLegend from "@/components/hud/MapLegend";

const DeckGLMap = dynamic(() => import("@/components/map/DeckGLMap"), { ssr: false });

export default function Dashboard() {
  const { ticksHistory, isConnected, error } = useSimulationStream();
  const currentTickRef = useRef<number>(0);
  
  const maxTick = ticksHistory.length > 0 ? ticksHistory[ticksHistory.length - 1].tick : 0;
  const minTick = ticksHistory.length > 0 ? ticksHistory[0].tick : 0;
  
  const currentTick = useAnimationTimer(true, 1.0, maxTick, currentTickRef);

  useEffect(() => {
    // Jump to the live edge when first receiving data
    if (ticksHistory.length === 1) {
      currentTickRef.current = minTick;
    }
  }, [ticksHistory.length, minTick]);

  return (
    <main className="w-screen h-screen overflow-hidden bg-slate-950 relative">
      <DeckGLMap 
        currentTickTime={currentTick} 
        ticksHistory={ticksHistory} 
      />
      
      <TelemetryCharts 
        ticksHistory={ticksHistory} 
        currentTick={currentTick} 
      />
      
      <SynergyFeed 
        ticksHistory={ticksHistory} 
        currentTick={currentTick} 
      />
      
      <MapLegend />

      {/* Live Sync HUD */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md rounded-full px-6 py-2 border border-slate-700 shadow-2xl flex items-center gap-4 z-50 text-white font-mono text-sm tracking-widest">
        <span className="text-cyan-400 font-bold">LIVE STREAM</span>
        <span className="text-slate-400">|</span>
        <span>TICK {currentTick.toFixed(1)}</span>
      </div>
      
      {/* Top Right Status Badge */}
      <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
        {error && (
          <div className="bg-red-900/80 text-red-200 px-3 py-1 rounded-full text-xs font-bold border border-red-500">
            {error}
          </div>
        )}
        <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 ${isConnected ? 'bg-emerald-900/80 text-emerald-200 border-emerald-500' : 'bg-slate-800 text-slate-400 border-slate-600'}`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          {isConnected ? 'CONNECTED' : 'CONNECTING...'}
        </div>
      </div>
    </main>
  );
}
