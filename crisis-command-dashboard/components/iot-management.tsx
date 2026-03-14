"use client"

import { useState, useEffect } from "react"
import { Cpu, Settings, Activity, MapPin, AlertCircle, Save, Droplets, CloudRain, Wind, Gauge } from "lucide-react"
import { iotAPI } from "@/lib/api"
import { useWebSocket } from "@/hooks/use-websocket"

export function IoTManagement() {
  const [configs, setConfigs] = useState<any[]>([])
  const [activeLogs, setActiveLogs] = useState<Record<string, any>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // WebSocket for live stream
  const { isConnected, on, off } = useWebSocket({ autoConnect: true })

  useEffect(() => {
    fetchConfigs()
  }, [])

  useEffect(() => {
    if (!isConnected) return

    const handleStream = (data: any) => {
      setActiveLogs(prev => ({
        ...prev,
        [data.system_id]: data
      }))
    }

    on('iot_data_stream', handleStream)
    return () => off('iot_data_stream', handleStream)
  }, [isConnected, on, off])

  const fetchConfigs = async () => {
    setLoading(true)
    const res = await iotAPI.getConfigs()
    if (res.success) {
      setConfigs(res.configs)
    }
    setLoading(false)
  }

  const handleEdit = (config: any) => {
    setEditingId(config.system_id)
    setEditForm({ ...config })
  }

  const handleSave = async () => {
    if (!editForm) return
    const res = await iotAPI.updateConfig(editForm)
    if (res.success) {
      setEditingId(null)
      fetchConfigs()
    }
  }

  const SENSOR_METRICS = [
    { key: 'gas', label: 'Gas (V)', icon: Wind, unit: 'V' },
    { key: 'temp', label: 'Temp', icon: Activity, unit: '°C' },
    { key: 'water', label: 'Water', icon: Droplets, unit: 'mm' },
    { key: 'accl', label: 'Impact', icon: AlertCircle, unit: 'g' },
    { key: 'rain', label: 'Rain', icon: CloudRain, unit: 'mm' },
    { key: 'pressure', label: 'Pressure', icon: Gauge, unit: 'hPa' },
  ]

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2 mb-1">
          <Cpu className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-foreground">IoT Device Network</h2>
        </div>
        <p className="text-xs text-muted-foreground">Monitoring 10+ data points from ESP32 Mesh</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground animate-pulse">Establishing link to sensors...</div>
        ) : configs.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground italic border-2 border-dashed border-border rounded-xl">
            Waiting for first heartbeat from ESP32...
          </div>
        ) : (
          configs.map(config => (
            <div key={config.system_id} className="glass-card border border-border/50 rounded-xl overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5">
              {/* Header */}
              <div className="p-3 border-b border-border/50 flex items-center justify-between bg-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-gray-400'}`} />
                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] font-bold text-primary tracking-wider">{config.system_id}</span>
                    <span className="text-xs font-semibold text-foreground">{config.name}</span>
                  </div>
                </div>
                <button 
                  onClick={() => editingId === config.system_id ? handleSave() : handleEdit(config)}
                  className="p-1.5 hover:bg-primary/20 rounded-lg text-muted-foreground hover:text-primary transition-all"
                >
                  {editingId === config.system_id ? <Save className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {editingId === config.system_id ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest px-1">Display Name</label>
                      <input 
                        className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                        value={editForm.name}
                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                      />
                    </div>
                    {['gas', 'temp', 'water', 'accl', 'rain', 'pressure'].map(m => (
                      <div key={m}>
                        <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest px-1">{m} Threshold</label>
                        <input 
                          type="number"
                          className="w-full bg-background/50 border border-border rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-primary outline-none"
                          value={editForm[`threshold_${m}`]}
                          onChange={e => setEditForm({...editForm, [`threshold_${m}`]: parseFloat(e.target.value)})}
                        />
                      </div>
                    ))}
                    <div className="col-span-2 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest px-1">Lat</label>
                        <input 
                          type="number"
                          className="w-full bg-background/50 border border-border rounded-lg px-3 py-1.5 text-sm outline-none"
                          value={editForm.lat}
                          onChange={e => setEditForm({...editForm, lat: parseFloat(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest px-1">Lng</label>
                        <input 
                          type="number"
                          className="w-full bg-background/50 border border-border rounded-lg px-3 py-1.5 text-sm outline-none"
                          value={editForm.lng}
                          onChange={e => setEditForm({...editForm, lng: parseFloat(e.target.value)})}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-[11px] px-1">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary" /> {config.location_name}
                      </span>
                      <span className="text-muted-foreground italic">Alt: {activeLogs[config.system_id]?.values?.altitude?.toFixed(1) ?? '---'}m</span>
                    </div>

                    {/* Live Data Visualizer Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {SENSOR_METRICS.map(metric => {
                        const logData = activeLogs[config.system_id]
                        const val = logData?.values?.[metric.key]
                        const threshold = config[`threshold_${metric.key}`]
                        const isBreach = typeof val === 'number' && val > threshold
                        
                        // Dynamic label and unit for gas (PPM vs Voltage)
                        let displayLabel = metric.label
                        let displayUnit = metric.unit
                        
                        if (metric.key === 'gas' && logData?.values?.gas_unit) {
                          displayUnit = logData.values.gas_unit
                          displayLabel = displayUnit === 'ppm' ? 'Gas (PPM)' : 'Gas (V)'
                        }

                        return (
                          <div key={metric.key} className={`p-2.5 rounded-xl border transition-all ${isBreach 
                            ? 'border-primary/40 bg-primary/10 shadow-[inner_0_0_12px_rgba(var(--primary),0.1)]' 
                            : 'border-border/40 bg-muted/20'}`}>
                            <div className="flex items-center justify-between mb-1.5 px-0.5">
                              <div className="flex items-center gap-1.5">
                                <metric.icon className={`w-3.5 h-3.5 ${isBreach ? 'text-primary' : 'text-muted-foreground'}`} />
                                <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-tighter">{displayLabel}</span>
                              </div>
                              {isBreach && <AlertCircle className="w-3.5 h-3.5 text-primary animate-bounce" />}
                            </div>
                            <div className="flex items-baseline gap-1 px-0.5">
                              <span className={`text-xl font-black ${isBreach ? 'text-primary' : 'text-foreground font-mono'}`}>
                                {typeof val === 'number' ? (metric.key === 'accl' ? val.toFixed(2) : val.toFixed(1)) : '---'}
                              </span>
                              <span className="text-[9px] text-muted-foreground font-bold">{displayUnit}</span>
                            </div>
                            <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-500 rounded-full ${isBreach ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                                    style={{ width: val ? `${Math.min((val / threshold) * 100, 100)}%` : '0%' }}
                                />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
