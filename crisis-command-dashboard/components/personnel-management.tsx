"use client"

import { useState, useEffect } from "react"
import { Users, UserPlus, Shield, Phone, Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { authAPI, personnelAPI } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useWebSocket } from "@/hooks/use-websocket"

export function PersonnelManagement({ onSelectPersonnel, selectedPersonnelId }: { onSelectPersonnel?: (person: any) => void, selectedPersonnelId?: number }) {
    const [personnel, setPersonnel] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddForm, setShowAddForm] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const { on, isConnected } = useWebSocket({
        onConnect: () => console.log('Team Dashboard connected to WebSocket'),
    })

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        username: "",
        password: "password123", // Default password
        personnel_role: "Fire Fighter",
        email: "",
        phone: ""
    })

    const fetchPersonnel = async () => {
        try {
            setLoading(true)
            const response = await personnelAPI.getAll()
            if (response.success) {
                setPersonnel(response.personnel)
            }
        } catch (error) {
            console.error("Error fetching personnel:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPersonnel()
    }, [])

    // Real-time updates
    useEffect(() => {
        if (!isConnected) return

        const handleStatusUpdate = (data: any) => {
            console.log('Real-time status update for personnel:', data)
            setPersonnel(prev => prev.map(p =>
                p.id === data.personnel_id
                    ? { ...p, status: data.status, assigned_incident_id: data.assigned_incident_id }
                    : p
            ))
        }

        const handleLocationUpdate = (data: any) => {
            setPersonnel(prev => {
                const updated = prev.map(p =>
                    p.id === data.personnel_id
                        ? { ...p, lat: data.location.lat, lng: data.location.lng, status: data.status }
                        : p
                )

                // If the personnel wasn't in the list, we might need a fetch or just wait for next poll
                // But generally they should be here if they were registered
                return updated
            })
        }

        on('personnel_status_updated', handleStatusUpdate)
        on('personnel_location_updated', handleLocationUpdate)

        return () => {
        }
    }, [isConnected, on])

    const handleAddResponder = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)
        setIsSubmitting(true)

        try {
            const response = await authAPI.registerResponder(formData)
            if (response.success) {
                setSuccess("Responder registered successfully!")
                setFormData({
                    name: "",
                    username: "",
                    password: "password123",
                    personnel_role: "Fire Fighter",
                    email: "",
                    phone: ""
                })
                setShowAddForm(false)
                fetchPersonnel()

                // Clear success message after 3 seconds
                setTimeout(() => setSuccess(null), 3000)
            }
        } catch (err: any) {
            setError(err.message || "Failed to register responder")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-lg">Team Management</h2>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all"
                    title="Add Responder"
                >
                    <UserPlus className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="p-3 bg-success/10 border border-success/20 text-success text-sm rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {success}
                    </div>
                )}

                {showAddForm && (
                    <form onSubmit={handleAddResponder} className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                            <UserPlus className="w-4 h-4" />
                            New Responder Account
                        </h3>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Full Name</label>
                            <input
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. John Doe"
                                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Username</label>
                                <input
                                    required
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="jdoe123"
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Password</label>
                                <input
                                    required
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Role</label>
                            <select
                                value={formData.personnel_role}
                                onChange={e => setFormData({ ...formData, personnel_role: e.target.value })}
                                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option>Fire Fighter</option>
                                <option>Paramedic</option>
                                <option>Police Officer</option>
                                <option>Hazmat Specialist</option>
                                <option>Rescue Technician</option>
                                <option>Dispatcher</option>
                            </select>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="flex-1 px-3 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                Add Responder
                            </button>
                        </div>
                    </form>
                )}

                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 mb-2">Active Responders ({personnel.length})</h3>
                    {loading && personnel.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 opacity-50">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <p className="text-xs">Loading team...</p>
                        </div>
                    ) : personnel.length === 0 ? (
                        <div className="text-center py-10 bg-muted/20 border border-dashed border-border rounded-2xl">
                            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-20" />
                            <p className="text-sm text-muted-foreground">No responders found.</p>
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="mt-2 text-xs text-primary font-bold hover:underline"
                            >
                                Add your first responder
                            </button>
                        </div>
                    ) : (
                        personnel.map((person) => (
                            <div
                                key={person.id}
                                className={cn(
                                    "bg-muted/40 border border-border rounded-2xl p-3 flex items-center justify-between transition-all group",
                                    selectedPersonnelId === person.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:border-primary/30"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm transition-transform active:scale-90 cursor-pointer",
                                        person.status === 'available' ? "bg-success" :
                                            person.status === 'on-scene' ? "bg-destructive shadow-destructive/20" :
                                                "bg-warning shadow-warning/20"
                                    )} onClick={() => onSelectPersonnel?.(person)}>
                                        {person.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm flex items-center gap-1">
                                            {person.name}
                                            {person.lat && person.lng && (
                                                <span className="text-[8px] bg-primary/10 text-primary px-1 rounded">LIVE</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                            <Shield className="w-3 h-3" />
                                            {person.role}
                                            <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                                            <span className={cn(
                                                "capitalize",
                                                person.status === 'available' ? "text-success" :
                                                    person.status === 'on-scene' ? "text-destructive" :
                                                        "text-warning"
                                            )}>
                                                {person.status}
                                            </span>
                                        </div>
                                        {person.lat && person.lng && (
                                            <div className="text-[9px] text-muted-foreground/60 mt-0.5 font-mono">
                                                {person.lat.toFixed(4)}, {person.lng.toFixed(4)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {person.lat && person.lng && (
                                        <button
                                            onClick={() => onSelectPersonnel?.(person)}
                                            className={cn(
                                                "p-1.5 rounded-lg transition-all",
                                                selectedPersonnelId === person.id
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-primary/10 text-primary hover:bg-primary/20"
                                            )}
                                            title="Locate on Map"
                                        >
                                            <Shield className="w-4 h-4" />
                                        </button>
                                    )}
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        {person.phone && (
                                            <button className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary transition-all">
                                                <Phone className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
