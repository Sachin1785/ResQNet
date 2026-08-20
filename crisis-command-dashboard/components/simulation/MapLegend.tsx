"use client";
import React from 'react';

export default function MapLegend() {
  return (
    <div className="absolute right-6 bottom-36 w-48 bg-slate-900/90 backdrop-blur-md rounded-xl p-4 border border-slate-700 shadow-2xl z-40 text-xs font-medium">
      <h3 className="text-white font-bold mb-3 uppercase tracking-wider text-slate-300">Map Legend</h3>
      
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[rgba(255,50,50,0.8)] border border-red-500"></div>
          <span className="text-slate-200">Incident (Size=Severity)</span>
        </div>
        <div className="h-px bg-slate-700 my-1"></div>
        
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-[rgb(0,255,255)] rounded-full"></div>
          <span className="text-slate-200">Ambulance</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-[rgb(255,69,0)] rounded-full"></div>
          <span className="text-slate-200">Fire Truck</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-[rgb(0,100,255)] rounded-full"></div>
          <span className="text-slate-200">Police Car</span>
        </div>
        
        <div className="h-px bg-slate-700 my-1"></div>
        
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[rgb(50,200,50)] border-2 border-black"></div>
          <span className="text-slate-200">Hospital</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[rgb(255,165,0)] border-2 border-black"></div>
          <span className="text-slate-200">Fire Station</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[rgb(50,50,255)] border-2 border-black"></div>
          <span className="text-slate-200">Police Station</span>
        </div>
      </div>
    </div>
  );
}
