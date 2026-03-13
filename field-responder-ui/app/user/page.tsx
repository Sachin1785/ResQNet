"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import BottomNav from "@/components/bottom-nav"

// User Views
import UserHome from "@/components/user/user-home"
import ReportIncident from "@/components/user/report-incident"
import NearbyAlerts from "@/components/user/nearby-alerts"
import ResourcesView from "@/components/user/resources-view"
import UserProfile from "@/components/user/user-profile"
import SafetyGuide from "@/components/user/safety-guide"

export default function UserPage() {
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [activeTab, setActiveTab] = useState("home")
    const [preSelectedType, setPreSelectedType] = useState<string | undefined>(undefined)
    const [activeIncident, setActiveIncident] = useState<any>(null)

    // Check authentication
    useEffect(() => {
        const token = localStorage.getItem('authToken')
        const userStr = localStorage.getItem('currentUser')

        if (!token || !userStr) {
            router.push('/')
            return
        }

        const user = JSON.parse(userStr)

        // Check if user is a regular user
        if (user.role !== 'user') {
            router.push('/responder')
            return
        }

        setCurrentUser(user)
    }, [router])

    const handleNavigateToReport = (type: string) => {
        setPreSelectedType(type)
        setActiveTab("report")
    }

    const handleNavigateToSafety = () => {
        setActiveTab("safety")
    }

    const handleIncidentSubmitted = (incidentData: any) => {
        // Navigate back to home after a short delay to show the success popup
        setTimeout(() => {
            setActiveTab("home")
        }, 3000)
    }

    const renderView = () => {
        switch (activeTab) {
            case "home":
                return <UserHome onNavigateToReport={handleNavigateToReport} activeIncident={activeIncident} onNavigateToSafety={handleNavigateToSafety} />
            case "report":
                return <ReportIncident preSelectedType={preSelectedType} onSubmit={handleIncidentSubmitted} />
            case "resources":
                return <ResourcesView />
            case "alerts":
                return <NearbyAlerts />
            case "profile":
                return <UserProfile />
            case "safety":
                return <SafetyGuide onBack={() => setActiveTab("home")} />
            default:
                return <UserHome onNavigateToReport={handleNavigateToReport} activeIncident={activeIncident} onNavigateToSafety={handleNavigateToSafety} />
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
                <BottomNav activeTab={activeTab} onTabChange={setActiveTab} mode="user" />
            </div>
        </div>
    )
}
