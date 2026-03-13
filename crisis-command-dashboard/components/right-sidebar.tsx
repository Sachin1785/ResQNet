"use client"

import { useState, useEffect } from "react"
import { Radio, MessageSquare, Wifi, AlertCircle, CheckCircle2, TrendingUp, PieChart } from "lucide-react"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { analyticsAPI } from "@/lib/api"
import { ResponseTimeWidget } from "@/components/analytics/response-time-widget"

interface RightSidebarProps {
  incidents: Array<{
    id: number
    title: string
    severity: "critical" | "high" | "medium" | "low"
    responders: string[]
    resources: string[]
    created_at?: string
    resolved_at?: string
  }>
}

export default function RightSidebar({ incidents }: RightSidebarProps) {
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<any>(null)

  const systemStatus = {
    voiceCall: { online: true, devices: 3 },
    sms: { online: true, devices: 5 },
    bluetoothMesh: { online: true, devices: 12 },
  }

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        const response = await analyticsAPI.getDashboard()
        if (response.success) {
          setAnalyticsData(response.analytics)
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
    // Refresh every minute
    const interval = setInterval(fetchAnalytics, 60000)
    return () => clearInterval(interval)
  }, [incidents.length]) // Refresh when incident count changes

  const getStatusColor = (isOnline: boolean) => {
    return isOnline ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-500"
  }

  const getStatusBg = (isOnline: boolean) => {
    return isOnline ? "bg-green-500/10" : "bg-red-500/10"
  }

  // Format data for charts
  const resourceAllocation = analyticsData?.resources?.resources_by_type?.map((r: any) => ({
    name: r.type.charAt(0).toUpperCase() + r.type.slice(1),
    value: r.count,
    deployed: r.deployed
  })) || []

  // Generate Incidents Over Time from actual incident data
  // Group incidents by hour for the last 12 hours
  const generateIncidentsOverTime = () => {
    const hoursMap = new Map<string, { created: number; resolved: number }>();
    const now = new Date();

    // Initialize last 8 hours with 0
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourKey = d.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }) + ":00";
      hoursMap.set(hourKey, { created: 0, resolved: 0 });
    }

    // Count incidents (using created_at for creation and resolved_at for resolution)
    incidents.forEach(inc => {
      // Count creations
      if (inc.created_at) {
        const d = new Date(inc.created_at);
        const hourKey = d.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }) + ":00";
        if (hoursMap.has(hourKey)) {
          const current = hoursMap.get(hourKey) || { created: 0, resolved: 0 };
          hoursMap.set(hourKey, { ...current, created: current.created + 1 });
        }
      }

      // Count resolutions
      if (inc.resolved_at) {
        const d = new Date(inc.resolved_at);
        const hourKey = d.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }) + ":00";
        if (hoursMap.has(hourKey)) {
          const current = hoursMap.get(hourKey) || { created: 0, resolved: 0 };
          hoursMap.set(hourKey, { ...current, resolved: current.resolved + 1 });
        }
      }
    });

    return Array.from(hoursMap.entries()).map(([time, counts]) => ({
      time,
      created: counts.created,
      resolved: counts.resolved
    }));
  };

  const incidentsOverTime = generateIncidentsOverTime();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex-shrink-0">
        {/* Overall Health Indicator */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground">System Dashboard</h2>
          <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
            <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-tight">System Operational</span>
          </div>
        </div>

        {/* System Status - Cleaned up */}
        <div className="grid grid-cols-1 gap-2 py-2 border-y border-border/50 mb-4 bg-muted/20 -mx-4 px-4">
          {/* <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-2">
              <Radio className={`w-3.5 h-3.5 ${getStatusColor(systemStatus.voiceCall.online)}`} />
              <span className="text-xs font-semibold">Voice Channels</span>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">{systemStatus.voiceCall.online ? 'Active' : 'Offline'}</span>
          </div> */}
          <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-2">
              <MessageSquare className={`w-3.5 h-3.5 ${getStatusColor(systemStatus.sms.online)}`} />
              <span className="text-xs font-semibold">SMS Gateway</span>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">{systemStatus.sms.online ? 'Online' : 'Error'}</span>
          </div>
          <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-2">
              <Wifi className={`w-3.5 h-3.5 ${getStatusColor(systemStatus.bluetoothMesh.online)}`} />
              <span className="text-xs font-semibold">Mesh Network</span>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">{systemStatus.bluetoothMesh.online ? 'Ready' : 'Syncing'}</span>
          </div>
        </div>

        {/* Performance Overview Section */}
        {analyticsData && (
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">
              Incident Performance
            </h3>

            <div className="grid grid-cols-1 gap-2">
              {/* Avg performance metrics can be added here */}
            </div>
          </div>
        )}
      </div>

      {/* Scrollable content with graphs */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Incidents Over Time Graph */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Incidents Activity
          </h3>
          <div className="bg-muted/30 rounded-lg p-2 border border-border">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={incidentsOverTime} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 0, 255, 0.15)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--color-muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--color-muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--color-card))",
                    border: "1px solid hsl(var(--color-border))",
                  }}
                />
                <Line type="monotone" dataKey="created" name="New" stroke="#a855f7" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#22c55e" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resource Allocation Graph */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
            <PieChart className="w-3 h-3" />
            Equipment Allocation
          </h3>
          <div className="bg-muted/30 rounded-lg p-2 border border-border">
            {resourceAllocation.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={resourceAllocation} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 0, 255, 0.15)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--color-muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--color-muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--color-card))",
                      border: "1px solid hsl(var(--color-border))",
                    }}
                  />
                  <Bar dataKey="value" fill="#a855f7" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-xs text-muted-foreground">
                No resource data available
              </div>
            )}
          </div>
        </div>

        {/* Severity Distribution */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Severity Distribution
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span className="text-foreground">Critical</span>
              </div>
              <span className="font-semibold text-primary">
                {incidents.filter((i) => i.severity === "critical").length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 dark:bg-orange-400 rounded-full" />
                <span className="text-foreground">High</span>
              </div>
              <span className="font-semibold text-orange-600 dark:text-orange-400">
                {incidents.filter((i) => i.severity === "high").length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 dark:bg-yellow-400 rounded-full" />
                <span className="text-foreground">Medium</span>
              </div>
              <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                {incidents.filter((i) => i.severity === "medium").length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full" />
                <span className="text-foreground">Low</span>
              </div>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {incidents.filter((i) => i.severity === "low").length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
