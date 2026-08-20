"use client";
import { useState, useEffect, useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { AlertTriangle, BarChart3, MessageSquare, Users, Package, RefreshCw, Cpu, Image as ImageIcon, Radio, Zap } from "lucide-react"
import IncidentDetailView from "@/components/incident-detail-view"
import RightSidebar from "@/components/right-sidebar"
import CommunicationsPanel from "@/components/communications-panel"
import { PersonnelManagement } from "@/components/personnel-management"
import { ResourceManagement } from "@/components/resource-management"
import { IoTManagement } from "@/components/iot-management"
import EvidenceGallery from "@/components/evidence-gallery"
import { incidentsAPI, personnelAPI, resourcesAPI } from "@/lib/api"
import { useWebSocket } from "@/hooks/use-websocket"
import { useSimulationStream } from "@/hooks/useSimulationStream"
import { useAnimationTimer } from "@/hooks/useAnimationTimer"
import TelemetryCharts from "@/components/simulation/TelemetryCharts"
import SynergyFeed from "@/components/simulation/SynergyFeed"
import MapLegend from "@/components/simulation/MapLegend"
import { Switch } from "@/components/ui/switch"
import { useRef } from "react"
import { deriveSimDashboardData } from "@/lib/simulation-adapter"

// Dynamic import for Leaflet map to avoid SSR issues
const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted flex items-center justify-center">
      <div className="text-muted-foreground">Loading map...</div>
    </div>
  ),
})

const DeckGLMap = dynamic(() => import("@/components/simulation/DeckGLMap"), { ssr: false })

