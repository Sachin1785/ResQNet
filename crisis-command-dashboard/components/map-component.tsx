"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import DeckGL from "@deck.gl/react";
import { ScatterplotLayer, PathLayer, TextLayer } from "@deck.gl/layers";
import MapLibreMap from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { fetchRoadGeometry } from "@/lib/routing";

interface MapComponentProps {
  incidents: Array<{
    id: number;
    title: string;
    location: { lat: number; lng: number };
    severity: "critical" | "high" | "medium" | "low";
    status: string;
    responders: string[];
    reportCount?: number;
  }>;
  selectedIncident: any | null;
  selectedPersonnel: any | null;
  personnel: Array<{
    id: number;
    name: string;
    location: { lat: number; lng: number } | null;
    status: "on-scene" | "en-route" | "responding" | "available";
    assignedIncident: number | null;
    role: string;
  }>;
  resources?: Array<{
    id: number;
    name: string;
    type: string;
    status: string;
    location: { lat: number; lng: number } | null;
    assigned_incident_id?: number;
  }>;
  isLocationPickerActive?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}

const CARTO_LIGHT_STYLE = {
  version: 8,
  sources: {
    "carto-voyager": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "&copy; CARTO &copy; OpenStreetMap",
    },
  },
  layers: [
    {
      id: "carto-voyager-layer",
      type: "raster",
      source: "carto-voyager",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

const SEVERITY_COLORS: Record<string, [number, number, number]> = {
  critical: [220, 38, 38], // Vivid Red
  high: [234, 88, 12],     // Vibrant Orange
  medium: [202, 138, 4],    // Deep Gold
  low: [22, 163, 74],       // Emerald Green
};

const STATUS_COLORS: Record<string, [number, number, number]> = {
  "on-scene": [5, 150, 105],  // Emerald
  "responding": [217, 119, 6], // Deep Amber
  "en-route": [217, 119, 6],   // Deep Amber
  "available": [37, 99, 235],  // Royal Blue
};

export default function MapComponent({
  incidents,
  selectedIncident,
  selectedPersonnel,
  personnel,
  resources = [],
  isLocationPickerActive,
  onMapClick,
}: MapComponentProps) {
  // Default camera center (detect from incidents or Mumbai fallback)
  const defaultCenter = useMemo(() => {
    if (incidents.length > 0 && incidents[0]?.location?.lat) {
      return { longitude: incidents[0].location.lng, latitude: incidents[0].location.lat };
    }
    return { longitude: 72.83, latitude: 19.06 };
  }, [incidents]);

  const [viewState, setViewState] = useState({
    longitude: defaultCenter.longitude,
    latitude: defaultCenter.latitude,
    zoom: 12.5,
    pitch: 25,
    bearing: 0,
  });

  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    object: any;
    type: "incident" | "person" | "resource" | "route";
  } | null>(null);

  // Road geometry cache state: routeKey -> [lng, lat][]
  const [roadGeometries, setRoadGeometries] = useState<Record<string, [number, number][]>>({});

  // Auto-center camera when selection changes
  useEffect(() => {
    if (selectedIncident?.location?.lat) {
      setViewState((prev) => ({
        ...prev,
        longitude: selectedIncident.location.lng,
        latitude: selectedIncident.location.lat,
        zoom: 15,
        transitionDuration: 800,
      } as any));
    } else if (selectedPersonnel?.location?.lat) {
      setViewState((prev) => ({
        ...prev,
        longitude: selectedPersonnel.location.lng,
        latitude: selectedPersonnel.location.lat,
        zoom: 15,
        transitionDuration: 800,
      } as any));
    }
  }, [selectedIncident, selectedPersonnel]);

  // Fetch actual turn-by-turn road geometry for each assigned responder
  useEffect(() => {
    let isCancelled = false;

    const incidentMap = new globalThis.Map<number, { lat: number; lng: number }>();
    incidents.forEach((inc) => {
      if (inc.location?.lat && inc.location?.lng) {
        incidentMap.set(inc.id, { lat: inc.location.lat, lng: inc.location.lng });
      }
    });

    const fetchAllRoutes = async () => {
      const updates: Record<string, [number, number][]> = {};

      for (const person of personnel) {
        if (person.assignedIncident && person.location?.lat && person.location?.lng) {
          const target = incidentMap.get(person.assignedIncident);
          if (target) {
            const key = `person-${person.id}-${person.assignedIncident}`;
            const coords = await fetchRoadGeometry(
              [person.location.lng, person.location.lat],
              [target.lng, target.lat]
            );
            if (!isCancelled) {
              updates[key] = coords;
            }
          }
        }
      }

      for (const res of resources) {
        if (res.assigned_incident_id && res.location?.lat && res.location?.lng) {
          const target = incidentMap.get(res.assigned_incident_id);
          if (target) {
            const key = `res-${res.id}-${res.assigned_incident_id}`;
            const coords = await fetchRoadGeometry(
              [res.location.lng, res.location.lat],
              [target.lng, target.lat]
            );
            if (!isCancelled) {
              updates[key] = coords;
            }
          }
        }
      }

      if (!isCancelled && Object.keys(updates).length > 0) {
        setRoadGeometries((prev) => ({ ...prev, ...updates }));
      }
    };

    fetchAllRoutes();

    return () => {
      isCancelled = true;
    };
  }, [incidents, personnel, resources]);

  // Compute active dispatch routes (Paths connecting responders to their assigned incidents)
  const dispatchRoutes = useMemo(() => {
    const routes: Array<{
      id: string;
      responderName: string;
      role: string;
      incidentTitle: string;
      severity: string;
      path: [number, number][];
      color: [number, number, number];
    }> = [];

    const incidentMap = new globalThis.Map<number, { lat: number; lng: number; title: string; severity: string }>();
    incidents.forEach((inc) => {
      if (inc.location?.lat && inc.location?.lng) {
        incidentMap.set(inc.id, {
          lat: inc.location.lat,
          lng: inc.location.lng,
          title: inc.title,
          severity: inc.severity,
        });
      }
    });

    // 1. Routes from assigned personnel to incidents
    personnel.forEach((person) => {
      if (person.assignedIncident && person.location?.lat && person.location?.lng) {
        const target = incidentMap.get(person.assignedIncident);
        if (target) {
          const routeKey = `person-${person.id}-${person.assignedIncident}`;
          const roadPath = roadGeometries[routeKey] || [
            [person.location.lng, person.location.lat],
            [target.lng, target.lat],
          ];

          routes.push({
            id: `route-${routeKey}`,
            responderName: person.name,
            role: person.role,
            incidentTitle: target.title,
            severity: target.severity,
            path: roadPath,
            color: [37, 99, 235], // Rich Royal Blue for personnel road route
          });
        }
      }
    });

    // 2. Routes from assigned resources/equipment to incidents
    resources.forEach((res) => {
      if (res.assigned_incident_id && res.location?.lat && res.location?.lng) {
        const target = incidentMap.get(res.assigned_incident_id);
        if (target) {
          const routeKey = `res-${res.id}-${res.assigned_incident_id}`;
          const roadPath = roadGeometries[routeKey] || [
            [res.location.lng, res.location.lat],
            [target.lng, target.lat],
          ];

          routes.push({
            id: `route-${routeKey}`,
            responderName: res.name,
            role: res.type,
            incidentTitle: target.title,
            severity: target.severity,
            path: roadPath,
            color: [219, 39, 119], // Deep Pink for equipment route
          });
        }
      }
    });

    return routes;
  }, [incidents, personnel, resources, roadGeometries]);

  // Valid personnel with locations
  const activePersonnel = useMemo(() => {
    return personnel.filter((p) => p.location?.lat && p.location?.lng);
  }, [personnel]);

  // Valid resources with locations
  const activeResources = useMemo(() => {
    return resources.filter((r) => r.location?.lat && r.location?.lng);
  }, [resources]);

  // Handle map click (including location picker support)
  const handleClick = useCallback(
    (info: any) => {
      if (onMapClick && info.coordinate) {
        onMapClick(info.coordinate[1], info.coordinate[0]);
      }
    },
    [onMapClick]
  );

  const layers = [
    // 1. Dispatch Path Layer (Turn-by-turn road snapping lines)
    new PathLayer({
      id: "live-dispatch-routes",
      data: dispatchRoutes,
      pickable: true,
      widthUnits: "pixels",
      getPath: (d: any) => d.path,
      getColor: (d: any) => [...d.color, 240],
      getWidth: (d: any) => (selectedIncident?.id || selectedPersonnel?.id ? 5 : 4),
      dashJustified: true,
      onHover: (info) =>
        setHoverInfo(
          info.object ? { x: info.x, y: info.y, object: info.object, type: "route" } : null
        ),
    }),

    // 2. Incident Halo Layer (Urgency Rings for Critical Incidents)
    new ScatterplotLayer({
      id: "incident-halos",
      data: incidents.filter((inc) => inc.location?.lat && inc.location?.lng),
      pickable: false,
      radiusUnits: "pixels",
      getPosition: (d: any) => [d.location.lng, d.location.lat],
      getRadius: (d: any) => (d.severity === "critical" || d.id === selectedIncident?.id ? 24 : 16),
      getFillColor: (d: any) => [
        ...(SEVERITY_COLORS[d.severity] || [220, 38, 38]),
        d.id === selectedIncident?.id ? 100 : 40,
      ],
      stroked: true,
      getLineColor: (d: any) => [...(SEVERITY_COLORS[d.severity] || [220, 38, 38]), 200],
      getLineWidth: 2,
    }),

    // 3. Incident Core Scatterplot Layer
    new ScatterplotLayer({
      id: "incidents-core",
      data: incidents.filter((inc) => inc.location?.lat && inc.location?.lng),
      pickable: true,
      radiusUnits: "pixels",
      getPosition: (d: any) => [d.location.lng, d.location.lat],
      getRadius: (d: any) => (d.id === selectedIncident?.id ? 13 : 10),
      getFillColor: (d: any) => [...(SEVERITY_COLORS[d.severity] || [220, 38, 38]), 255],
      stroked: true,
      getLineColor: [255, 255, 255, 255],
      getLineWidth: 2,
      onHover: (info) =>
        setHoverInfo(
          info.object ? { x: info.x, y: info.y, object: info.object, type: "incident" } : null
        ),
    }),

    // 4. Incident Labels Text Layer
    new TextLayer({
      id: "incident-labels",
      data: incidents.filter((inc) => inc.location?.lat && inc.location?.lng),
      pickable: false,
      getPosition: (d: any) => [d.location.lng, d.location.lat],
      getText: (d: any) => d.title.substring(0, 18),
      getSize: 11,
      getColor: [15, 23, 42, 255],
      getAngle: 0,
      getTextAnchor: "middle",
      getAlignmentBaseline: "bottom",
      getPixelOffset: [0, -16],
      backgroundColor: [255, 255, 255, 230],
      backgroundPadding: [5, 2],
      fontWeight: "bold",
    }),

    // 5. Personnel Scatterplot Layer
    new ScatterplotLayer({
      id: "personnel-markers",
      data: activePersonnel,
      pickable: true,
      radiusUnits: "pixels",
      getPosition: (d: any) => [d.location.lng, d.location.lat],
      getRadius: (d: any) => (d.id === selectedPersonnel?.id ? 14 : 11),
      getFillColor: (d: any) => [...(STATUS_COLORS[d.status] || [37, 99, 235]), 255],
      stroked: true,
      getLineColor: [255, 255, 255, 255],
      getLineWidth: 2,
      onHover: (info) =>
        setHoverInfo(
          info.object ? { x: info.x, y: info.y, object: info.object, type: "person" } : null
        ),
    }),

    // 6. Personnel Initials Text Layer
    new TextLayer({
      id: "personnel-initials",
      data: activePersonnel,
      pickable: false,
      getPosition: (d: any) => [d.location.lng, d.location.lat],
      getText: (d: any) => d.name.charAt(0).toUpperCase(),
      getSize: 11,
      getColor: [255, 255, 255, 255],
      getTextAnchor: "middle",
      getAlignmentBaseline: "center",
      fontWeight: "bold",
    }),

    // 7. Equipment & Resources Scatterplot Layer
    new ScatterplotLayer({
      id: "resource-markers",
      data: activeResources,
      pickable: true,
      radiusUnits: "pixels",
      getPosition: (d: any) => [d.location.lng, d.location.lat],
      getRadius: 8,
      getFillColor: [147, 51, 234, 240], // Vibrant Purple
      stroked: true,
      getLineColor: [255, 255, 255, 240],
      getLineWidth: 1.5,
      onHover: (info) =>
        setHoverInfo(
          info.object ? { x: info.x, y: info.y, object: info.object, type: "resource" } : null
        ),
    }),
  ];

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-100">
      <DeckGL
        viewState={viewState}
        onViewStateChange={(e: any) => setViewState(e.viewState)}
        controller={true}
        layers={layers}
        onClick={handleClick}
        getCursor={() => (isLocationPickerActive ? "crosshair" : "grab")}
      >
        <MapLibreMap mapStyle={CARTO_LIGHT_STYLE as any} />
      </DeckGL>

      {/* Floating HUD: Route / Legend summary */}
      <div className="absolute top-4 left-4 pointer-events-none z-10 flex flex-col gap-2">
        {dispatchRoutes.length > 0 && (
          <div className="bg-slate-900/90 backdrop-blur-md border border-blue-500/40 rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-2 text-xs font-mono text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span>
              {dispatchRoutes.length} ACTIVE DISPATCH ROUTE{dispatchRoutes.length > 1 ? "S" : ""}
              {dispatchRoutes.length > 0 && (
                <span className="text-slate-400 font-sans ml-1 text-[11px]">
                  ({dispatchRoutes.filter((r) => r.id.startsWith("route-person")).length} Responders, {dispatchRoutes.filter((r) => r.id.startsWith("route-res")).length} Vehicles)
                </span>
              )}
            </span>
          </div>
        )}
        {isLocationPickerActive && (
          <div className="bg-amber-900/90 backdrop-blur-md border border-amber-500 rounded-lg px-3 py-2 shadow-lg text-xs text-amber-200 animate-pulse">
            📍 Click anywhere on the map to set resource coordinates
          </div>
        )}
      </div>

      {/* Interactive Tooltip Card */}
      {hoverInfo && (
        <div
          className="absolute z-50 pointer-events-none bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white rounded-lg p-3 shadow-2xl text-xs max-w-xs transition-all"
          style={{ left: hoverInfo.x + 12, top: hoverInfo.y + 12 }}
        >
          {hoverInfo.type === "incident" && (
            <div>
              <div className="font-bold text-sm text-white mb-1">
                {hoverInfo.object.title}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                  style={{
                    backgroundColor: `rgba(${SEVERITY_COLORS[hoverInfo.object.severity]?.join(",") || "220,38,38"}, 0.3)`,
                    color: `rgb(${SEVERITY_COLORS[hoverInfo.object.severity]?.join(",") || "220,38,38"})`,
                  }}
                >
                  {hoverInfo.object.severity}
                </span>
                <span className="text-slate-300 capitalize">{hoverInfo.object.status}</span>
              </div>
              <div className="text-slate-300">
                Responders:{" "}
                <span className="font-semibold text-cyan-400">
                  {hoverInfo.object.responders?.length || 0}
                </span>
              </div>
              {hoverInfo.object.reportCount > 1 && (
                <div className="mt-1 text-amber-400 font-bold text-[10px]">
                  ⚠️ {hoverInfo.object.reportCount} Merged Citizen Reports
                </div>
              )}
            </div>
          )}

          {hoverInfo.type === "person" && (
            <div>
              <div className="font-bold text-sm text-white">{hoverInfo.object.name}</div>
              <div className="text-slate-400 text-[11px] mb-1.5">{hoverInfo.object.role}</div>
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: `rgb(${STATUS_COLORS[hoverInfo.object.status]?.join(",") || "37,99,235"})`,
                  }}
                />
                <span className="capitalize font-semibold text-slate-200">
                  {hoverInfo.object.status}
                </span>
              </div>
              {hoverInfo.object.assignedIncident && (
                <div className="mt-2 text-[10px] text-cyan-300 border-t border-slate-700/60 pt-1">
                  En route to Incident #{hoverInfo.object.assignedIncident}
                </div>
              )}
            </div>
          )}

          {hoverInfo.type === "route" && (
            <div>
              <div className="font-bold text-xs text-cyan-400 mb-0.5">Active Road Route</div>
              <div className="text-white font-medium">{hoverInfo.object.responderName} ({hoverInfo.object.role})</div>
              <div className="text-slate-300 text-[10px] mt-1">
                Destination: <span className="text-white font-semibold">{hoverInfo.object.incidentTitle}</span>
              </div>
            </div>
          )}

          {hoverInfo.type === "resource" && (
            <div>
              <div className="font-bold text-sm text-purple-300">{hoverInfo.object.name}</div>
              <div className="text-slate-400 text-[11px]">{hoverInfo.object.type}</div>
              <div className="text-slate-300 capitalize mt-1">Status: {hoverInfo.object.status}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
