"use client"

import { useState, useEffect } from "react"
import { useMode } from "@/contexts/mode-context"
import BottomNav from "@/components/bottom-nav"
import { useResponderLocation } from "@/hooks/use-responder-location"

// Responder Views
import MissionView from "@/components/mission-view"
import IncidentsView from "@/components/incidents-view"
import CommsView from "@/components/comms-view"
import TeamView from "@/components/team-view"
import ProfileView from "@/components/profile-view"

// User Views
import UserHome from "@/components/user/user-home"
import ReportIncident from "@/components/user/report-incident"
import NearbyAlerts from "@/components/user/nearby-alerts"
import UserProfile from "@/components/user/user-profile"

export default function FieldResponderApp() {
  const { mode } = useMode()

  // Start location pulse if in responder mode
  const [personnelId, setPersonnelId] = useState<number | null>(null)

  useEffect(() => {
    const fetchPid = async () => {
      const userStr = localStorage.getItem('currentUser')
      if (userStr) {
        const user = JSON.parse(userStr)
        try {
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
          const res = await fetch(`${API_BASE_URL}/personnel/user/${user.id}`, {
            headers: {
              'ngrok-skip-browser-warning': 'true',
            },
          })
          const data = await res.json()
          if (data.success && data.personnel) {
            setPersonnelId(data.personnel.id)
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
    fetchPid()
  }, [])

  useResponderLocation(personnelId, mode === "responder")
  const [activeTab, setActiveTab] = useState(mode === "user" ? "home" : "mission")
  const [preSelectedType, setPreSelectedType] = useState<string | undefined>(undefined)
  const [activeIncident, setActiveIncident] = useState<any>(null)

  const handleNavigateToReport = (type: string) => {
    setPreSelectedType(type)
    setActiveTab("report")
  }

  const handleIncidentSubmitted = (incidentData: any) => {
    // Navigate back to home after a short delay to show the success popup
    setTimeout(() => {
      setActiveTab("home")
    }, 3000)
  }

  const renderUserView = () => {
    switch (activeTab) {
      case "home":
        return <UserHome onNavigateToReport={handleNavigateToReport} activeIncident={activeIncident} />
      case "report":
        return <ReportIncident preSelectedType={preSelectedType} onSubmit={handleIncidentSubmitted} />
      case "alerts":
        return <NearbyAlerts />
      case "profile":
        return <UserProfile />
      default:
        return <UserHome onNavigateToReport={handleNavigateToReport} activeIncident={activeIncident} />
    }
  }

  const renderResponderView = () => {
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

  return (
    <div className="min-h-screen bg-background text-foreground w-full">
      {/* Mobile viewport container - responsive for all screen sizes */}
      <div className="flex flex-col h-screen w-full bg-background overflow-hidden max-w-[430px] mx-auto px-2">
        {/* Main content area */}
        <div className="flex-1 overflow-hidden">
          {mode === "user" ? renderUserView() : renderResponderView()}
        </div>

        {/* Bottom Navigation */}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} mode={mode} />
      </div>
    </div>
  )
}




