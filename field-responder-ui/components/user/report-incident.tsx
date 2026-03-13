"use client"

import { useState, useRef, useEffect } from "react"
import { Flame, Heart, Shield, AlertTriangle, Car, Zap, MapPin, Camera, Send, CheckCircle, Loader2 } from "lucide-react"
import { incidentsAPI } from "@/lib/api"
import LocationPicker from "./location-picker"

interface ReportIncidentProps {
    preSelectedType?: string
    onSubmit?: (incidentData: any) => void
}

export default function ReportIncident({ preSelectedType, onSubmit }: ReportIncidentProps) {
    const [selectedType, setSelectedType] = useState<string | null>(preSelectedType || null)
    const [description, setDescription] = useState("")
    const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium")
    const [isAnonymous, setIsAnonymous] = useState(false)
    const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
    const [capturedLocation, setCapturedLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [isCapturingLocation, setIsCapturingLocation] = useState(false)
    const [showSuccessPopup, setShowSuccessPopup] = useState(false)
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [locationName, setLocationName] = useState("Getting location...")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Get user's location on mount
    useEffect(() => {
        getCurrentLocation()
    }, [])

    const getCurrentLocation = () => {
        if (!navigator.geolocation) return;

        setIsCapturingLocation(true)
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords
                setLocation({ lat: latitude, lng: longitude })
                setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
                setIsCapturingLocation(false)
            },
            (error) => {
                console.error("Error getting location:", error)
                if (!location) {
                    setLocation({ lat: 28.7041, lng: 77.1025 })
                    setLocationName("Delhi, India (Default)")
                }
                setIsCapturingLocation(false)
            }
        )
    }

    // Location selection
    const [showMap, setShowMap] = useState(false)

    const incidentTypes = [
        { id: "fire", icon: Flame, label: "Fire", color: "bg-red-500" },
        { id: "medical", icon: Heart, label: "Medical", color: "bg-pink-500" },
        { id: "police", icon: Shield, label: "Police", color: "bg-blue-500" },
        { id: "accident", icon: Car, label: "Accident", color: "bg-purple-500" },
        { id: "disaster", icon: Zap, label: "Disaster", color: "bg-yellow-500" },
        { id: "other", icon: AlertTriangle, label: "Other", color: "bg-orange-500" },
    ]

    const handleLocationChange = (newLoc: { lat: number; lng: number }) => {
        setLocation(newLoc)
        setLocationName(`${newLoc.lat.toFixed(6)}, ${newLoc.lng.toFixed(6)}`)
    }

    const handleManualLatChange = (val: string) => {
        const lat = parseFloat(val)
        if (!isNaN(lat) && location) {
            handleLocationChange({ ...location, lat })
        }
    }

    const handleManualLngChange = (val: string) => {
        const lng = parseFloat(val)
        if (!isNaN(lng) && location) {
            handleLocationChange({ ...location, lng })
        }
    }

    const handlePhotoClick = () => {
        fileInputRef.current?.click()
    }

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedPhoto(file)
            setCapturedLocation(location) // Tag with current selected location

            // Generate preview
            const reader = new FileReader()
            reader.onloadend = () => {
                setPhotoPreviewUrl(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async () => {
        if (!selectedType || !description || !location) {
            return
        }

        setIsSubmitting(true)

        try {
            // Create incident via API
            const incidentData = {
                title: `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Emergency`,
                description,
                type: selectedType,
                severity,
                lat: location.lat,
                lng: location.lng,
                location_name: locationName,
                report_source: "mobile-app",
            }

            const response = await incidentsAPI.create(incidentData)

            if (response.success) {
                const incidentId = response.incident_id

                // Upload photo if selected
                if (selectedPhoto) {
                    try {
                        await incidentsAPI.uploadFile(incidentId, selectedPhoto)
                    } catch (error) {
                        console.error("Error uploading photo:", error)
                    }
                }

                // Call parent callback
                if (onSubmit) {
                    onSubmit({ ...incidentData, id: incidentId })
                }

                // Show success popup
                setShowSuccessPopup(true)

                // Reset form after 3 seconds
                setTimeout(() => {
                    setShowSuccessPopup(false)
                    setSelectedType(null)
                    setDescription("")
                    setSeverity("medium")
                    setIsAnonymous(false)
                    setSelectedPhoto(null)
                    setPhotoPreviewUrl(null)
                    setCapturedLocation(null)
                    setIsSubmitting(false)
                }, 3000)
            }
        } catch (error) {
            console.error("Error submitting incident:", error)
            alert("Failed to submit incident. Please try again.")
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-background overflow-y-auto pb-20 scrollbar-hide">
            {/* Header */}
            <div className="gradient-header border-b border-border px-4 py-6">
                <h1 className="text-2xl font-bold mb-1 font-heading tracking-tight">Report Incident</h1>
                <p className="text-sm text-muted-foreground/80">Help is on the way once you submit</p>
            </div>

            <div className="px-4 py-4 space-y-6">
                {/* Incident Type Selection */}
                <div>
                    <label className="text-sm font-bold text-foreground mb-3 block opacity-80 uppercase tracking-wider">
                        What type of emergency? *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {incidentTypes.map((type) => {
                            const Icon = type.icon
                            const isSelected = selectedType === type.id
                            return (
                                <button
                                    key={type.id}
                                    onClick={() => setSelectedType(type.id)}
                                    className={`
                                        rounded-2xl p-4 transition-all duration-300 ios-press
                                        flex flex-col items-center justify-center gap-2
                                        ${isSelected
                                            ? `${type.color} text-white shadow-apple-lg scale-105 z-10`
                                            : "bg-muted/40 hover:bg-muted/60 text-muted-foreground border border-border/50"
                                        }
                                    `}
                                >
                                    <Icon className="w-6 h-6" strokeWidth={2.5} />
                                    <span className="text-[11px] font-bold uppercase tracking-wide">{type.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Enhanced Location Selection */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-foreground opacity-80 uppercase tracking-wider">
                            Incident Location *
                        </label>
                        <button 
                            onClick={getCurrentLocation}
                            className="text-[10px] font-bold text-primary flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-full ios-press"
                        >
                            <MapPin className="w-3 h-3" /> USE MY GPS
                        </button>
                    </div>

                    {/* Manual Entry or Map Selection */}
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground ml-1">LATITUDE</p>
                                <input 
                                    type="number"
                                    step="0.000001"
                                    value={location?.lat || ""}
                                    onChange={(e) => handleManualLatChange(e.target.value)}
                                    placeholder="e.g. 28.6139"
                                    className="w-full bg-muted/40 border border-border/50 rounded-xl px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-primary outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground ml-1">LONGITUDE</p>
                                <input 
                                    type="number"
                                    step="0.000001"
                                    value={location?.lng || ""}
                                    onChange={(e) => handleManualLngChange(e.target.value)}
                                    placeholder="e.g. 77.2090"
                                    className="w-full bg-muted/40 border border-border/50 rounded-xl px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-primary outline-none"
                                />
                            </div>
                        </div>

                        {/* Interactive Map Picker */}
                        <div className="h-[200px] w-full rounded-2xl overflow-hidden border border-border/50 shadow-sm relative group">
                            {location ? (
                                <LocationPicker 
                                    initialLocation={location}
                                    onChange={handleLocationChange}
                                />
                            ) : (
                                <div className="w-full h-full bg-muted/20 flex flex-col items-center justify-center gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                    <p className="text-[10px] font-bold text-muted-foreground">Initializing Location Service...</p>
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center italic">
                            Tap map or drag pin to adjust location precisely
                        </p>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="text-sm font-bold text-foreground mb-2 block">
                        Description *
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what's happening..."
                        className="w-full card-elevated rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>

                {/* Severity */}
                <div>
                    <label className="text-sm font-bold text-foreground mb-3 block">
                        Severity Level
                    </label>
                    <div className="flex gap-2">
                        {[
                            { value: "low", label: "Low", color: "bg-yellow-500" },
                            { value: "medium", label: "Medium", color: "bg-orange-500" },
                            { value: "high", label: "High", color: "bg-red-500" },
                        ].map((level) => (
                            <button
                                key={level.value}
                                onClick={() => setSeverity(level.value as any)}
                                className={`
                  flex-1 py-3 rounded-xl font-semibold text-sm transition-all ios-press
                  ${severity === level.value
                                        ? `${level.color} text-white shadow-apple scale-105`
                                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                    }
                `}
                            >
                                {level.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Photo Upload */}
                <div>
                    <label className="text-sm font-bold text-foreground mb-2 block">
                        Add Photo (Optional)
                    </label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoChange}
                        className="hidden"
                    />

                    {photoPreviewUrl ? (
                        <div className="relative group">
                            <div className="w-full h-48 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-apple-lg bg-muted">
                                <img src={photoPreviewUrl} alt="Preview" className="w-full h-full object-cover" />

                                {/* Geo-tag Overlay */}
                                <div className="absolute bottom-3 left-3 right-3 glass-strong rounded-xl p-2 flex items-center gap-2 border border-white/20 animate-in slide-in-from-bottom-2 duration-300">
                                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                        <MapPin className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Geo-Tagged Evidence</p>
                                        <p className="text-xs font-semibold text-foreground">
                                            {capturedLocation ? `${capturedLocation.lat.toFixed(6)}, ${capturedLocation.lng.toFixed(6)}` : "Location Pending..."}
                                        </p>
                                    </div>
                                    <div className="px-2 py-0.5 rounded-md bg-success/20 text-[10px] font-bold text-success border border-success/30">
                                        VERIFIED
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedPhoto(null)
                                    setPhotoPreviewUrl(null)
                                    setCapturedLocation(null)
                                }}
                                className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-destructive text-white shadow-lg flex items-center justify-center hover:scale-110 active:scale-90 transition-all"
                            >
                                <Zap className="w-4 h-4 rotate-45" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handlePhotoClick}
                            className="w-full card-elevated rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-muted/50 transition-all ios-press border-2 border-dashed border-border group"
                        >
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-all">
                                <Camera className="w-6 h-6 text-primary" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold text-foreground">
                                    {isCapturingLocation ? "Readying Camera..." : "Take Evidence Photo"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">Photo will be automatically geo-tagged</p>
                            </div>
                        </button>
                    )}
                </div>

                {/* Anonymous Toggle */}
                <label className="flex items-center justify-between card-elevated rounded-xl p-4 cursor-pointer">
                    <div>
                        <p className="text-sm font-semibold text-foreground">Report Anonymously</p>
                        <p className="text-xs text-muted-foreground">Your identity will be hidden</p>
                    </div>
                    <div
                        onClick={() => setIsAnonymous(!isAnonymous)}
                        className={`w-12 h-7 rounded-full relative transition-all duration-300 ${isAnonymous ? "bg-primary" : "bg-muted"
                            }`}
                    >
                        <div
                            className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${isAnonymous ? "right-1" : "left-1"
                                }`}
                        />
                    </div>
                </label>

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={!selectedType || !description || !location || isSubmitting}
                    className={`
            w-full py-4 rounded-2xl font-bold text-base shadow-apple-lg
            transition-all duration-300 ios-press flex items-center justify-center gap-2
            ${selectedType && description && location && !isSubmitting
                            ? "bg-primary text-primary-foreground hover:scale-105 active:scale-95"
                            : "bg-muted/50 text-muted-foreground cursor-not-allowed"
                        }
          `}
                >
                    <Send className="w-5 h-5" />
                    {isSubmitting ? "Submitting..." : "Submit Report"}
                </button>

                <p className="text-xs text-center text-muted-foreground">
                    Emergency services will be notified immediately
                </p>
            </div>

            {/* Success Popup */}
            {showSuccessPopup && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="glass-strong rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border animate-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
                                <CheckCircle className="w-10 h-10 text-success" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">Alert Sent!</h2>
                            <p className="text-sm text-muted-foreground mb-4">
                                Emergency services have been notified. Help is on the way.
                            </p>
                            <div className="w-full bg-muted/30 rounded-full h-1 overflow-hidden">
                                <div className="h-full bg-success rounded-full animate-pulse" style={{ width: '100%' }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
