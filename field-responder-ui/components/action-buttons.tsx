"use client"

import { Phone, Camera, AlertCircle, CheckCircle, MapPin, Loader2, X } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { incidentsAPI } from "@/lib/api"

interface ActionButtonsProps {
  status?: "en-route" | "arrived" | "complete"
  onStatusChange?: (status: "en-route" | "arrived" | "complete") => void
  onResolve?: () => void
  incidentId?: number
}

export default function ActionButtons({ status, onStatusChange, onResolve, incidentId }: ActionButtonsProps) {
  const [showToast, setShowToast] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isCalling, setIsCalling] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number, lng: number } | null>(null)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Error getting location", err)
      )
    }
  }, [])

  const showNotification = (message: string) => {
    setShowToast(message)
    setTimeout(() => setShowToast(null), 3000)
  }

  const handleCamera = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      )
    }
    fileInputRef.current?.click()
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && incidentId) {
      setIsUploading(true)
      setIsCapturing(true)

      try {
        await incidentsAPI.uploadFile(incidentId, file)
        const locStr = currentLocation ? ` at ${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}` : ""
        showNotification(`📸 Geo-tagged evidence captured${locStr}`)
      } catch (error) {
        console.error("Upload failed", error)
        showNotification("❌ Failed to upload evidence")
      } finally {
        setIsUploading(false)
        setIsCapturing(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }
  }

  const handleCall = () => {
    setIsCalling(true)
    showNotification("📞 Calling dispatch...")
    setTimeout(() => setIsCalling(false), 2000)
  }

  const handleSOS = () => {
    showNotification("🚨 SOS Alert sent to all nearby units!")
  }

  const handleResolveClick = () => {
    if (confirm("Submit incident for Supervisor Review? Resources will remain assigned until confirmed.")) {
        setIsResolving(true)
        showNotification("✅ Submitting for review...")
        if (onResolve) onResolve()
        setTimeout(() => setIsResolving(false), 2000)
    }
  }

  return (
    <>
      <div className="fixed bottom-24 right-4 flex flex-col gap-3 z-[60]">
        {/* Submit for Review (Visible if en-route or arrived) */}
        {(status === 'arrived' || status === 'en-route') && (
             <button
              onClick={handleResolveClick}
              className={`w-16 h-16 rounded-full shadow-apple-lg flex items-center justify-center transition-apple hover:scale-110 ios-press glass-strong border-2 border-primary/50 bg-primary/20 text-primary active:scale-95 ${isResolving ? "animate-pulse" : ""}`}
            >
              <CheckCircle className="w-7 h-7" strokeWidth={2.5} />
            </button>
        )}

        {/* SOS / Emergency */}
        <button
          onClick={handleSOS}
          className="w-16 h-16 rounded-full shadow-apple-lg flex items-center justify-center transition-apple hover:scale-110 ios-press glass-strong bg-accent/20 text-accent border-2 border-accent/30 animate-pulse active:scale-95"
        >
          <AlertCircle className="w-7 h-7" strokeWidth={2.5} />
        </button>

        {/* Request Backup / Call */}
        <button
          onClick={handleCall}
          className={`w-16 h-16 rounded-full shadow-apple-lg flex items-center justify-center transition-apple hover:scale-110 ios-press glass-strong border border-border/50 active:scale-95 ${isCalling ? "bg-primary/20 scale-110" : ""
            }`}
        >
          <Phone className={`w-6 h-6 text-primary transition-transform ${isCalling ? "animate-bounce" : ""}`} strokeWidth={2} />
        </button>

        {/* Log Evidence / Camera */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="hidden"
        />
        <button
          onClick={handleCamera}
          disabled={isUploading}
          className={`w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-apple-lg flex items-center justify-center transition-apple hover:scale-110 ios-press active:scale-95 ${isCapturing ? "scale-95 brightness-125" : ""} ${isUploading ? "opacity-80" : ""}`}
        >
          {isUploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Camera className="w-6 h-6" strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top duration-300">
          <div className="glass-strong px-6 py-3 rounded-2xl shadow-apple-lg border border-border/50 max-w-[90vw]">
            <p className="text-sm font-medium text-foreground text-center">{showToast}</p>
          </div>
        </div>
      )}
    </>
  )
}
