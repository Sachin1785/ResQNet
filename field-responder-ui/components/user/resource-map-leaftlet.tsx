"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css" 
import { Home, Heart, Droplet, User } from "lucide-react"
import { renderToStaticMarkup } from 'react-dom/server';

interface ResourceMapProps {
    resources: any[]
}

// Custom icons function
const createIcon = (icon: any, color: string) => {
    return  L.divIcon({
        className: 'custom-icon',
        html: `<div class="w-8 h-8 rounded-full ${color} border-2 border-white shadow-lg flex items-center justify-center text-white">
            ${renderToStaticMarkup(icon)}
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    })
}

const icons = {
    shelter: createIcon(<Home size={16} />, 'bg-orange-500'),
    medical: createIcon(<Heart size={16} />, 'bg-red-500'),
    food_water: createIcon(<Droplet size={16} />, 'bg-blue-500'),
    default: createIcon(<User size={16} />, 'bg-gray-500'),
    user: L.divIcon({
        className: 'user-location-pulse',
        html: `<div class="relative">
            <div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg z-10 relative"></div>
            <div class="absolute top-0 left-0 w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-75"></div>
        </div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    })
}

// User location updater
function UserLocationMarker() {
    const [position, setPosition] = useState<L.LatLngExpression | null>(null)
    const map = useMap()

    useEffect(() => {
        map.locate().on("locationfound", function (e) {
            setPosition(e.latlng)
            map.flyTo(e.latlng, map.getZoom())
        })
    }, [map])

    return position === null ? null : (
        <Marker position={position} icon={icons.user}>
            <Popup>You are here</Popup>
        </Marker>
    )
}

export default function ResourceMap({ resources }: ResourceMapProps) {
    // Default center (Mumbai roughly based on seed data)
    const [center] = useState<[number, number]>([19.0760, 72.8777])

    return (
        <MapContainer 
            center={center} 
            zoom={14} 
            style={{ height: "100%", width: "100%", zIndex: 0 }}
            zoomControl={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            
            <UserLocationMarker />

```tsx
            {resources.map((res) => (
                <Marker 
                    key={res.id} 
                    position={[res.lat, res.lng]}
                    icon={icons[res.type as keyof typeof icons] || icons.default}
                >
                    <Popup>
                        <div className="p-1">
                            <div className="font-bold text-sm mb-1 text-white">{res.name}</div>
                            <div className="text-xs text-white capitalize mb-1">{res.type.replace('_', ' ')}</div>
                            {res.distance && (
                                <div className="text-[10px] font-bold text-primary mb-1">
                                    {res.distance.toFixed(1)} km away
                                </div>
                            )}
                            <div className="text-xs">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                                    res.status === 'deployed' || res.status === 'active' 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-gray-100 text-gray-700'
                                }`}>
                                    {res.status}
                                </span>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    )
}
