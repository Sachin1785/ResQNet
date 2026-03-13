"use client"

import { Users, Truck, Radio, MessageSquare, Wifi, Smartphone, CheckCircle, AlertCircle } from "lucide-react"
import { incidentsAPI } from "@/lib/api"

interface IncidentDetailViewProps {
  incident: {
    id: number
    title: string
    severity: "critical" | "high" | "medium" | "low"
    status: string
    time: string
    description: string
    responders: string[]
    resources: string[]
    attachments?: any[]
    arrivedUnits: number
    totalUnits: number
    reportSource: "voice-call" | "sms" | "bluetooth-mesh" | "web" | "SMS"
    reporterPhone?: string
    reportCount?: number
    is_verified?: number
    verification_score?: number
    ai_analysis?: string
  }
  onConfirmResolution?: (id: number) => void
}

export default function IncidentDetailView({ incident, onConfirmResolution }: IncidentDetailViewProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-primary"
      case "high":
        return "text-orange-600 dark:text-orange-400"
      case "medium":
        return "text-yellow-600 dark:text-yellow-400"
      default:
        return "text-green-600 dark:text-green-400"
    }
  }

  const getReportSourceIcon = (source: string) => {
    switch (source) {
      case "voice-call":
        return <Radio className="w-3 h-3" />
      case "sms":
      case "SMS":
        return <MessageSquare className="w-3 h-3" />
      case "bluetooth-mesh":
        return <Wifi className="w-3 h-3" />
      case "web":
        return <Smartphone className="w-3 h-3" />
      default:
        return <Smartphone className="w-3 h-3" />
    }
  }

  const getReportSourceLabel = (source: string) => {
    switch (source) {
      case "voice-call":
        return "Voice Call"
      case "sms":
      case "SMS":
        return "SMS"
      case "bluetooth-mesh":
        return "Bluetooth Mesh"
      case "web":
        return "Dashboard/Web"
      default:
        return source || "Unknown"
    }
  }

  return (
    <div className="bg-muted/40 rounded-lg border border-border overflow-hidden space-y-3 p-3">
      {/* Report Source & Count */}
      <div className="bg-muted/30 rounded p-2 border border-border/50 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            {getReportSourceIcon(incident.reportSource)}
            <span className="text-muted-foreground">Report Source:</span>
            <span className="font-semibold text-foreground">{getReportSourceLabel(incident.reportSource)}</span>
          </div>
          {(incident.reportCount ?? 1) > 1 && (
            <div className="flex items-center gap-1.5 bg-background border border-border px-2 py-0.5 rounded text-[10px]">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="font-bold text-foreground">{incident.reportCount} Reports</span>
            </div>
          )}
        </div>

        {incident.reporterPhone && (
          <div className="flex items-center justify-between pt-2 border-t border-border/20">
            <div className="flex items-center gap-2 text-xs">
              <Smartphone className="w-3 h-3 text-accent" />
              <span className="text-muted-foreground">Reporter:</span>
              <span className="font-mono font-bold text-accent">{incident.reporterPhone}</span>
            </div>
            <button className="text-[10px] text-accent hover:underline font-semibold">Call Now</button>
          </div>
        )}
      </div>

      {/* Confirmation/Resolution Actions */}
      {incident.status === 'pending_review' && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 p-2 rounded text-center mb-3">
          <p className="text-[10px] text-yellow-600 dark:text-yellow-400 mb-1 font-medium italic">
            Responder has submitted for review
          </p>
          <button
            onClick={() => onConfirmResolution && onConfirmResolution(incident.id)}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold py-1.5 px-3 rounded transition-colors"
          >
            Confirm Resolution
          </button>
        </div>
      )}

      {/* AI Verification Status */}
      {incident.is_verified === 1 && (
        <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded p-2.5 mb-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <CheckCircle className="w-16 h-16" />
          </div>
          <div className="flex items-start gap-2.5 relative z-10">
            <div className="bg-blue-500 rounded-full p-1 mt-0.5 shadow-lg shadow-blue-500/20">
              <CheckCircle className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">AI Verified Incident</h4>
                <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                  {incident.verification_score}% Confident
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {incident.ai_analysis || "Visual evidence confirms the reported incident traits."}
              </p>
            </div>
          </div>
        </div>
      )}

      {incident.is_verified === -1 && (
        <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded p-2.5 mb-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <AlertCircle className="w-16 h-16 text-red-500" />
          </div>
          <div className="flex items-start gap-2.5 relative z-10">
            <div className="bg-red-500 rounded-full p-1 mt-0.5 shadow-lg shadow-red-500/20">
              <AlertCircle className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">Potential Fake Report</h4>
                <span className="text-[10px] font-mono font-bold bg-red-500/20 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded">
                  Flagged by AI
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {incident.ai_analysis || "The uploaded image does not match the report or looks suspicious."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Attachments / Evidence */}
      {incident.attachments && incident.attachments.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Evidence</h4>
          <div className="grid grid-cols-2 gap-2">
            {incident.attachments.map((file: any, idx: number) => {
              // Construct URL: strip /api from end of base URL and join with filepath
              // If filepath already starts with http, use it as is
              const serverUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
              const fileUrl = file.filepath.startsWith('http') ? file.filepath : `${serverUrl}/${file.filepath}`;

              return (
                <a key={idx} href={fileUrl} target="_blank" rel="noopener noreferrer" className="block relative aspect-video bg-muted rounded overflow-hidden border border-border">
                  {file.file_type.startsWith('image') ? (
                    <img src={fileUrl} alt={file.filename} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">{file.filename}</div>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Description</h4>
        <p className="text-xs text-foreground leading-relaxed bg-muted/30 rounded p-2">{incident.description}</p>
      </div>

      {/* Personnel */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide flex items-center gap-1">
          <Users className="w-3 h-3" />
          Personnel ({incident.responders.length})
        </h4>
        <div className="space-y-1">
          {incident.responders.map((responder, idx) => (
            <div
              key={idx}
              className="bg-accent/10 border border-accent/30 rounded p-1.5 flex items-center justify-between text-xs"
            >
              <span className="font-semibold text-foreground">{responder}</span>
              <span className="text-accent bg-accent/20 px-1.5 py-0.5 rounded text-xs">
                {idx < incident.arrivedUnits ? "Arrived" : "En Route"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide flex items-center gap-1">
          <Truck className="w-3 h-3" />
          Equipment ({incident.resources.length})
        </h4>
        <div className="space-y-1">
          {incident.resources.map((resource, idx) => (
            <div
              key={idx}
              className="bg-primary/10 border border-primary/30 rounded p-1.5 flex items-center justify-between text-xs"
            >
              <span className="font-semibold text-foreground">{resource}</span>
              <span className="text-primary bg-primary/20 px-1.5 py-0.5 rounded text-xs">Active</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div className="border-t border-border pt-2">
        <div className="text-xs text-muted-foreground mb-1.5">
          <span className="font-semibold text-accent">{incident.arrivedUnits}</span> of
          <span className="font-semibold text-accent ml-1">{incident.totalUnits}</span> units arrived
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
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
