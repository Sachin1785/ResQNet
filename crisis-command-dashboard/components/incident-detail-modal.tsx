"use client"

import { X, AlertTriangle, Users, Truck, Clock, FileText, Radio, MessageSquare, Smartphone, Wifi, CheckCircle } from "lucide-react"

interface IncidentDetailModalProps {
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
    reportSource: "voice-call" | "sms" | "bluetooth-mesh"
  }
  isOpen: boolean
  onClose: () => void
  onConfirmResolution?: (id: number) => void
}

export default function IncidentDetailModal({ incident, isOpen, onClose }: IncidentDetailModalProps) {
  if (!isOpen) return null

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

  const getReportSourceIcon = (source: string) => {
    switch (source) {
      case "voice-call":
        return <Radio className="w-4 h-4" />
      case "sms":
        return <MessageSquare className="w-4 h-4" />
      case "bluetooth-mesh":
        return <Wifi className="w-4 h-4" />
      default:
        return <Smartphone className="w-4 h-4" />
    }
  }

  const getReportSourceLabel = (source: string) => {
    switch (source) {
      case "voice-call":
        return "Voice Call"
      case "sms":
        return "SMS"
      case "bluetooth-mesh":
        return "Bluetooth Mesh"
      default:
        return "Unknown"
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed right-0 top-0 h-full w-96 bg-card border-l border-border z-50 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex-shrink-0 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 mt-1 flex-shrink-0 ${getSeverityColor(incident.severity)}`} />
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-foreground text-sm mb-1 truncate">{incident.title}</h2>
                <p className="text-xs text-muted-foreground">{incident.severity.toUpperCase()} PRIORITY</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="ml-2 p-1 hover:bg-muted rounded-lg transition-colors flex-shrink-0">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Report Source */}
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <div className="flex items-center gap-2 text-xs">
              {getReportSourceIcon(incident.reportSource)}
              <span className="text-muted-foreground">Report Source:</span>
              <span className="font-semibold text-foreground">{getReportSourceLabel(incident.reportSource)}</span>
            </div>
          </div>

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
        <div className="p-4 border-t border-border flex-shrink-0 bg-muted/20 space-y-3">
          {incident.status === 'pending_review' && (
             <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg">
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-2 font-medium">
                   <AlertTriangle className="w-3 h-3 inline mr-1" />
                   Review Required: Responder submitted for resolution.
                </p>
                <button 
                  onClick={() => onConfirmResolution && onConfirmResolution(incident.id)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-3 h-3" />
                  Confirm Resolution & Release Resources
                </button>
             </div>
          )}

          <div className="text-xs text-muted-foreground mb-2">
            <span className="font-semibold text-accent">{incident.arrivedUnits}</span> of{" "}
            <span className="font-semibold text-accent">{incident.totalUnits}</span> units arrived
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-accent h-full transition-all"
              style={{
                width: `${(incident.arrivedUnits / incident.totalUnits) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
    </>
  )
}
