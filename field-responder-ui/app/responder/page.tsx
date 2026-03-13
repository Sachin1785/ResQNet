"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import BottomNav from "@/components/bottom-nav"
import { useResponderLocation } from "@/hooks/use-responder-location"

// Responder Views
import MissionView from "@/components/mission-view"
import IncidentsView from "@/components/incidents-view"
import CommsView from "@/components/comms-view"
import TeamView from "@/components/team-view"
import ProfileView from "@/components/profile-view"

export default function ResponderPage() {
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [personnelId, setPersonnelId] = useState<number | null>(null)
    const [activeTab, setActiveTab] = useState("mission")

    // Check authentication
    useEffect(() => {
        const token = localStorage.getItem('authToken')
        const userStr = localStorage.getItem('currentUser')

        if (!token || !userStr) {
            router.push('/')
            return
        }

        const user = JSON.parse(userStr)

        // Check if user is a responder
        if (user.role !== 'responder') {
            router.push('/user')
            return
        }

        setCurrentUser(user)

        // Fetch personnel ID
        const fetchPersonnelId = async () => {
            try {
                // Determine API base URL - ensure it matches what other components use
                const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
                const response = await fetch(`${API_BASE_URL}/personnel/user/${user.id}`, {
                    headers: {
                        'ngrok-skip-browser-warning': 'true',
                    },
                });
                const data = await response.json();
                if (data.success && data.personnel) {
                    setPersonnelId(data.personnel.id);
                }
            } catch (error) {
                console.error("Failed to fetch personnel ID", error);
            }
        };
        fetchPersonnelId();

    }, [router])

    // Start location pulse with actual PERSONNEL ID
    useResponderLocation(personnelId, !!personnelId)

    const renderView = () => {
        switch (activeTab) {
            case "mission":
                return <MissionView />
            case "incidents":
                return <IncidentsView />
            case "comms":
                return <CommsView />
            case "team":
                return <TeamView />
            case "profile":
                return <ProfileView />
            default:
                return <MissionView />
        }
    }

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground w-full">
            {/* Mobile viewport container - responsive for all screen sizes */}
            <div className="flex flex-col h-screen w-full bg-background overflow-hidden max-w-[430px] mx-auto px-2">
                {/* Main content area */}
                <div className="flex-1 overflow-hidden">
                    {renderView()}
                </div>

                {/* Bottom Navigation */}
                <BottomNav activeTab={activeTab} onTabChange={setActiveTab} mode="responder" />
            </div>
        </div>
    )
}
