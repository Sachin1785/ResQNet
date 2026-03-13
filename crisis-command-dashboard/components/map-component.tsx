"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface MapComponentProps {
  incidents: Array<{
    id: number
    title: string
    location: { lat: number; lng: number }
    severity: "critical" | "high" | "medium" | "low"
    status: string
    responders: string[]
  }>
  selectedIncident: any | null
  selectedPersonnel: any | null
  personnel: Array<{
    id: number
    name: string
    location: { lat: number; lng: number } | null
    status: "on-scene" | "en-route" | "available"
    assignedIncident: number | null
    role: string
  }>
  resources?: Array<{
    id: number
    name: string
    type: string
    status: string
    location: { lat: number; lng: number } | null
    assigned_incident_id?: number
  }>
  isLocationPickerActive?: boolean
  onMapClick?: (lat: number, lng: number) => void
}

export default function MapComponent({ incidents, selectedIncident, selectedPersonnel, personnel, resources, isLocationPickerActive, onMapClick }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Record<number, L.Marker>>({})
  const personnelMarkersRef = useRef<Record<number, L.Marker>>({})
  const resourceMarkersRef = useRef<Record<number, L.Marker>>({})

  const prevSelectedIdRef = useRef<number | null>(null)
  const prevSelectedPersonnelIdRef = useRef<number | null>(null)
  const mapInitializedRef = useRef(false)

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map("map", {
        center: [incidents[0]?.location.lat || 28.6139, incidents[0]?.location.lng || 77.2090],
        zoom: 13,
        zoomControl: true,
      })

      L.tileLayer("https://{s}.tile.osm.org/{z}/{x}/{y}.png", {
        attribution: "© OSM",
        maxZoom: 19,
      }).addTo(mapRef.current)

      mapInitializedRef.current = true
    }

    // Add cursor style class globally if needed, or handle in the MapEvents
    if (mapRef.current) {
        if (isLocationPickerActive) {
            mapRef.current.getContainer().style.cursor = 'crosshair'
        } else {
            mapRef.current.getContainer().style.cursor = ''
        }
    }
    
    // Click handler for map
    mapRef.current.off('click')
    mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
        if (onMapClick) {
            onMapClick(e.latlng.lat, e.latlng.lng)
        }
    })


    // Update incident markers
    Object.values(markersRef.current).forEach((marker) => marker.remove())
    markersRef.current = {}

    incidents.forEach((incident) => {
      const isSelected = selectedIncident?.id === incident.id
      const iconSize = isSelected ? [48, 48] : [40, 40]

      let color = "#ef4444" // critical
      if (incident.severity === "high") color = "#f97316"
      if (incident.severity === "medium") color = "#eab308"
      if (incident.severity === "low") color = "#22c55e"

      const svgIcon = `
        <svg width="${iconSize[0]}" height="${iconSize[1]}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="${color}" opacity="0.2">
            ${isSelected ? '<animate attributeName="r" values="14;18;14" dur="2s" repeatCount="indefinite" />' : ''}
          </circle>
          <circle cx="20" cy="20" r="12" fill="${color}"/>
          <circle cx="20" cy="20" r="6" fill="white"/>
        </svg>
      `

      const icon = L.divIcon({
        html: svgIcon,
        className: `incident-marker ${isSelected ? 'selected' : ''}`,
        iconSize: iconSize as [number, number],
        iconAnchor: [iconSize[0] / 2, iconSize[1] / 2],
      })

      const marker = L.marker([incident.location.lat, incident.location.lng], { icon })
        .bindPopup(`
          <div class="p-2 min-w-[200px]">
            <div class="font-bold text-lg mb-1">${incident.title}</div>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs px-2 py-0.5 rounded-full" style="background: ${color}20; color: ${color}">${incident.severity.toUpperCase()}</span>
              <span class="text-xs text-muted-foreground capitalize">${incident.status}</span>
            </div>
            <div class="text-sm text-muted-foreground italic mb-1">Personnel: ${incident.responders.length}</div>
            ${(incident as any).reportCount > 1 ? `<div class="text-xs font-bold text-red-500 mt-2">⚠️ ${(incident as any).reportCount} Merged Reports</div>` : ""}
          </div>
        `, { closeButton: false })
        .addTo(mapRef.current!)

      markersRef.current[incident.id] = marker

      // ONLY set view if the selection just changed
      if (isSelected && prevSelectedIdRef.current !== incident.id) {
        mapRef.current?.setView([incident.location.lat, incident.location.lng], 16, {
          animate: true,
          duration: 1
        })
      }
    })

    // Update personnel markers (THE REAL-TIME PLOTTING)
    Object.values(personnelMarkersRef.current).forEach((marker) => marker.remove())
    personnelMarkersRef.current = {}

    personnel.forEach((person) => {
      if (!person.location) return

      const isSelected = selectedPersonnel?.id === person.id
      let color = "#3b82f6" // blue
      let statusIcon = "🚶"
      if (person.status === "on-scene") {
        color = "#10b981" // green
        statusIcon = "📍"
      } else if (person.status === "en-route") {
        color = "#f59e0b" // amber
        statusIcon = "🚑"
      }

      const personIcon = `
        <div class="relative group">
          <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded shadow-md text-[10px] font-bold whitespace-nowrap ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity">
            ${person.name} ${isSelected ? '(FOLLOWING)' : ''}
          </div>
          <svg width="40" height="40" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="18" r="16" fill="${color}" opacity="0.2">
               ${isSelected ? '<animate attributeName="r" values="12;16;12" dur="1s" repeatCount="indefinite" />' : ''}
            </circle>
            <circle cx="18" cy="18" r="12" fill="${color}" opacity="0.4"/>
            <circle cx="18" cy="18" r="8" fill="${color}"/>
            <text x="18" y="21" font-size="10" text-anchor="middle" fill="white" font-weight="bold">${person.name[0]}</text>
          </svg>
        </div>
      `

      const icon = L.divIcon({
        html: personIcon,
        className: `personnel-marker-container ${isSelected ? 'selected' : ''}`,
        iconSize: [40, 40] as [number, number],
        iconAnchor: [20, 20],
      })

      const marker = L.marker([person.location.lat, person.location.lng], {
        icon,
        zIndexOffset: isSelected ? 2000 : 1000
      })
        .bindPopup(`
          <div class="p-2">
            <div class="font-bold">${person.name}</div>
            <div class="text-xs text-muted-foreground mb-1">${person.role}</div>
            <div class="flex items-center gap-1 mt-1">
              <div class="w-2 h-2 rounded-full" style="background: ${color}"></div>
              <span class="text-xs font-medium capitalize">${person.status}</span>
            </div>
            ${person.assignedIncident ? `<div class="text-[10px] mt-2 border-t pt-1">Assigned to Incident #${person.assignedIncident}</div>` : ""}
          </div>
        `)
        .addTo(mapRef.current!)

      personnelMarkersRef.current[person.id] = marker

      // Live follow for selected personnel
      if (isSelected) {
        mapRef.current?.setView([person.location.lat, person.location.lng], mapRef.current.getZoom(), {
          animate: true,
          duration: 0.5
        })
      }
    })

    // Update resource markers - RESTORED
    Object.values(resourceMarkersRef.current).forEach((marker) => marker.remove())
    resourceMarkersRef.current = {}

    if (resources) {
        resources.forEach((resource) => {
        if (!resource.location) return

        let color = "#8b5cf6" // purple for resources
        let iconChar = "📦" // default package

        // Customize based on type
        const type = resource.type.toLowerCase()
        if (type.includes('vehicle') || type.includes('ambulance') || type.includes('truck')) {
            color = "#ec4899" // pink
            iconChar = "🚑"
        } else if (type.includes('medical') || type.includes('kit')) {
            color = "#ef4444" // red
            iconChar = "⚕️"
        } else if (type.includes('food') || type.includes('water')) {
            color = "#0ea5e9" // sky
            iconChar = "💧"
        } else if (type.includes('shelter')) {
            color = "#f97316" // orange
            iconChar = "⛺"
        } else if (type.includes('police')) {
            color = "#1e40af" // blue
            iconChar = "👮"
        }

        const resourceIcon = `
            <div class="relative group">
            <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded shadow-md text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                ${resource.name}
            </div>
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="6" width="20" height="20" rx="4" fill="${color}" opacity="0.8" stroke="white" stroke-width="2"/>
                <text x="16" y="20" font-size="12" text-anchor="middle" fill="white">${iconChar}</text>
            </svg>
            </div>
        `

        const icon = L.divIcon({
            html: resourceIcon,
            className: `resource-marker-container`,
            iconSize: [32, 32] as [number, number],
            iconAnchor: [16, 16],
        })

        const marker = L.marker([resource.location.lat, resource.location.lng], {
            icon,
            zIndexOffset: 900 // Below personnel, above map
        })
            .bindPopup(`
            <div class="p-2">
                <div class="font-bold">${resource.name}</div>
                <div class="text-xs text-muted-foreground mb-1">${resource.type}</div>
                <div class="flex items-center gap-1 mt-1">
                <span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 capitalize">${resource.status}</span>
                </div>
                ${(resource as any).assigned_incident_id ? `<div class="text-[10px] mt-2 border-t pt-1">Assigned to Incident #${(resource as any).assigned_incident_id}</div>` : ""}
            </div>
            `)
            .addTo(mapRef.current!)

        resourceMarkersRef.current[resource.id] = marker
        })
    }

    // Fit bounds on first load if we have data
    if (!mapInitializedRef.current && (incidents.length > 0 || (resources && resources.length > 0))) {
         // Auto-fit logic could go here, but for now we trust the initial center or user nav
         // We removed the aggressive auto-fit to avoid jumping, but user can re-enable if desired
    }


    // Store current IDs for next iteration
    prevSelectedIdRef.current = selectedIncident?.id || null
    prevSelectedPersonnelIdRef.current = selectedPersonnel?.id || null

    return () => {
      // Cleanup
    }
  }, [incidents, selectedIncident, selectedPersonnel, personnel, resources, isLocationPickerActive, onMapClick])

  return <div id="map" className="w-full h-full" />
}
