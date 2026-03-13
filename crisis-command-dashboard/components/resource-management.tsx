"use client"

import { useState, useEffect } from "react"
import { Truck, Plus, Package, MapPin, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { resourcesAPI } from "@/lib/api"
import { cn } from "@/lib/utils"

export function ResourceManagement({ incidents, resources, pickedLocation, onActivatePicker }: { 
    incidents: any[], 
    resources: any[], 
    pickedLocation?: { lat: number, lng: number } | null,
    onActivatePicker?: () => void
}) {
    // const [resources, setResources] = useState<any[]>([]) // Managed by parent now
    const [loading, setLoading] = useState(false)
    const [showAddForm, setShowAddForm] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    
    // For assignment dropdown
    const [assigningId, setAssigningId] = useState<number | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        type: "shelter",
        status: "available",
        lat: "",
        lng: "",
        is_public: true,
        description: ""
    })

    // Update form when a location is picked from map
    useEffect(() => {
        if (pickedLocation) {
            setFormData(prev => ({
                ...prev,
                lat: pickedLocation.lat.toFixed(6),
                lng: pickedLocation.lng.toFixed(6)
            }))
            setShowAddForm(true) // Ensure form is open
        }
    }, [pickedLocation])
/*
    const fetchResources = async () => {
        try {
            setLoading(true)
            const response = await resourcesAPI.getAll()
            if (response.success) {
                setResources(response.resources)
            }
        } catch (error) {
            console.error("Error fetching resources:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchResources()
    }, [incidents]) // Refetch when incidents change too, in case assignments change elsewhere? Actually maybe just on mount and updates.
*/

    const handleAddResource = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)
        setIsSubmitting(true)

        try {
            const dataToSubmit = {
                ...formData,
                lat: parseFloat(formData.lat) || 0,
                lng: parseFloat(formData.lng) || 0
            }

            const response = await resourcesAPI.create(dataToSubmit)
            if (response.success) {
                setSuccess("Resource created successfully!")
                setFormData({
                    name: "",
                    type: "shelter",
                    status: "available",
                    lat: "",
                    lng: "",
                    is_public: true,
                    description: ""
                })
                setShowAddForm(false)
                setShowAddForm(false)
                // fetchResources() // Parent will update via websocket or refresh logic eventually, or we could trigger a refresh callback if passed

                // Clear success message after 3 seconds
                setTimeout(() => setSuccess(null), 3000)
            }
        } catch (err: any) {
            setError(err.message || "Failed to create resource")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleAssignResource = async (resourceId: number, incidentId: string | number) => {
        try {
            const isUnassigning = incidentId === '' || incidentId === 'unassign';
            const payload = {
                assigned_incident_id: isUnassigning ? null : Number(incidentId),
                status: isUnassigning ? 'available' : 'deployed'
            };
            
            const response = await resourcesAPI.update(resourceId, payload);
            if (response.success) {
                setSuccess(isUnassigning ? "Resource unassigned" : "Resource assigned to incident")
                setAssigningId(null)
                setAssigningId(null)
                // fetchResources() 
                setTimeout(() => setSuccess(null), 2000)
                setTimeout(() => setSuccess(null), 2000)
            }
        } catch (error) {
            console.error("Error assigning resource:", error)
            setError("Failed to update assignment")
        }
    }

    const getLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData(prev => ({
                        ...prev,
                        lat: position.coords.latitude.toString(),
                        lng: position.coords.longitude.toString()
                    }))
                },
                (error) => {
                    console.error("Error getting location:", error)
                    // Default to Mumbai if fails
                    setFormData(prev => ({
                        ...prev,
                        lat: "19.0760",
                        lng: "72.8777"
                    }))
                }
            )
        }
    }

    return (
        <div className="flex flex-col h-full bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-lg">Resource Management</h2>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all"
                    title="Add Resource"
                >
                    <Plus className="w-5 h-5" />
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
                    <form onSubmit={handleAddResource} className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            New Resource
                        </h3>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Resource Name</label>
                            <input
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Central Medical Camp"
                                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="shelter">Shelter</option>
                                    <option value="medical">Medical</option>
                                    <option value="food_water">Food & Water</option>
                                    <option value="police">Police</option>
                                    <option value="transport">Transport</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="available">Available</option>
                                    <option value="active">Active</option>
                                    <option value="deployed">Deployed</option>
                                    <option value="maintenance">Maintenance</option>
                                </select>
                            </div>
                        </div>

                         <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Latitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={formData.lat}
                                    onChange={e => setFormData({ ...formData, lat: e.target.value })}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Longitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={formData.lng}
                                    onChange={e => setFormData({ ...formData, lng: e.target.value })}
                                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <button 
                                type="button" 
                                onClick={getLocation}
                                className="text-xs text-primary font-bold flex items-center gap-1 hover:underline"
                            >
                                <MapPin className="w-3 h-3" />
                                Get Current Location
                            </button>
                            
                            <button 
                                type="button" 
                                onClick={onActivatePicker}
                                className="text-xs text-accent font-bold flex items-center gap-1 hover:underline"
                            >
                                <MapPin className="w-3 h-3" />
                                📍 Pick on Map
                            </button>
                        </div>

                        <div className="flex items-center gap-2 py-1">
                            <input 
                                type="checkbox"
                                id="is_public"
                                checked={formData.is_public}
                                onChange={e => setFormData({...formData, is_public: e.target.checked})}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor="is_public" className="text-sm">Publicly Visible via App</label>
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
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Create Resource
                            </button>
                        </div>
                    </form>
                )}

                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 mb-2">Deployed Resources ({resources.length})</h3>
                    {loading && resources.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 opacity-50">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <p className="text-xs">Loading resources...</p>
                        </div>
                    ) : resources.length === 0 ? (
                        <div className="text-center py-10 bg-muted/20 border border-dashed border-border rounded-2xl">
                            <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-20" />
                            <p className="text-sm text-muted-foreground">No resources found.</p>
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="mt-2 text-xs text-primary font-bold hover:underline"
                            >
                                Add your first resource
                            </button>
                        </div>
                    ) : (
                        resources.map((resource) => (
                            <div key={resource.id} className="bg-muted/40 border border-border rounded-2xl p-3 hover:border-primary/30 transition-all group">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm",
                                            resource.status === 'active' || resource.status === 'deployed' ? "bg-success" :
                                                resource.status === 'maintenance' ? "bg-destructive shadow-destructive/20" :
                                                    "bg-blue-500 shadow-blue-500/20"
                                        )}>
                                            {resource.type === 'medical' ? 'M' : 
                                            resource.type === 'shelter' ? 'S' :
                                            resource.type === 'police' ? 'P' :
                                            resource.type === 'food_water' ? 'F' : 'R'}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm">{resource.name}</div>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                                                    {resource.type}
                                                </span>
                                                <span className={cn(
                                                    "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border",
                                                    (resource.status === 'active' || resource.status === 'deployed' || resource.status === 'available') ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" :
                                                    resource.status === 'maintenance' ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" :
                                                    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                                                )}>
                                                    {resource.status}
                                                </span>
                                                {resource.is_public && (
                                                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800">
                                                        Public
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {resource.assigned_incident_id ? (
                                            <span className="text-primary font-medium flex items-center gap-1">
                                                Assigned
                                                <CheckCircle2 className="w-3 h-3" />
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground text-[10px] italic">Unassigned</span>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Assignment Section */}
                                <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                                     <div className="flex-1 mr-2">
                                        {assigningId === resource.id ? (
                                            <select
                                                autoFocus
                                                className="w-full bg-background border border-border rounded px-2 py-1 text-xs"
                                                onChange={(e) => handleAssignResource(resource.id, e.target.value)}
                                                onBlur={() => setAssigningId(null)}
                                                defaultValue=""
                                            >
                                                <option value="" disabled>Select Incident...</option>
                                                <option value="unassign">Unassign (Make Available)</option>
                                                {incidents.map(inc => (
                                                    <option key={inc.id} value={inc.id}>
                                                        #{inc.id} {inc.title.substring(0, 20)}...
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">
                                                    {resource.assigned_incident_id ? (
                                                        <>Assigned to: <span className="text-foreground font-medium">#{resource.assigned_incident_id}</span></>
                                                    ) : "Ready for assignment"}
                                                </span>
                                                <button 
                                                    onClick={() => setAssigningId(resource.id)}
                                                    className="text-primary hover:underline font-medium"
                                                >
                                                    {resource.assigned_incident_id ? "Change" : "Assign"}
                                                </button>
                                            </div>
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
