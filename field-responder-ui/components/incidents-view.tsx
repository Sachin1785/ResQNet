"use client"

import { useState, useEffect } from "react"
import { Search, Filter, MapPin, Clock, AlertTriangle, Flame, Users as UsersIcon, CheckCircle2, Loader2 } from "lucide-react"
import { cn, calculateDistance } from "@/lib/utils"
import { incidentsAPI, personnelAPI } from "@/lib/api"
import { useWebSocket } from "@/hooks/use-websocket"

export default function IncidentsView() {
    const [incidents, setIncidents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [isAssigning, setIsAssigning] = useState(false)
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

    const { on, isConnected } = useWebSocket({
        autoConnect: true,
        onConnect: () => console.log('IncidentsView connected to WebSocket'),
    })


    const fetchIncidents = async () => {
        try {
            setLoading(true)
            const response = await incidentsAPI.getAll()
            if (response.success) {
                let currentLat = userLocation?.lat
                let currentLng = userLocation?.lng

                if (!currentLat && navigator.geolocation) {
                    // Try to get one-time location for distance calc if not already set
                    navigator.geolocation.getCurrentPosition((pos) => {
                        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                    })
                }

                const formatted = response.incidents.map((inc: any) => {
                    let distanceStr = "---"
                    if (userLocation) {
                        const dist = calculateDistance(userLocation.lat, userLocation.lng, inc.lat, inc.lng)
                        distanceStr = dist < 1 ? `${(dist * 1000).toFixed(0)}m` : `${dist.toFixed(1)}km`
                    }

                    return {
                        id: `FR-${inc.id}`,
                        type: inc.title || `${inc.type.charAt(0).toUpperCase() + inc.type.slice(1)} Emergency`,
                        location: inc.location_name || `${inc.lat.toFixed(4)}, ${inc.lng.toFixed(4)}`,
                        priority: inc.severity === 'high' || inc.severity === 'critical' ? 'high' : inc.severity === 'medium' ? 'medium' : 'low',
                        status: inc.status.toLowerCase(),
                        time: new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        victims: inc.victims || 0,
                        distance: distanceStr,
                        severity: inc.description,
                        reportCount: inc.report_count || 1,
                        verified: inc.is_verified
                    }
                })
                setIncidents(formatted)
            }
        } catch (error) {
            console.error("Error fetching incidents:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchIncidents()
    }, [userLocation])

    useEffect(() => {
        if (!isConnected) return

        const refresh = () => fetchIncidents()
        on('incident_updated', refresh)
        on('incident_created', refresh)

        return () => { }
    }, [isConnected, on])

    const filteredIncidents = incidents.filter(inc =>
        inc.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.location.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const stats = {
        active: incidents.filter(i => i.status === 'active' || i.status === 'responding').length,
        pending: incidents.filter(i => i.status === 'new' || i.status === 'dispatched').length,
        done: incidents.filter(i => i.status === 'resolved' || i.status === 'completed').length
    }

    return (
        <div className="flex flex-col h-full bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border">
                <div className="px-4 py-4">
                    <h1 className="text-2xl font-bold mb-4">Incidents</h1>

                    {/* Search and Filter */}
                    <div className="flex gap-2 mb-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search incidents..."
                                className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            />
                        </div>
                        <button className="px-4 py-2.5 bg-muted/50 border border-border rounded-xl hover:bg-muted transition-all">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
                            <div className="text-xs text-muted-foreground">Active</div>
                            <div className="text-lg font-bold text-accent">{stats.active}</div>
                        </div>
                        <div className="bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
                            <div className="text-xs text-muted-foreground">Pending</div>
                            <div className="text-lg font-bold text-orange-600">{stats.pending}</div>
                        </div>
                        <div className="bg-success/10 border border-success/20 rounded-lg px-3 py-2">
                            <div className="text-xs text-muted-foreground">Done</div>
                            <div className="text-lg font-bold text-success">{stats.done}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Incidents List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-50">
                        <Loader2 className="w-10 h-10 animate-spin mb-4" />
                        <p className="text-sm">Loading incidents...</p>
                    </div>
                ) : filteredIncidents.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-muted-foreground">No incidents found.</p>
                    </div>
                ) : (
                    filteredIncidents.map((incident) => (
                        <div
                            key={incident.id}
                            className={cn(
                                "bg-card border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98]",
                                incident.priority === "high" && "border-accent/30 bg-accent/5",
                                incident.priority === "medium" && "border-orange-500/30 bg-orange-500/5",
                                (incident.status === "completed" || incident.status === "resolved") && "opacity-60"
                            )}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-mono text-muted-foreground">{incident.id}</span>
                                        {incident.priority === "high" && (
                                            <span className="px-2 py-0.5 bg-accent/20 text-accent text-[10px] font-semibold rounded-full">
                                                HIGH PRIORITY
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-base">{incident.type}</h3>
                                    {incident.verified === 1 && (
                                        <div className="mt-1 flex items-center gap-1.5 w-fit bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                                            <div className="bg-blue-500 rounded-full p-0.5">
                                                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                            </div>
                                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-wide uppercase">AI Verified</span>
                                        </div>
                                    )}
                                    {incident.verified === -1 && (
                                        <div className="mt-1 flex items-center gap-1.5 w-fit bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                                            <div className="bg-red-500 rounded-full p-0.5">
                                                <AlertTriangle className="w-2.5 h-2.5 text-white" />
                                            </div>
                                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 tracking-wide uppercase">Potential Fake</span>
                                        </div>
                                    )}
                                </div>

                                {(incident.status === "active" || incident.status === "responding" || incident.status === "on-scene") && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-success/20 text-success rounded-full">
                                        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                                        <span className="text-xs font-medium">Active</span>
                                    </div>
                                )}
                                {(incident.status === "completed" || incident.status === "resolved") && (
                                    <CheckCircle2 className="w-5 h-5 text-success" />
                                )}
                            </div>

                            {/* Location */}
                            <div className="flex items-start gap-2 mb-2">
                                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-muted-foreground">{incident.location}</span>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">{incident.time}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">{incident.distance}</span>
                                </div>
                                {incident.victims > 0 && (
                                    <div className="flex items-center gap-2">
                                        <UsersIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">{incident.victims} victims</span>
                                    </div>
                                )}
                                {incident.reportCount > 1 && (
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                                            {incident.reportCount}
                                        </div>
                                        <span className="text-xs font-medium text-primary">Reports</span>
                                    </div>
                                )}
                            </div>

                            {/* Severity */}
                            <div className="flex items-center gap-2 pt-2 border-t border-border">
                                <AlertTriangle className={cn(
                                    "w-4 h-4",
                                    incident.priority === "high" && "text-accent",
                                    incident.priority === "medium" && "text-orange-500",
                                    incident.priority === "low" && "text-yellow-500"
                                )} />
                                <span className="text-xs font-medium truncate flex-1">{incident.severity}</span>

                                {incident.status === 'active' && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleAcceptMission(parseInt(incident.id.replace('FR-', '')))
                                        }}
                                        disabled={isAssigning}
                                        className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-all shadow-sm flex items-center gap-1"
                                    >
                                        {isAssigning ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                        Accept Mission
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )

    async function handleAcceptMission(incidentId: number) {
        try {
            setIsAssigning(true)

            // Get current user from localStorage
            const userStr = localStorage.getItem('currentUser')
            if (!userStr) {
                alert("Please login first")
                return
            }

            const currentUser = JSON.parse(userStr)

            // Check if personnel record exists for this user
            try {
                // Find personnel record by USER ID
                let personnelRecord;
                try {
                    const pResponse = await personnelAPI.getByUserId(currentUser.id)
                    if (pResponse.success) {
                        personnelRecord = pResponse.personnel
                    }
                } catch (e) { }

                if (!personnelRecord) {
                    alert("Personnel record not found. Please contact dispatch to set up your profile.")
                    setIsAssigning(false)
                    return
                }

                const response = await personnelAPI.assign(personnelRecord.id, incidentId)

                if (response.success) {
                    // Refresh list
                    fetchIncidents()
                    alert("Mission Accepted! Head to the Mission tab for details.")
                }
            } catch (assignError: any) {
                // If 404, it means no personnel record exists yet
                if (assignError.message?.includes('404')) {
                    alert("Personnel record not found. Please contact dispatch to set up your profile.")
                } else {
                    throw assignError
                }
            }
        } catch (error) {
            console.error("Error accepting mission:", error)
            alert("Failed to accept mission. Please try again.")
        } finally {
            setIsAssigning(false)
        }
    }
}


