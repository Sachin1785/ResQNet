"use client"

import { Clock, Users } from "lucide-react"

interface IncidentPanelProps {
  incidents: Array<{
    id: number
    title: string
    severity: "critical" | "high" | "medium" | "low"
    status: string
    time: string
    responders: string[]
    is_verified?: number
  }>
  selectedIncident: any
  onSelectIncident: (incident: any) => void
}

export default function IncidentPanel({ incidents, selectedIncident, onSelectIncident }: IncidentPanelProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-primary/20 text-primary"
      case "high":
        return "bg-orange-500/20 text-orange-400"
      case "medium":
        return "bg-yellow-500/20 text-yellow-400"
      default:
        return "bg-green-500/20 text-green-400"
    }
  }

  return (
    <div className="space-y-2 p-2">
      {incidents.map((incident) => (
        <button
          key={incident.id}
          onClick={() => onSelectIncident(incident)}
          className={`w-full text-left p-3 rounded-lg transition-all ${selectedIncident?.id === incident.id
            ? "bg-accent/20 border border-accent"
            : "bg-muted/30 border border-transparent hover:bg-muted/50"
            }`}
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-sm text-foreground flex-1 pr-2">{incident.title}</h3>
            {incident.is_verified === 1 && (
              <div className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full mr-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight">Verified</span>
              </div>
            )}
            {incident.is_verified === -1 && (
              <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full mr-2">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-bold text-red-600 dark:text-red-400 uppercase tracking-tight">Fake Case</span>
              </div>
            )}
            <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(incident.severity)}`}>
              {incident.severity.toUpperCase()}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{incident.time}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              <span>{incident.responders.length} Responders</span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground">
              Status: <span className="text-accent capitalize">{incident.status}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
