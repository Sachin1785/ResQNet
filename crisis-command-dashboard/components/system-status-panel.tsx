"use client"

import { Radio, MessageSquare, Wifi, AlertCircle, CheckCircle2 } from "lucide-react"

export default function SystemStatusPanel() {
  // Mock system status data
  const systemStatus = {
    voiceCall: { online: true, devices: 3 },
    sms: { online: true, devices: 5 },
    bluetoothMesh: { online: true, devices: 12 },
  }

  const getStatusColor = (isOnline: boolean) => {
    return isOnline ? "text-green-400" : "text-red-500"
  }

  const getStatusBg = (isOnline: boolean) => {
    return isOnline ? "bg-green-500/10" : "bg-red-500/10"
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 opacity-70">
        System Infrastructure
      </h3>

      <div className="space-y-3">
        {/* Voice Call */}
        <div className={`group rounded-xl p-3 border border-border/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-apple-sm ${getStatusBg(systemStatus.voiceCall.online)}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${systemStatus.voiceCall.online ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <Radio className={`w-4 h-4 ${getStatusColor(systemStatus.voiceCall.online)}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground tracking-tight">Voice Channels</p>
                <p className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wide">
                  {systemStatus.voiceCall.online ? 'Channel Active' : 'Offline'}
                </p>
              </div>
            </div>
            <div className={`w-2 h-2 rounded-full animate-pulse ${systemStatus.voiceCall.online ? 'bg-green-400' : 'bg-red-500'}`} />
          </div>
        </div>

        {/* SMS */}
        <div className={`group rounded-xl p-3 border border-border/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-apple-sm ${getStatusBg(systemStatus.sms.online)}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${systemStatus.sms.online ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <MessageSquare className={`w-4 h-4 ${getStatusColor(systemStatus.sms.online)}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground tracking-tight">SMS Gateway</p>
                <p className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wide">
                  {systemStatus.sms.online ? 'Gateway Online' : 'Connection Failed'}
                </p>
              </div>
            </div>
            <div className={`w-2 h-2 rounded-full animate-pulse ${systemStatus.sms.online ? 'bg-green-400' : 'bg-red-500'}`} />
          </div>
        </div>

        {/* Bluetooth Mesh */}
        <div className={`group rounded-xl p-3 border border-border/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-apple-sm ${getStatusBg(systemStatus.bluetoothMesh.online)}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${systemStatus.bluetoothMesh.online ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <Wifi className={`w-4 h-4 ${getStatusColor(systemStatus.bluetoothMesh.online)}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground tracking-tight">Bluetooth Mesh</p>
                <p className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wide">
                  {systemStatus.bluetoothMesh.online ? 'Network Ready' : 'Scanning...'}
                </p>
              </div>
            </div>
            <div className={`w-2 h-2 rounded-full animate-pulse ${systemStatus.bluetoothMesh.online ? 'bg-green-400' : 'bg-red-500'}`} />
          </div>
        </div>
      </div>

      {/* Overall System Health */}
      <div className="mt-6 pt-4 border-t border-border/60">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-70">
              Environment Health
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span className="text-[11px] font-bold text-foreground uppercase tracking-wide">Operational</span>
            </div>
          </div>
          <div className="h-8 w-px bg-border/40" />
          <div className="text-right">
             <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-70">Latency</p>
             <p className="text-[11px] font-bold text-green-500">12ms</p>
          </div>
        </div>
      </div>
    </div>
  )
}
