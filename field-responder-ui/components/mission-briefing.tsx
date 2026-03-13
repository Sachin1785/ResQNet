"use client"

import { ChevronUp } from "lucide-react"

interface MissionBriefingProps {
  isExpanded: boolean
  onToggle: () => void
  // checklist: Record<string, boolean>
  // onChecklistToggle: (item: string) => void
  incident?: any
}

export default function MissionBriefing({ isExpanded, onToggle,  incident }: MissionBriefingProps) {
  if (!incident) return null

  const formattedIncident = {
    type: incident.type?.charAt(0).toUpperCase() + incident.type?.slice(1) || "Emergency",
    block: incident.location_name || "Active Zone",
    reportedBy: incident.reporter_name || "System Alert",
    callerRole: "Reporter",
    callerPhone: incident.contact_phone || "Not available",
    timestamp: new Date(incident.created_at).toLocaleString(),
    address: incident.location_name || `${incident.lat?.toFixed(4)}, ${incident.lng?.toFixed(4)}`,
    victims: incident.victims_count || 0,
    severity: incident.severity?.toUpperCase() || "HIGH",
    notes: incident.description || "No additional notes provided."
  }

  return (
    <div
      className={`
        fixed left-0 right-0 bottom-16
        rounded-t-3xl border-t transition-all duration-300 ease-out
        bg-white/95 dark:bg-black/90 backdrop-blur-xl
        border-gray-200 dark:border-gray-800
        flex flex-col z-50 overflow-hidden shadow-2xl
        ${isExpanded ? "h-[calc(100vh-12rem)]" : "h-auto"}
      `}
    >
      {/* Peek content - Always visible */}
      <div
        onClick={onToggle}
        className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex-shrink-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base text-gray-900 dark:text-white truncate">{formattedIncident.type} - {formattedIncident.block}</h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Reported by: {formattedIncident.reportedBy}</p>
          </div>
          <button className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors flex-shrink-0 ml-2">
            <ChevronUp className={`w-5 h-5 text-gray-700 dark:text-gray-300 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Quick info - Address, Victims, Severity */}
        <div className="px-4 py-3 space-y-2">
          {/* Address */}
          <div className="text-xs text-gray-700 dark:text-gray-300 truncate">
            <span className="font-semibold">📍 </span>{formattedIncident.address}
          </div>

          {/* Victims and Severity - Side by side */}
          <div className="flex items-center gap-3">
            {/* Victims */}
            {/* <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-1.5 flex-1"> */}
              {/* <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" /> */}
              {/* <div className="min-w-0"> */}
                {/* <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Victims</p> */}
                {/* <p className="text-sm text-gray-900 dark:text-white font-bold truncate">{formattedIncident.victims} persons</p> */}
              {/* </div> */}
            {/* </div> */}

            {/* Severity */}
            <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950/30 rounded-lg px-3 py-1.5 flex-1">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">Severity</p>
                <p className="text-sm text-gray-900 dark:text-white font-bold truncate">{formattedIncident.severity}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content - Only visible when expanded */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Incident meta details */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-gray-100 dark:bg-gray-900 rounded-lg p-3">
            <div className="text-gray-900 dark:text-gray-100">
              <span className="font-bold">Time:</span> {formattedIncident.timestamp}
            </div>
            <div className="text-gray-900 dark:text-gray-100">
              <span className="font-bold">Contact:</span> {formattedIncident.callerPhone}
            </div>
          </div>

          {/* Notes/Description */}
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
            <p className="text-xs font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">Notes</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">{formattedIncident.notes}</p>
          </div>

          {/* Checklist */}
          {/* <div className="space-y-2.5 pt-3 border-t-2 border-gray-200 dark:border-gray-800">
            <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">Action Checklist</p>
            {[
              { key: "staging", label: "Arrived at Staging Area" },
              { key: "assessment", label: "Assessment Complete" },
              { key: "resources", label: "Resource Distributed" },
              { key: "victims", label: "Victim Stabilized" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer group bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <input
                  type="checkbox"
                  checked={checklist[key as keyof typeof checklist]}
                  onChange={() => onChecklistToggle(key)}
                  className="w-5 h-5 rounded-lg accent-blue-600 cursor-pointer"
                />
                <span
                  className={`text-sm font-medium transition-colors ${checklist[key as keyof typeof checklist]
                    ? "text-gray-500 dark:text-gray-500 line-through"
                    : "text-gray-900 dark:text-white"
                    }`}
                >
                  {label}
                </span>
              </label>
            ))}
          </div> */}
        </div>
      )}
    </div>
  )
}


