"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, Crosshair } from "lucide-react"

interface LocationPickerProps {
    initialLocation?: { lat: number; lng: number }
    onChange: (location: { lat: number; lng: number }) => void
}

export default function LocationPicker({ initialLocation, onChange }: LocationPickerProps) {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<any>(null)
    const marker = useRef<any>(null)
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    const defaultLoc = initialLocation || { lat: 28.6139, lng: 77.2090 }

    useEffect(() => {
        if (!mapContainer.current || !isClient || map.current) return

        const initMap = async () => {
            const L = (await import("leaflet")).default
            await import("leaflet/dist/leaflet.css")

            map.current = L.map(mapContainer.current!).setView([defaultLoc.lat, defaultLoc.lng], 15)

            L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
                attribution: "&copy; OpenStreetMap contributors &copy; CartoDB",
                maxZoom: 19,
            }).addTo(map.current)

            const icon = L.divIcon({
                html: `
                    <div class="flex items-center justify-center w-10 h-10 bg-primary rounded-full shadow-lg border-2 border-white">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                `,
                className: "",
                iconSize: [40, 40],
                iconAnchor: [20, 40],
            })

            marker.current = L.marker([defaultLoc.lat, defaultLoc.lng], { 
                icon,
                draggable: true 
            }).addTo(map.current)

            marker.current.on('dragend', () => {
                const position = marker.current.getLatLng()
                onChange({ lat: position.lat, lng: position.lng })
            })

            map.current.on('click', (e: any) => {
                const { lat, lng } = e.latlng
                marker.current.setLatLng([lat, lng])
                onChange({ lat, lng })
            })
        }

        initMap()

        return () => {
            if (map.current) {
                map.current.remove()
                map.current = null
            }
        }
    }, [isClient])

    // Update marker if initialLocation changes (e.g., from manual input or GPS)
    useEffect(() => {
        if (map.current && marker.current && initialLocation) {
            const currentPos = marker.current.getLatLng()
            if (currentPos.lat !== initialLocation.lat || currentPos.lng !== initialLocation.lng) {
                marker.current.setLatLng([initialLocation.lat, initialLocation.lng])
                map.current.panTo([initialLocation.lat, initialLocation.lng])
            }
        }
    }, [initialLocation])

    return (
        <div className="relative w-full h-full rounded-xl overflow-hidden shadow-inner border border-border">
            <div ref={mapContainer} className="w-full h-full z-0" />
            <div className="absolute top-2 right-2 z-[400] bg-background/80 backdrop-blur-sm p-1.5 rounded-lg border border-border shadow-sm pointer-events-none">
                <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Select Location
                </p>
            </div>
        </div>
    )
}
