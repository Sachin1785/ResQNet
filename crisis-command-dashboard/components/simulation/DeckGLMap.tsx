"use client";
import React, { useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { TripsLayer } from '@deck.gl/geo-layers';
import MapLibreMap from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TickData, Waypoint } from '@/lib/simulation';

const INITIAL_VIEW_STATE = {
  longitude: 72.83,
  latitude: 19.06,
  zoom: 13,
  pitch: 45,
  bearing: 0
};

interface DeckGLMapProps {
  currentTickTime: number;
  ticksHistory: TickData[];
}

export default function DeckGLMap({ currentTickTime, ticksHistory }: DeckGLMapProps) {
  
  // Get the state closest to the current tick
  const state = useMemo(() => {
    if (ticksHistory.length === 0) return null;
    
    // Find the last state whose tick is <= currentTickTime
    let closestState = ticksHistory[0];
    for (let i = 0; i < ticksHistory.length; i++) {
      if (ticksHistory[i].tick <= currentTickTime) {
        closestState = ticksHistory[i];
      } else {
        break; // since array is chronologically ordered
      }
    }
    return closestState;
  }, [currentTickTime, ticksHistory]);

  // Aggregate all dispatches across history for the TripsLayer
  const allDispatches = useMemo(() => {
    return ticksHistory.flatMap(t => t.dispatches);
  }, [ticksHistory]);

  const layers = [
    // ACTIVE INCIDENTS
    new ScatterplotLayer({
      id: 'incidents-layer',
      data: state ? state.active_incidents : [],
      getPosition: d => [d.location.lon, d.location.lat],
      getFillColor: () => [255, 50, 50, 200],
      radiusUnits: 'pixels',
      getRadius: d => d.severity * 4,
      pickable: true,
      updateTriggers: {
        data: state?.active_incidents
      }
    }),
    
    // INFRASTRUCTURE
    new ScatterplotLayer({
      id: 'infra-layer',
      data: state ? state.infrastructure_status : [],
      getPosition: d => [d.location.lon, d.location.lat],
      getFillColor: d => {
        if (d.type === 'Hospital') return [50, 200, 50, 255];
        if (d.type === 'Fire Station') return [255, 165, 0, 255];
        return [50, 50, 255, 255];
      },
      radiusUnits: 'pixels',
      getRadius: () => 10,
      getLineColor: d => d.current_occupancy === d.max_capacity ? [255, 0, 0] : [0,0,0],
      lineWidthMinPixels: 2,
      stroked: true,
      pickable: true,
      updateTriggers: {
        data: state?.infrastructure_status
      }
    }),
    
    // VEHICLE TRAJECTORIES
    new TripsLayer({
      id: 'trips-layer',
      data: allDispatches,
      getPath: d => d.path.map((p: Waypoint) => [p.lon, p.lat]),
      getTimestamps: d => d.path.map((p: Waypoint) => p.timestamp),
      getColor: d => {
        if (d.unit_type === 'Ambulance') return [0, 255, 255];
        if (d.unit_type === 'Fire Truck') return [255, 69, 0];
        return [0, 100, 255]; // Police
      },
      opacity: 0.8,
      widthMinPixels: 4,
      trailLength: 1.5,
      currentTime: currentTickTime,
      shadowEnabled: false
    })
  ];

  return (
    <div className="relative w-full h-full">
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
      >
        <MapLibreMap
          mapStyle={{
            version: 8,
            sources: {
              'carto-dark': {
                type: 'raster',
                tiles: [
                  "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                  "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                  "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                  "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                ],
                tileSize: 256,
                attribution: '&copy; CARTO'
              }
            },
            layers: [
              {
                id: 'carto-dark-layer',
                type: 'raster',
                source: 'carto-dark',
                minzoom: 0,
                maxzoom: 22
              }
            ]
          }}
        />
      </DeckGL>
    </div>
  );
}
