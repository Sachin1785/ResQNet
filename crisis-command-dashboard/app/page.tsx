"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { AlertTriangle, BarChart3, MessageSquare, Users, Package, RefreshCw, Cpu, Image as ImageIcon } from "lucide-react"
import IncidentDetailView from "@/components/incident-detail-view"
import RightSidebar from "@/components/right-sidebar"
import CommunicationsPanel from "@/components/communications-panel"
import { PersonnelManagement } from "@/components/personnel-management"
import { ResourceManagement } from "@/components/resource-management"
import { IoTManagement } from "@/components/iot-management"
import EvidenceGallery from "@/components/evidence-gallery"
import { incidentsAPI, personnelAPI, resourcesAPI } from "@/lib/api"
import { useWebSocket } from "@/hooks/use-websocket"

// Dynamic import for Leaflet map to avoid SSR issues
const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted flex items-center justify-center">
      <div className="text-muted-foreground">Loading map...</div>
    </div>
  ),
})

export default function CrisisCommandDashboard() {
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null)
  const [selectedPersonnel, setSelectedPersonnel] = useState<any | null>(null)
  const [incidents, setIncidents] = useState<any[]>([])
  const [allIncidents, setAllIncidents] = useState<any[]>([])
  const [personnel, setPersonnel] = useState<any[]>([])
  const [expandedIncident, setExpandedIncident] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [rightSidebarView, setRightSidebarView] = useState<'stats' | 'comms' | 'team' | 'resources' | 'iot' | 'evidence'>('comms')

  // Resource Location Picker State
  const [isLocationPickerActive, setIsLocationPickerActive] = useState(false)
  const [pickedLocation, setPickedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [resources, setResources] = useState<any[]>([])

  const handleActivateLocationPicker = () => {
    setIsLocationPickerActive(true)
    setRightSidebarView('resources') // Ensure resource tab is open
  }

  const handleMapClick = (lat: number, lng: number) => {
    if (isLocationPickerActive) {
      setPickedLocation({ lat, lng })
      setIsLocationPickerActive(false)
      setRightSidebarView('resources') // Return focus to resource tab
    } else {
        // If normal mode, maybe clear selection or do nothing
        setSelectedIncident(null)
        setSelectedPersonnel(null)
    }
  }

  // WebSocket connection
  const { isConnected, on, off, joinIncident, leaveIncident } = useWebSocket({
    autoConnect: true,
    onConnect: () => console.log('Dashboard connected to WebSocket'),
  })

  // Memoized fetch function so it can be used in effects safely
  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      // Fetch incidents
      const incidentsResponse = await incidentsAPI.getAll()
      let currentIncidents: any[] = []
      let fullIncidents: any[] = []

      if (incidentsResponse.success) {
        fullIncidents = incidentsResponse.incidents.map((inc: any) => ({
          ...inc,
          location: { lat: inc.lat, lng: inc.lng },
          time: new Date(inc.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Kolkata'
          }),
          responders: [],
          resources: []
        }))
        setAllIncidents(fullIncidents)

        // Filter out resolved incidents for the main list and map
        const activeIncidents = fullIncidents.filter((inc: any) => inc.status !== 'resolved')

        currentIncidents = activeIncidents.map((inc: any) => ({
          ...inc,
          reportSource: inc.report_source || 'web',
          reporterPhone: inc.reporter_phone,
          reportCount: inc.report_count || 1,
          attachments: inc.attachments || [],
          arrivedUnits: 0,
          totalUnits: 0,
          is_verified: inc.is_verified,
          verification_score: inc.verification_score,
          ai_analysis: inc.ai_analysis
        }))
        setIncidents(currentIncidents)
      }

      // Fetch resources
      const resourcesResponse = await resourcesAPI.getAll()
      let currentResources: any[] = []
      if (resourcesResponse.success) {
        currentResources = resourcesResponse.resources.map((r: any) => ({
          ...r,
          location: r.lat && r.lng ? { lat: r.lat, lng: r.lng } : null
        }))
        setResources(currentResources)
      }

      // Fetch personnel
      const personnelResponse = await personnelAPI.getAll()
      if (personnelResponse.success) {
        const formattedPersonnel = personnelResponse.personnel.map((p: any) => ({
          id: p.id,
          name: p.name,
          location: p.lat && p.lng ? { lat: p.lat, lng: p.lng } : null,
          status: p.status,
          assignedIncident: p.assigned_incident_id,
          role: p.role,
        }))
        setPersonnel(formattedPersonnel)

        // Sync active incidents with personnel and resources data
        setIncidents(prev => prev.map((inc: any) => {
          const assignedPersonnel = formattedPersonnel.filter((p: any) => p.assignedIncident === inc.id)
          const assignedResources = currentResources.filter((r: any) => r.assigned_incident_id === inc.id)

          return {
            ...inc,
            responders: assignedPersonnel.map((p: any) => p.name),
            resources: assignedResources.map((r: any) => r.name),
            arrivedUnits: assignedPersonnel.filter((p: any) => p.status === 'on-scene').length,
            totalUnits: assignedPersonnel.length,
          }
        }))

        // Also sync ALL incidents for analytics (to get responder/resource counts if needed)
        setAllIncidents(prev => prev.map((inc: any) => {
          const assignedPersonnel = formattedPersonnel.filter((p: any) => p.assignedIncident === inc.id)
          const assignedResources = currentResources.filter((r: any) => r.assigned_incident_id === inc.id)

          return {
            ...inc,
            responders: assignedPersonnel.map((p: any) => p.name),
            resources: assignedResources.map((r: any) => r.name),
          }
        }))

        // Also update selectedIncident if it exists
        setSelectedIncident((current: any) => {
          if (!current && currentIncidents.length > 0) {
            // If no incident is selected, select the first one
            const firstIncident = currentIncidents[0];
            const assigned = formattedPersonnel.filter((p: any) => p.assignedIncident === firstIncident.id)
            const assignedRes = currentResources.filter((r: any) => r.assigned_incident_id === firstIncident.id)

            setExpandedIncident(firstIncident.id) // Also expand the first incident
            return {
              ...firstIncident,
              responders: assigned.map((p: any) => p.name),
              resources: assignedRes.map((r: any) => r.name),
              arrivedUnits: assigned.filter((p: any) => p.status === 'on-scene').length,
              totalUnits: assigned.length,
            }
          }

          if (current) {
            const updated = currentIncidents.find((inc: any) => inc.id === current.id)
            if (updated) {
              const assigned = formattedPersonnel.filter((p: any) => p.assignedIncident === updated.id)
              const assignedRes = currentResources.filter((r: any) => r.assigned_incident_id === updated.id)

              return {
                ...updated,
                responders: assigned.map((p: any) => p.name),
                resources: assignedRes.map((r: any) => r.name),
                arrivedUnits: assigned.filter((p: any) => p.status === 'on-scene').length,
                totalUnits: assigned.length,
              }
            }
          }
          return current;
        })
      }

      if (!silent) setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // WebSocket event handlers for real-time updates
  useEffect(() => {
    if (!isConnected) return

    // Listen for incident updates
    const handleIncidentUpdate = (data: any) => {
      console.log('Incident updated:', data)
      fetchData(true) // Silent refresh for all counts and lists
    }

    // Listen for personnel location updates (REAL-TIME)
    const handlePersonnelLocationUpdate = (data: any) => {
      // Keep manual update for locations to ensure highest performance for map movement
      setPersonnel(prev => {
        const existingIndex = prev.findIndex(p => p.id === data.personnel_id)
        if (existingIndex >= 0) {
          return prev.map(p =>
            p.id === data.personnel_id
              ? { ...p, location: data.location, status: data.status, name: data.name }
              : p
          )
        } else {
          return [...prev, {
            id: data.personnel_id,
            name: data.name,
            location: data.location,
            status: data.status,
            assignedIncident: data.assigned_incident_id,
            role: 'Responder'
          }]
        }
      })
    }

    // Listen for personnel status updates (Crucial for assignment reflecting in incidents)
    const handlePersonnelStatusUpdate = (data: any) => {
      console.log('Personnel status updated:', data)
      fetchData(true) // Silent refresh for counts and sync
    }

    const handlePersonnelAssigned = (data: any) => {
      console.log('Personnel assigned to incident:', data)
      fetchData(true) // Silent refresh
    }

    on('incident_updated', handleIncidentUpdate)
    on('personnel_location_updated', handlePersonnelLocationUpdate)
    on('personnel_status_updated', handlePersonnelStatusUpdate)
    on('personnel_assigned', handlePersonnelAssigned)

    return () => {
      off('incident_updated', handleIncidentUpdate)
      off('personnel_location_updated', handlePersonnelLocationUpdate)
      off('personnel_status_updated', handlePersonnelStatusUpdate)
      off('personnel_assigned', handlePersonnelAssigned)
    }
  }, [isConnected, on, off, fetchData])

  // Join incident room when selected
  useEffect(() => {
    if (selectedIncident && isConnected) {
      joinIncident(selectedIncident.id)
      return () => {
        leaveIncident(selectedIncident.id)
      }
    }
  }, [selectedIncident, isConnected, joinIncident, leaveIncident])

  const handleSelectIncident = (incident: any) => {
    setSelectedIncident(incident)
    setSelectedPersonnel(null) // Deselect personnel if incident is selected
    setExpandedIncident(expandedIncident === incident.id ? null : incident.id)
  }

  const handleSelectPersonnel = (person: any) => {
    setSelectedPersonnel(person)
    setSelectedIncident(null) // Deselect incident if personnel is selected
  }

  const handleConfirmResolution = async (incidentId: number) => {
    try {
      if (confirm("Are you sure you want to confirm resolution and release all resources?")) {
        await incidentsAPI.resolve(incidentId, true)
        // WebSocket will handle the update refresh
      }
    } catch (error) {
      console.error("Failed to confirm resolution:", error)
      alert("Failed to confirm resolution")
    }
  }

  const activePersonnel = personnel.filter(p => p.status !== 'available').length
  const totalEquipment = incidents.reduce((sum, inc) => sum + (inc.resources?.length || 0), 0)

  return (
    <div className="w-full h-screen bg-background flex overflow-hidden">
      {/* Left Sidebar - Incident List and Details */}
      <div className="w-96 bg-card border-r border-border flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">ResQnet Command</h1>
            </div>
            <button
              onClick={() => fetchData()}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="text-sm text-muted-foreground">{incidents.length} Active Incidents</div>
        </div>

        {/* Incident List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading incidents...</div>
            </div>
          ) : incidents.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No active incidents</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {incidents.map((incident) => (
                <div key={incident.id}>
                  <button
                    onClick={() => handleSelectIncident(incident)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${selectedIncident?.id === incident.id
                      ? "bg-accent/20 border border-accent"
                      : "bg-muted/30 border border-transparent hover:bg-muted/50"
                      }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-sm text-foreground flex-1 pr-2 line-clamp-1">
                        {incident.title}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded ${incident.severity === "critical"
                          ? "bg-primary/20 text-primary"
                          : incident.severity === "high"
                            ? "bg-orange-500/20 text-orange-600 dark:text-orange-400"
                            : incident.severity === "medium"
                              ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                              : "bg-green-500/20 text-green-600 dark:text-green-400"
                          }`}
                      >
                        {incident.severity.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">{incident.time}</div>
                      <div className="text-xs text-muted-foreground">
                        {incident.responders.length} Personnel • Status:{" "}
                        <span className="text-accent capitalize">{incident.status}</span>
                        {incident.reportCount > 1 && (
                          <span className="block mt-1 text-primary font-bold text-[11px]">
                            {incident.reportCount} Reports Merged
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Detail View */}
                  {expandedIncident === incident.id && (
                    <div className="mx-2 mt-2 mb-2">
                      <IncidentDetailView
                        incident={incident}
                        onConfirmResolution={handleConfirmResolution}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center - Map */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar with Stats */}
        <div className="bg-card border-b border-border p-4 flex-shrink-0">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm text-muted-foreground">Active Incidents</div>
              <div className="text-2xl font-bold text-foreground">{incidents.length}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm text-muted-foreground">Active Personnel</div>
              <div className="text-2xl font-bold text-accent">
                {activePersonnel}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm text-muted-foreground">Equipment Deployed</div>
              <div className="text-2xl font-bold text-accent">
                {totalEquipment}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm text-muted-foreground">Critical Incidents</div>
              <div className="text-2xl font-bold text-primary">
                {incidents.filter((inc) => inc.severity === "critical").length}
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="w-full h-full rounded-lg overflow-hidden border border-border bg-muted">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-muted-foreground">Loading map data...</div>
              </div>
            ) : (
              <MapComponent
                incidents={incidents}
                selectedIncident={selectedIncident}
                selectedPersonnel={selectedPersonnel}
                personnel={personnel}
                resources={resources}
                isLocationPickerActive={isLocationPickerActive}
                onMapClick={handleMapClick}
              />
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Tabbed (Stats / Communications / Team) */}
      <div className="w-96 bg-card border-l border-border flex flex-col overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setRightSidebarView('comms')}
            className={`flex-1 px-2 py-3 font-medium transition-colors ${rightSidebarView === 'comms'
              ? 'bg-primary/10 text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:bg-muted/50'
              }`}
          >
            <div className="flex flex-col items-center justify-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span className="text-[10px]">Comms</span>
            </div>
          </button>
          <button
            onClick={() => setRightSidebarView('stats')}
            className={`flex-1 px-2 py-3 font-medium transition-colors ${rightSidebarView === 'stats'
              ? 'bg-primary/10 text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:bg-muted/50'
              }`}
          >
            <div className="flex flex-col items-center justify-center gap-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-[10px]">Stats</span>
            </div>
          </button>
          <button
            onClick={() => setRightSidebarView('team')}
            className={`flex-1 px-2 py-3 font-medium transition-colors ${rightSidebarView === 'team'
              ? 'bg-primary/10 text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:bg-muted/50'
              }`}
          >
            <div className="flex flex-col items-center justify-center gap-1">
              <Users className="w-4 h-4" />
              <span className="text-[10px]">Team</span>
            </div>
          </button>
          <button
            onClick={() => setRightSidebarView('resources')}
            className={`flex-1 px-2 py-3 font-medium transition-colors ${rightSidebarView === 'resources'
              ? 'bg-primary/10 text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:bg-muted/50'
              }`}
          >
            <div className="flex flex-col items-center justify-center gap-1">
              <Package className="w-4 h-4" />
              <span className="text-[10px]">Resources</span>
            </div>
          </button>
          <button
            onClick={() => setRightSidebarView('iot')}
            className={`flex-1 px-2 py-3 font-medium transition-colors ${rightSidebarView === 'iot'
              ? 'bg-primary/10 text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:bg-muted/50'
              }`}
          >
            <div className="flex flex-col items-center justify-center gap-1">
              <Cpu className="w-4 h-4" />
              <span className="text-[10px]">IoT</span>
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {rightSidebarView === 'comms' ? (
            <CommunicationsPanel />
          ) : rightSidebarView === 'stats' ? (
            <RightSidebar incidents={allIncidents} />
          ) : rightSidebarView === 'team' ? (
            <PersonnelManagement onSelectPersonnel={handleSelectPersonnel} selectedPersonnelId={selectedPersonnel?.id} />
          ) : rightSidebarView === 'resources' ? (
            <ResourceManagement 
              incidents={incidents} 
              resources={resources}
              pickedLocation={pickedLocation}
              onActivatePicker={handleActivateLocationPicker}
            />
          ) : rightSidebarView === 'iot' ? (
            <IoTManagement />
          ) : (
            <EvidenceGallery />
          )}
        </div>
      </div>
    </div>
  )
}
