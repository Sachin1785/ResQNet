"use client"

import { useState, useEffect } from "react"
import MapSection from "@/components/map-section"
import MissionHeader from "@/components/mission-header"
import MissionBriefing from "@/components/mission-briefing"
import StatusBar from "@/components/status-bar"
import ActionButtons from "@/components/action-buttons"
import { incidentsAPI, personnelAPI } from "@/lib/api"
import { useWebSocket } from "@/hooks/use-websocket"
import { Loader2 } from "lucide-react"

export default function MissionView() {
    const [activeIncident, setActiveIncident] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState<"en-route" | "arrived" | "complete">("en-route")
    const [checklist, setChecklist] = useState({
        staging: false,
        assessment: false,
        resources: false,
        victims: false,
    })
    const [missionExpanded, setMissionExpanded] = useState(false)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [personnelId, setPersonnelId] = useState<number | null>(null)

    const { on, isConnected } = useWebSocket({
        autoConnect: true,
        onConnect: () => console.log('MissionView connected to WebSocket'),
    })

    // Load current user from localStorage
    useEffect(() => {
        const userStr = localStorage.getItem('currentUser')
        if (userStr) {
            const user = JSON.parse(userStr)
            setCurrentUser(user)
        }
    }, [])

    const fetchActiveMission = async () => {
        if (!currentUser) {
            setLoading(false)
            return
        }

        try {
            setLoading(true)

            // 1. Get responder status and assignment using USER ID
            const pResponse = await personnelAPI.getByUserId(currentUser.id)
            if (pResponse.success) {
                const person = pResponse.personnel
                setPersonnelId(person.id)

                // Map backend status to UI status
                if (person.status === 'on-scene') setStatus('arrived')
                else if (person.status === 'en-route') setStatus('en-route')
                else if (person.status === 'responding') setStatus('en-route') // Default to en-route for starting

                if (person.assigned_incident_id) {
                    const iResponse = await incidentsAPI.getById(person.assigned_incident_id)
                    if (iResponse.success) {
                        setActiveIncident(iResponse.incident)
                    }
                } else {
                    setActiveIncident(null)
                }
            }
        } catch (error: any) {
            // Only log if it's NOT a 404 (404 is expected for new responders without records)
            if (!error.message?.includes('404')) {
                console.error("Error fetching active mission:", error)
            }
            setActiveIncident(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (currentUser) {
            fetchActiveMission()
        }
    }, [currentUser])

    useEffect(() => {
        if (!isConnected) return
        const refresh = () => fetchActiveMission()
        on('incident_updated', refresh)
        on('incident_created', refresh)
        on('personnel_assigned', refresh)
        return () => { }
    }, [isConnected, on])

    const handleChecklistToggle = (item: string) => {
        if (item in checklist) {
            setChecklist((prev) => ({ ...prev, [item]: !prev[item as keyof typeof checklist] }))
        }
    }

    const handleStatusChange = async (newStatus: "en-route" | "arrived" | "complete") => {
        let currentPersonnelId = personnelId

        if (!currentPersonnelId && currentUser) {
            try {
                const pResponse = await personnelAPI.getByUserId(currentUser.id)
                if (pResponse.success) {
                    currentPersonnelId = pResponse.personnel.id
                    setPersonnelId(currentPersonnelId)
                }
            } catch (e) {
                console.error("Could not find personnel record")
                return
            }
        }

        if (!currentPersonnelId) return

        try {
            // Map UI status to backend status
            const backendStatus = newStatus === 'arrived' ? 'on-scene' :
                newStatus === 'en-route' ? 'en-route' : 'available'

            setStatus(newStatus)
            await personnelAPI.updateStatus(currentPersonnelId, backendStatus)

            if (newStatus === 'complete') {
                // Clear active incident and go back to discovery or show summary
                setActiveIncident(null)
                alert("Mission completed successfully!")
            }
        } catch (error) {
            console.error("Failed to update status:", error)
        }
    }

    const handleResolveIncident = async () => {
        if (!activeIncident) return
        
        try {
            const result = await incidentsAPI.resolve(activeIncident.id)
            if (result.success && result.status === 'pending_review') {
                alert("Submitted for supervisor review. Please wait for confirmation.")
                // Update local state to show pending UI
                setActiveIncident((prev: any) => ({ ...prev, status: 'pending_review' }))
            } else if (result.success) {
                // If it was auto-resolved (e.g. low severity or config), clear it
                setActiveIncident(null)
                setStatus('complete')
                alert("Incident Resolved!")
            }
        } catch (error) {
            console.error("Failed to submit resolution:", error)
            alert("Error submitting resolution.")
        }
    }

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        )
    }

    if (!activeIncident) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Loader2 className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-bold mb-2">No Active Mission</h2>
                <p className="text-muted-foreground">You don't have any missions assigned right now. Check the incidents tab for new reports.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full w-full bg-background overflow-hidden font-sans">
            {/* Header with glassmorphism */}
            <div className="flex-shrink-0 z-40">
                <MissionHeader status={status} activeIncident={activeIncident} />
            </div>

            {/* Map section - takes remaining space above bottom sheet */}
            <div className="relative w-full flex-1 overflow-hidden">
                <MapSection activeIncident={activeIncident} />
            </div>

            {/* Mission briefing bottom sheet - positioned at bottom with peek */}
            <MissionBriefing
                isExpanded={missionExpanded}
                onToggle={() => setMissionExpanded(!missionExpanded)}
                // checklist={checklist}
                // onChecklistToggle={handleChecklistToggle}
                incident={activeIncident}
            />

            {/* Status bar with functional buttons */}
            <StatusBar status={status} onStatusChange={handleStatusChange} />

            {/* Action buttons */}
            <ActionButtons
                status={status}
                onStatusChange={handleStatusChange}
                onResolve={handleResolveIncident}
                incidentId={activeIncident?.id}
            />
        </div>
    )
}