export default function CrisisCommandDashboard() {
  const [isSimulationMode, setIsSimulationMode] = useState(false)
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

  // Simulation Mode Stream & Animation Hooks
  const { ticksHistory, isConnected: isSimConnected, error: simError } = useSimulationStream(isSimulationMode)
  const currentTickRef = useRef<number>(0)
  const maxTick = ticksHistory.length > 0 ? ticksHistory[ticksHistory.length - 1].tick : 0
  const minTick = ticksHistory.length > 0 ? ticksHistory[0].tick : 0
  const currentTick = useAnimationTimer(isSimulationMode, 1.0, maxTick, currentTickRef)

  useEffect(() => {
    if (ticksHistory.length === 1) {
      currentTickRef.current = minTick
    }
  }, [ticksHistory.length, minTick])

  // Derive full simulation dashboard state
  const latestTickData = useMemo(() => {
    return ticksHistory.length > 0 ? ticksHistory[ticksHistory.length - 1] : null
  }, [ticksHistory])

  const simData = useMemo(() => {
    return deriveSimDashboardData(latestTickData, currentTick, ticksHistory)
  }, [latestTickData, currentTick, ticksHistory])

  const hydratedLiveIncidents = useMemo(() => {
    return incidents.map((inc) => {
      const assignedResponders = personnel
        .filter((p) => p.assignedIncident === inc.id)
        .map((p) => p.name)
      const assignedEquipment = resources
        .filter((r) => r.assigned_incident_id === inc.id)
        .map((r) => r.name)
      return {
        ...inc,
        responders: assignedResponders,
        resources: assignedEquipment,
        arrivedUnits: assignedResponders.length,
        totalUnits: Math.max(1, assignedResponders.length + assignedEquipment.length),
      }
    })
  }, [incidents, personnel, resources])

  const displayIncidents = isSimulationMode ? simData.incidents : hydratedLiveIncidents
  const displayPersonnel = isSimulationMode ? simData.personnel : personnel
  const displayResources = isSimulationMode ? simData.resources : resources

  const liveActivePersonnel = useMemo(() => {
    return personnel.filter(
      (p) => p.status === "responding" || p.status === "on-scene" || p.status === "en-route"
    ).length
  }, [personnel])

  const liveDeployedEquipment = useMemo(() => {
    return resources.filter(
      (r) => r.status === "deployed" || (r.assigned_incident_id != null && r.assigned_incident_id !== 0)
    ).length
  }, [resources])

  const displayStats = isSimulationMode
    ? simData.stats
    : {
        activeIncidents: incidents.length,
        activePersonnel: liveActivePersonnel,
        totalEquipment: liveDeployedEquipment,
        criticalIncidents: incidents.filter((inc) => inc.severity === "critical").length,
      }

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
            <div className="flex items-center gap-2 text-xs">
              <span className={!isSimulationMode ? "text-cyan-400 font-bold" : "text-muted-foreground"}>Live</span>
              <Switch checked={isSimulationMode} onCheckedChange={setIsSimulationMode} />
              <span className={isSimulationMode ? "text-primary font-bold" : "text-muted-foreground"}>Sim</span>
            </div>
            <button
              onClick={() => fetchData()}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="text-sm text-muted-foreground">{displayIncidents.length} Active Incidents</div>
        </div>

        {/* Incident List */}
        <div className="flex-1 overflow-y-auto">
          {!isSimulationMode && loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading incidents...</div>
            </div>
          ) : displayIncidents.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{isSimulationMode ? "Waiting for simulation tick..." : "No active incidents"}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {displayIncidents.map((incident) => (
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
                        className={`text-xs px-2 py-1 rounded font-bold ${incident.severity === "critical"
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
                      
                      {/* Requirements summary for simulated incidents */}
                      {incident.requirements && Object.keys(incident.requirements).length > 0 && (
                        <div className="mt-2 pt-1 border-t border-border/40 flex flex-wrap gap-1">
                          {Object.entries(incident.requirements).map(([type, count]) => (
                            <span key={type} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/70 text-muted-foreground font-mono">
                              {type}: {incident.remaining_requirements?.[type] ?? count}/{count as number}
                            </span>
                          ))}
                        </div>
                      )}
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
              <div className="text-2xl font-bold text-foreground">{displayStats.activeIncidents}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm text-muted-foreground">Active Personnel</div>
              <div className="text-2xl font-bold text-accent">
                {displayStats.activePersonnel}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm text-muted-foreground">Equipment Deployed</div>
              <div className="text-2xl font-bold text-accent">
                {displayStats.totalEquipment}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-sm text-muted-foreground">Critical Incidents</div>
              <div className="text-2xl font-bold text-primary">
                {displayStats.criticalIncidents}
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="w-full h-full rounded-lg overflow-hidden border border-border bg-muted relative">
            {!isSimulationMode && (
              loading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-muted-foreground">Loading map data...</div>
                </div>
              ) : (
                <MapComponent
                  incidents={displayIncidents}
                  selectedIncident={selectedIncident}
                  selectedPersonnel={selectedPersonnel}
                  personnel={displayPersonnel}
                  resources={displayResources}
                  isLocationPickerActive={isLocationPickerActive}
                  onMapClick={handleMapClick}
                />
              )
            )}
            
            {isSimulationMode && (
              <div className="w-full h-full bg-slate-950 absolute inset-0">
                <DeckGLMap 
                  currentTickTime={currentTick} 
                  ticksHistory={ticksHistory} 
                />
                <SynergyFeed 
                  ticksHistory={ticksHistory} 
                  currentTick={currentTick} 
                />
                <MapLegend />
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md rounded-full px-6 py-2 border border-slate-700 shadow-2xl flex items-center gap-4 z-50 text-white font-mono text-sm tracking-widest">
                  <span className="text-cyan-400 font-bold">LIVE STREAM</span>
                  <span className="text-slate-400">|</span>
                  <span>TICK {currentTick.toFixed(1)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Tabbed (Stats / Communications / Team / Resources / IoT) */}
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
            isSimulationMode ? (
              <div className="h-full flex flex-col p-3 overflow-y-auto space-y-2 bg-slate-950/40">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 pb-2 border-b border-border">
                  <Radio className="w-4 h-4 animate-pulse text-cyan-400" />
                  <span>AI DISPATCH & SYNERGY RADIO LOGS</span>
                </div>
                {simData.communications.length === 0 ? (
                  <div className="text-center py-10 text-xs text-muted-foreground">
                    Awaiting AI tactical dispatches...
                  </div>
                ) : (
                  simData.communications.map((comm) => (
                    <div key={comm.id} className="p-2.5 rounded-xl border border-border/60 bg-card/60 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground flex items-center gap-1">
                          {comm.type === "synergy" && <Zap className="w-3 h-3 text-amber-400 inline" />}
                          {comm.sender_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">{comm.created_at}</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{comm.message}</p>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <CommunicationsPanel />
            )
          ) : rightSidebarView === 'stats' ? (
            isSimulationMode ? (
              <TelemetryCharts 
                ticksHistory={ticksHistory} 
                currentTick={currentTick} 
              />
            ) : (
              <RightSidebar incidents={displayIncidents} />
            )
          ) : rightSidebarView === 'team' ? (
            <PersonnelManagement 
              onSelectPersonnel={handleSelectPersonnel} 
              selectedPersonnelId={selectedPersonnel?.id} 
              customPersonnel={displayPersonnel}
            />
          ) : rightSidebarView === 'resources' ? (
            <ResourceManagement 
              incidents={displayIncidents} 
              resources={displayResources}
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
