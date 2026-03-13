"use client"

import { useEffect, useRef, useState } from "react"
import { Navigation, Clock } from "lucide-react"

interface MapSectionProps {
  activeIncident?: any
}

export default function MapSection({ activeIncident }: MapSectionProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const [isClient, setIsClient] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string }>({
    distance: "---",
    duration: "---"
  })

  useEffect(() => {
    setIsClient(true)

    // Get user's actual location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error("Geolocation error:", error)
          // Fallback to default location
          setUserLocation({ lat: 28.6292, lng: 77.2295 })
        }
      )
    } else {
      // Fallback if geolocation not supported
      setUserLocation({ lat: 28.6292, lng: 77.2295 })
    }
  }, [])

  useEffect(() => {
    if (!mapContainer.current || !isClient || map.current || !userLocation) return

    // Dynamically import Leaflet only on the client side
    const initMap = async () => {
      // Import Leaflet and its CSS
      const L = (await import("leaflet")).default
      await import("leaflet/dist/leaflet.css")
      await import("leaflet-routing-machine")
      await import("leaflet-routing-machine/dist/leaflet-routing-machine.css")

      // Use actual user location and incident location
      const destLat = activeIncident?.lat || userLocation.lat
      const destLng = activeIncident?.lng || userLocation.lng
      const startLat = userLocation.lat
      const startLng = userLocation.lng

      // Initialize map centered on transition between start and end
      map.current = L.map(mapContainer.current!).setView([(startLat + destLat) / 2, (startLng + destLng) / 2], 13)

      // Add modern tile layer
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap contributors &copy; CartoDB",
        maxZoom: 19,
      }).addTo(map.current)

      // Custom icons
      const startIcon = L.divIcon({
        html: `
          <div class="flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-lg border-3 border-[#007aff]">
            <div class="w-3 h-3 bg-[#007aff] rounded-full"></div>
          </div>
        `,
        className: "",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      })

      const endIcon = L.divIcon({
        html: `
          <div class="flex items-center justify-center w-12 h-12 bg-[#ff3b30] rounded-full shadow-xl border-3 border-white animate-pulse">
            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z"/>
            </svg>
          </div>
        `,
        className: "",
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      })

      // Add routing control
      const routing = (L as any).Routing.control({
        waypoints: [
          L.latLng(startLat, startLng),
          L.latLng(destLat, destLng),
        ],
        lineOptions: {
          styles: [
            {
              color: "#007aff",
              opacity: 0.9,
              weight: 6,
            },
          ],
          extendToWaypoints: true,
          missingRouteTolerance: 0,
        },
        createMarker: function (i: number, waypoint: any, n: number) {
          const marker = L.marker(waypoint.latLng, {
            icon: i === 0 ? startIcon : endIcon,
            draggable: false,
          })

          if (i === 0) {
            marker.bindPopup("<strong>Your Location</strong>")
          } else {
            marker.bindPopup(`<strong>Incident Site</strong><br/>${activeIncident?.type || 'Emergency'} - ${activeIncident?.location_name || 'Active Zone'}`)
          }

          return marker
        },
        routeWhileDragging: false,
        addWaypoints: false,
        show: false,
        fitSelectedRoutes: true,
      }).addTo(map.current)

      // Listen for route calculation
      routing.on('routesfound', function (e: any) {
        const routes = e.routes
        const summary = routes[0].summary

        // Calculate distance in km
        const distanceKm = (summary.totalDistance / 1000).toFixed(1)
        const distanceStr = distanceKm === "0.0" ? `${summary.totalDistance.toFixed(0)}m` : `${distanceKm}km`

        // Calculate duration in minutes
        const durationMin = Math.ceil(summary.totalTime / 60)
        const durationStr = durationMin < 60 ? `${durationMin}min` : `${Math.floor(durationMin / 60)}h ${durationMin % 60}min`

        setRouteInfo({
          distance: distanceStr,
          duration: durationStr
        })
      })

      // Hide the routing control container
      const routingContainer = document.querySelector(".leaflet-routing-container")
      if (routingContainer) {
        ; (routingContainer as HTMLElement).style.display = "none"
      }
    }

    initMap()

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [isClient, activeIncident, userLocation])

  return (
    <div className="w-full h-full relative z-0">
      <div ref={mapContainer} className="w-full h-full" />

      {/* ETA and Distance Overlay */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        {/* Distance Card */}
        <div className="glass-strong rounded-xl px-3 py-2 shadow-apple-lg border border-border/50 min-w-[100px]">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Navigation className="w-3.5 h-3.5 text-primary" />
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">Distance</span>
          </div>
          <div className="text-xl font-bold text-foreground">{routeInfo.distance}</div>
        </div>

        {/* ETA Card */}
        <div className="glass-strong rounded-xl px-3 py-2 shadow-apple-lg border border-border/50 min-w-[100px]">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Clock className="w-3.5 h-3.5 text-success" />
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">ETA</span>
          </div>
          <div className="text-xl font-bold text-success">{routeInfo.duration}</div>
        </div>
      </div>
    </div>
  )
}

