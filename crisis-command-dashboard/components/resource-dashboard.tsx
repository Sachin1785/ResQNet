"use client"

import { Truck, Users, Activity, Zap } from "lucide-react"

interface ResourceDashboardProps {
  incidents: Array<{
    id: number
    responders: string[]
    resources: string[]
    status: string
  }>
  selectedIncident: any
}

export default function ResourceDashboard({ incidents, selectedIncident }: ResourceDashboardProps) {
  const allResponders = new Set(incidents.flatMap((inc) => inc.responders))
  const allResources = new Set(incidents.flatMap((inc) => inc.resources))
  const activeIncidents = incidents.filter((inc) => inc.status === "active").length
  const inTransit = incidents.filter((inc) => inc.status === "in-transit").length

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3">
        {selectedIncident ? `Incident #${selectedIncident.id} - Allocation` : "System-Wide Resources"}
      </h3>

      <div className="grid grid-cols-6 gap-3">
        {/* Active Incidents */}
        <div className="bg-muted/50 rounded-lg p-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <div>
            <div className="text-xs text-muted-foreground">Active</div>
            <div className="font-bold text-primary">{activeIncidents}</div>
          </div>
        </div>

        {/* In Transit */}
        <div className="bg-muted/50 rounded-lg p-2 flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" />
          <div>
            <div className="text-xs text-muted-foreground">En Route</div>
            <div className="font-bold text-accent">{inTransit}</div>
          </div>
        </div>

        {/* Total Responders */}
        <div className="bg-muted/50 rounded-lg p-2 flex items-center gap-2">
          <Users className="w-4 h-4 text-accent" />
          <div>
            <div className="text-xs text-muted-foreground">Responders</div>
            <div className="font-bold text-accent">{allResponders.size}</div>
          </div>
        </div>

        {/* Total Resources */}
        <div className="bg-muted/50 rounded-lg p-2 flex items-center gap-2">
          <Truck className="w-4 h-4 text-primary" />
          <div>
            <div className="text-xs text-muted-foreground">Resources</div>
            <div className="font-bold text-primary">{allResources.size}</div>
          </div>
        </div>

        {/* Selected Responders */}
        {selectedIncident && (
          <div className="bg-muted/50 rounded-lg p-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            <div>
              <div className="text-xs text-muted-foreground">Assigned</div>
              <div className="font-bold text-accent">{selectedIncident.responders.length}</div>
            </div>
          </div>
        )}

        {/* Selected Resources */}
        {selectedIncident && (
          <div className="bg-muted/50 rounded-lg p-2 flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Deployed</div>
              <div className="font-bold text-primary">{selectedIncident.resources.length}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
