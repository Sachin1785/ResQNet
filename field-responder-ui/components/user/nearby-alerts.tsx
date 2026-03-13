"use client"

import { useState, useEffect } from "react"
import { Filter, MapPin, Clock, AlertCircle, Loader2 } from "lucide-react"
import UserMap from "./user-map"
import { incidentsAPI, resourcesAPI, alertsAPI } from "@/lib/api"
import { useWebSocket } from "@/hooks/use-websocket"

export default function NearbyAlerts() {
    const [selectedFilter, setSelectedFilter] = useState<string>("all")
    const [alerts, setAlerts] = useState<any[]>([])
    const [resources, setResources] = useState<any[]>([])
    const [zones, setZones] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

    const { on, isConnected } = useWebSocket({
        autoConnect: true,
        onConnect: () => console.log('NearbyAlerts connected to WebSocket'),
    })

    const filters = [
        { id: "all", label: "All" },
        { id: "fire", label: "Fire" },
        { id: "medical", label: "Medical" },
        { id: "police", label: "Police" },
        { id: "accident", label: "Accident" },
    ]

    // Calculate distance between two points using Haversine formula
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371 // Radius of the Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180
        const dLon = (lon2 - lon1) * Math.PI / 180
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const distance = R * c // Distance in km
        return distance
    }

    const formatDistance = (distanceKm: number): string => {
        if (distanceKm < 1) {
            return `${Math.round(distanceKm * 1000)}m`
        } else if (distanceKm < 10) {
            return `${distanceKm.toFixed(1)}km`
        } else {
            return `${Math.round(distanceKm)}km`
        }
    }

    // Fetch alerts (incidents)
    const fetchData = async () => {
        try {
            setLoading(true)
            
            // Parallel fetch for speed
            const [params, incidentsRes, resourcesRes, zonesRes] = await Promise.all([
                 Promise.resolve(), // Just to keep structure if needed
                 incidentsAPI.getAll(),
                 resourcesAPI.getPublic(),
                 alertsAPI.getZones(true)
            ])

            if (incidentsRes.success) {
                const activeIncidents = incidentsRes.incidents.filter((inc: any) => inc.status !== 'resolved' && inc.status !== 'closed')
                const formattedAlerts = activeIncidents.map((inc: any) => {
                    const distance = userLocation
                        ? calculateDistance(userLocation.lat, userLocation.lng, inc.lat, inc.lng)
                        : null

                    return {
                        id: inc.id,
                        type: inc.type.charAt(0).toUpperCase() + inc.type.slice(1),
                        location: inc.location_name || `${inc.lat.toFixed(4)}, ${inc.lng.toFixed(4)}`,
                        distance: distance !== null ? formatDistance(distance) : "Calculating...",
                        distanceKm: distance,
                        time: formatTime(inc.created_at),
                        severity: inc.severity,
                        status: inc.status.charAt(0).toUpperCase() + inc.status.slice(1),
                        details: inc.description,
                        lat: inc.lat,
                        lng: inc.lng
                    }
                })

                // Filter incidents within 50km and sort by distance
                const nearbyAlerts = formattedAlerts
                    .filter((alert: any) => alert.distanceKm === null || alert.distanceKm <= 50)
                    .sort((a: any, b: any) => {
                        if (a.distanceKm === null) return 1
                        if (b.distanceKm === null) return -1
                        return a.distanceKm - b.distanceKm
                    })

                setAlerts(nearbyAlerts)
            }

            if (resourcesRes.success) {
                setResources(resourcesRes.resources)
            }

            if (zonesRes.success) {
                setZones(zonesRes.zones)
            }

        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setLoading(false)
        }
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

        if (diffMinutes < 1) return "Just now"
        if (diffMinutes < 60) return `${diffMinutes} min ago`
        return `${Math.floor(diffMinutes / 60)}h ago`
    }

    useEffect(() => {
        // Get user location first
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                },
                (error) => {
                    console.error("Error getting location:", error)
                    // Fallback to Delhi
                    setUserLocation({ lat: 28.6139, lng: 77.2090 })
                }
            )
        } else {
            // Fallback to Delhi
            setUserLocation({ lat: 28.6139, lng: 77.2090 })
        }
    }, [])

    useEffect(() => {
        // Fetch data once we have user location
        if (userLocation) {
            fetchData()
        }
    }, [userLocation])

    useEffect(() => {
        if (!isConnected) return

        const handleIncidentUpdate = (data: any) => {
            console.log("WebSocket incident update:", data)
            // Refresh the entire list
            fetchData()
        }

        on('incident_updated', handleIncidentUpdate)
        on('incident_created', handleIncidentUpdate)
        on('resource_updated', fetchData) // Refresh if resources change


        return () => {
            // cleanup is handled by hook
        }
    }, [isConnected, on, userLocation])

    const getSeverityColor = (severity: string) => {
        switch (severity.toLowerCase()) {
            case "high":
            case "critical": return "bg-red-500"
            case "medium":
            case "warning": return "bg-orange-500"
            case "low":
            case "info": return "bg-yellow-500"
            default: return "bg-gray-500"
        }
    }

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "active":
            case "new": return "text-red-500"
            case "responding":
            case "on-scene": return "text-orange-500"
            case "resolved":
            case "closed": return "text-green-500"
            default: return "text-gray-500"
        }
    }

    const filteredAlerts = selectedFilter === "all"
        ? alerts
        : alerts.filter(a => a.type.toLowerCase() === selectedFilter.toLowerCase())

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden pb-16">
            {/* Header */}
            <div className="gradient-header border-b border-border px-4 py-6">
                <h1 className="text-2xl font-bold mb-1">Nearby Alerts</h1>
                <p className="text-sm text-muted-foreground">Stay informed about incidents in your area</p>
            </div>

            {/* Map with Incidents */}
            <div className="relative h-[250px] bg-muted/30 border-b border-border">
                {loading || !userLocation ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <UserMap incidents={filteredAlerts} resources={resources} zones={zones} />
                )}
            </div>

            {/* Filters */}
            <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    {filters.map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => setSelectedFilter(filter.id)}
                            className={`
                px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap
                transition-all duration-300 ios-press
                ${selectedFilter === filter.id
                                    ? "bg-primary text-primary-foreground shadow-apple"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                }
              `}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Alerts List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-50">
                        <Loader2 className="w-10 h-10 animate-spin mb-4" />
                        <p className="text-sm">Fetching active alerts...</p>
                    </div>
                ) : filteredAlerts.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-muted-foreground">No active alerts found nearby.</p>
                    </div>
                ) : (
                    filteredAlerts.map((alert) => (
                        <div
                            key={alert.id}
                            className="card-elevated rounded-2xl p-4 shadow-apple border border-border/50 hover:border-primary/30 transition-all"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)} animate-pulse`} />
                                    <h3 className="font-bold text-base text-foreground">{alert.type}</h3>
                                </div>
                                <span className={`text-xs font-semibold ${getStatusColor(alert.status)}`}>
                                    {alert.status}
                                </span>
                            </div>

                            {/* Details */}
                            <p className="text-sm text-muted-foreground mb-3">{alert.details}</p>

                            {/* Meta Info */}
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <MapPin className="w-3 h-3" />
                                        <span className="font-semibold">{alert.distance}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        <span>{alert.time}</span>
                                    </div>
                                </div>
                                <button className="text-primary font-semibold">View Details</button>
                            </div>

                            {/* Location */}
                            <div className="mt-3 pt-3 border-t border-border/50">
                                <p className="text-xs text-muted-foreground">{alert.location}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Safety Banner */}
            {!loading && filteredAlerts.length === 0 && (
                <div className="px-4 pb-4">
                    <div className="glass-strong rounded-xl p-3 border border-primary/30 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-4 h-4 text-success" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-semibold text-foreground">You're Safe</p>
                            <p className="text-xs text-muted-foreground">No active alerts in your immediate area</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}


