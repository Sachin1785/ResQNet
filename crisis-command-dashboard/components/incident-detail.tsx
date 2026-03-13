"use client"

import { AlertTriangle, Users, Truck, Clock, FileText } from "lucide-react"

interface IncidentDetailProps {
  incident: {
    id: number
    title: string
    severity: "critical" | "high" | "medium" | "low"
    status: string
    time: string
    description: string
    responders: string[]
    resources: string[]
    arrivedUnits: number
    totalUnits: number
  }
}

export default function IncidentDetail({ incident }: IncidentDetailProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-primary"
      case "high":
        return "text-orange-400"
      case "medium":
        return "text-yellow-400"
      default:
        return "text-green-400"
    }
  }

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-start gap-3">
          <AlertTriangle className={`w-5 h-5 mt-1 flex-shrink-0 ${getSeverityColor(incident.severity)}`} />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-foreground text-sm mb-1 truncate">{incident.title}</h2>
            <p className="text-xs text-muted-foreground">{incident.severity.toUpperCase()} PRIORITY</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Time and Status */}
        <div className="bg-muted/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Reported:</span>
            <span className="font-semibold text-foreground">{incident.time}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Status:</span>
            <span className={`font-semibold capitalize ${getSeverityColor(incident.status)}`}>{incident.status}</span>
          </div>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Description</h3>
          <p className="text-xs text-foreground leading-relaxed bg-muted/30 rounded-lg p-3">{incident.description}</p>
        </div>

        {/* Responders */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-2">
            <Users className="w-3 h-3" />
            Assigned Responders ({incident.responders.length})
          </h3>
          <div className="space-y-2">
            {incident.responders.map((responder, idx) => (
              <div
                key={idx}
                className="bg-accent/10 border border-accent/30 rounded-lg p-2 flex items-center justify-between"
              >
                <span className="text-xs font-semibold text-foreground">{responder}</span>
                <span className="text-xs text-accent bg-accent/20 px-2 py-1 rounded">
                  {idx < incident.arrivedUnits ? "Arrived" : "En Route"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Resources */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-2">
            <Truck className="w-3 h-3" />
            Allocated Resources ({incident.resources.length})
          </h3>
          <div className="space-y-2">
            {incident.resources.map((resource, idx) => (
              <div
                key={idx}
                className="bg-primary/10 border border-primary/30 rounded-lg p-2 flex items-center justify-between"
              >
                <span className="text-xs font-semibold text-foreground">{resource}</span>
                <span className="text-xs text-primary bg-primary/20 px-2 py-1 rounded">Active</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border flex-shrink-0 bg-muted/20">
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-accent">{incident.arrivedUnits}</span> of{" "}
          <span className="font-semibold text-accent">{incident.totalUnits}</span> units arrived
        </div>
        <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
          <div
            className="bg-accent h-full transition-all"
            style={{
              width: `${(incident.arrivedUnits / incident.totalUnits) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
