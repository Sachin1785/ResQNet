"use client"

import { useState, useEffect } from "react"
import { MapPin, Phone, Radio, Clock, Navigation, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { cn, calculateDistance } from "@/lib/utils"
import { personnelAPI } from "@/lib/api"
import { useWebSocket } from "@/hooks/use-websocket"

export default function TeamView() {
    const [teamMembers, setTeamMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

    const { on, isConnected } = useWebSocket({
        autoConnect: true,
        onConnect: () => console.log('TeamView connected to WebSocket'),
    })

    const fetchTeam = async () => {
        try {
            setLoading(true)

            if (!userLocation && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                })
            }

            const response = await personnelAPI.getAll()
            if (response.success) {
                const formatted = response.personnel.map((p: any) => {
                    let distanceStr = "---"
                    if (userLocation && p.lat && p.lng) {
                        const dist = calculateDistance(userLocation.lat, userLocation.lng, p.lat, p.lng)
                        distanceStr = dist < 1 ? `${(dist * 1000).toFixed(0)}m` : `${dist.toFixed(1)}km`
                    }

                    return {
                        id: `FR-${p.id}`,
                        dbId: p.id,
                        name: p.name,
                        role: p.role,
                        status: p.status,
                        location: p.location_name || `${p.lat?.toFixed(2) || 0}, ${p.lng?.toFixed(2) || 0}`,
                        distance: distanceStr,
                        lastUpdate: formatTime(p.updated_at),
                        avatar: p.name.split(' ').map((n: any) => n[0]).join('').toUpperCase().slice(0, 2),
                        incident: p.assigned_incident_id ? `Assigned to Incident #${p.assigned_incident_id}` : null
                    }
                })
                setTeamMembers(formatted)
            }
        } catch (error) {
            console.error("Error fetching team:", error)
        } finally {
            setLoading(false)
        }
    }

    const formatTime = (dateString: string) => {
        if (!dateString) return "Long ago"
        const date = new Date(dateString)
        const now = new Date()
        const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
        if (diffMinutes < 1) return "Just now"
        if (diffMinutes < 60) return `${diffMinutes}m ago`
        return `${Math.floor(diffMinutes / 60)}h ago`
    }

    useEffect(() => {
        fetchTeam()
    }, [userLocation])

    useEffect(() => {
        if (!isConnected) return

        const refresh = () => fetchTeam()
        on('personnel_status_updated', refresh)
        on('personnel_location_updated', refresh)

        return () => { }
    }, [isConnected, on])

    const onDutyCount = teamMembers.filter(m => m.status === "on-duty" || m.status === "responding" || m.status === "on-scene").length
    const availableCount = teamMembers.filter(m => m.status === "available" || m.status === "ready").length

    return (
        <div className="flex flex-col h-full bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border">
                <div className="px-4 py-4">
                    <h1 className="text-2xl font-bold mb-4">Team</h1>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-success/10 border border-success/20 rounded-lg px-3 py-2">
                            <div className="text-xs text-muted-foreground">On Duty</div>
                            <div className="text-lg font-bold text-success">{onDutyCount}</div>
                        </div>
                        <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                            <div className="text-xs text-muted-foreground">Available</div>
                            <div className="text-lg font-bold text-primary">{availableCount}</div>
                        </div>
                        <div className="bg-muted/50 border border-border rounded-lg px-3 py-2">
                            <div className="text-xs text-muted-foreground">Total</div>
                            <div className="text-lg font-bold">{teamMembers.length}</div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                        <button className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-all active:scale-95">
                            <Radio className="w-4 h-4 inline mr-1" />
                            Broadcast
                        </button>
                        <button className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-all active:scale-95">
                            <MapPin className="w-4 h-4 inline mr-1" />
                            Map View
                        </button>
                    </div>
                </div>
            </div>

            {/* Team List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-50">
                        <Loader2 className="w-10 h-10 animate-spin mb-4" />
                        <p className="text-sm">Loading team members...</p>
                    </div>
                ) : teamMembers.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-muted-foreground">No team members found.</p>
                    </div>
                ) : (
                    teamMembers.map((member) => (
                        <div
                            key={member.id}
                            className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98]"
                        >
                            {/* Header */}
                            <div className="flex items-start gap-3 mb-3">
                                {/* Avatar */}
                                <div className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0",
                                    (member.status === "on-duty" || member.status === "responding" || member.status === "on-scene") && "bg-success/20 text-success ring-2 ring-success/30",
                                    (member.status === "available" || member.status === "ready") && "bg-primary/20 text-primary ring-2 ring-primary/30",
                                    member.status === "off-duty" && "bg-muted text-muted-foreground"
                                )}>
                                    {member.avatar}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-base truncate">{member.name}</h3>
                                        {(member.status === "on-duty" || member.status === "responding" || member.status === "on-scene") && (
                                            <div className="w-2 h-2 bg-success rounded-full animate-pulse flex-shrink-0" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                        <span>{member.role}</span>
                                        <span>•</span>
                                        <span className="font-mono">{member.id}</span>
                                    </div>
                                    <div className={cn(
                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                                        (member.status === "on-duty" || member.status === "responding" || member.status === "on-scene") && "bg-success/20 text-success",
                                        (member.status === "available" || member.status === "ready") && "bg-primary/20 text-primary",
                                        member.status === "off-duty" && "bg-muted text-muted-foreground"
                                    )}>
                                        {(member.status === "on-duty" || member.status === "responding" || member.status === "on-scene") && <CheckCircle2 className="w-3 h-3" />}
                                        {(member.status === "available" || member.status === "ready") && <CheckCircle2 className="w-3 h-3" />}
                                        {member.status === "off-duty" && <AlertCircle className="w-3 h-3" />}
                                        {member.status.toUpperCase().replace("-", " ")}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-1">
                                    <button className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all active:scale-95">
                                        <Phone className="w-4 h-4" />
                                    </button>
                                    <button className="p-2 bg-muted/50 rounded-lg hover:bg-muted transition-all active:scale-95">
                                        <Radio className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Current Incident */}
                            {member.incident && (
                                <div className="mb-3 p-2 bg-accent/5 border border-accent/20 rounded-lg">
                                    <div className="text-xs font-medium text-accent mb-1">Current Assignment</div>
                                    <div className="text-xs text-muted-foreground">{member.incident}</div>
                                </div>
                            )}

                            {/* Location & Status */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                    <span className="text-muted-foreground truncate">{member.location}</span>
                                    <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">{member.distance}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Last update: {member.lastUpdate}</span>
                                </div>
                            </div>

                            {/* Navigate Button */}
                            {(member.status === "on-duty" || member.status === "responding" || member.status === "on-scene") && (
                                <button className="w-full mt-3 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                                    <Navigation className="w-4 h-4" />
                                    Navigate to Location
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

