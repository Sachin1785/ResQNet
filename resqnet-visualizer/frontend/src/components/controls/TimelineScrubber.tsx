"use client";
import React from 'react';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';

interface TimelineScrubberProps {
  currentTickTime: number;
  minTick: number;
  maxTick: number;
  isPlaying: boolean;
  speed: number;
  onPlayPause: () => void;
  onScrub: (val: number) => void;
  onSpeedChange: (val: number) => void;
}

export default function TimelineScrubber({
  currentTickTime, minTick, maxTick, isPlaying, speed, onPlayPause, onScrub, onSpeedChange
}: TimelineScrubberProps) {
  
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[800px] bg-slate-900/90 backdrop-blur-md rounded-xl p-4 border border-slate-700 shadow-2xl flex flex-col gap-2 z-50 text-white">
      <div className="flex items-center justify-between text-xs font-mono text-slate-400">
        <span>Tick: {currentTickTime.toFixed(2)}</span>
        <span>Max: {maxTick}</span>
      </div>
      
      <input 
        type="range" 
        min={minTick} 
        max={maxTick} 
        step={0.01}
        value={currentTickTime}
        onChange={(e) => onScrub(parseFloat(e.target.value))}
        className="w-full cursor-pointer accent-cyan-500"
      />
      
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <button onClick={() => onScrub(Math.max(minTick, currentTickTime - 1))} className="p-2 hover:bg-slate-800 rounded">
            <SkipBack size={18} />
          </button>
          <button onClick={onPlayPause} className="p-3 bg-cyan-600 hover:bg-cyan-500 rounded-full text-white shadow-lg shadow-cyan-900/50">
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
          </button>
          <button onClick={() => onScrub(Math.min(maxTick, currentTickTime + 1))} className="p-2 hover:bg-slate-800 rounded">
            <SkipForward size={18} />
          </button>
        </div>
        
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
          {[0.5, 1.0, 2.0, 5.0].map(s => (
            <button 
              key={s} 
              onClick={() => onSpeedChange(s)}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${speed === s ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
