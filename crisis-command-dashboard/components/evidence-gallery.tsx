"use client"

import { useState, useEffect } from "react"
import { Image as ImageIcon, Calendar, MapPin, Loader2, X, ExternalLink, Filter } from "lucide-react"
import { incidentsAPI } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function EvidenceGallery() {
    const [attachments, setAttachments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedImage, setSelectedImage] = useState<any | null>(null)
    const [filter, setFilter] = useState("all")

    useEffect(() => {
        fetchAttachments()
    }, [])

    const fetchAttachments = async () => {
        try {
            setLoading(true)
            const response = await incidentsAPI.getAllAttachments(50)
            if (response.success) {
                setAttachments(response.attachments)
            }
        } catch (error) {
            console.error("Failed to fetch attachments:", error)
        } finally {
            setLoading(false)
        }
    }

    const filteredAttachments = attachments.filter(attr => {
        if (filter === "all") return true
        return attr.incident_severity === filter
    })

    const getImageUrl = (path: string) => {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'
        return `${baseUrl}/${path}`
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p className="text-sm">Loading field evidence...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-card overflow-hidden">
            {/* Gallery Header */}
            <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
                <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Field Evidence</h2>
                </div>
                <div className="flex items-center gap-2">
                     <select 
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="text-[10px] bg-muted/50 border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary/30"
                     >
                        <option value="all">All Severities</option>
                        <option value="critical">Critical Only</option>
                        <option value="high">High Only</option>
                     </select>
                </div>
            </div>

            {/* Gallery Grid */}
            <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
                {filteredAttachments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center opacity-50">
                        <ImageIcon className="w-10 h-10 mb-2" />
                        <p className="text-xs">No evidence photos found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {filteredAttachments.map((attr) => (
                            <div 
                                key={attr.id}
                                onClick={() => setSelectedImage(attr)}
                                className="group relative aspect-square rounded-xl overflow-hidden border border-border/40 bg-muted cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg active:scale-95"
                            >
                                <img 
                                    src={getImageUrl(attr.filepath)} 
                                    alt={attr.filename}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                
                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                                
                                {/* Labels */}
                                <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-0.5">
                                    <p className="text-[10px] font-black text-white truncate drop-shadow-md uppercase tracking-tight">
                                        {attr.incident_title}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className={cn(
                                            "text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                                            attr.incident_severity === 'critical' ? 'bg-primary text-white' : 'bg-orange-500 text-black'
                                        )}>
                                            {attr.incident_severity}
                                        </span>
                                        <span className="text-[8px] text-white/70 font-medium">
                                            {new Date(attr.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Lightbox / Modal */}
            {selectedImage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    <button 
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    
                    <div className="max-w-4xl w-full flex flex-col md:flex-row gap-6 bg-card rounded-2xl overflow-hidden border border-border/50 shadow-2xl">
                        <div className="flex-1 bg-black flex items-center justify-center min-h-[300px] md:min-h-[500px]">
                            <img 
                                src={getImageUrl(selectedImage.filepath)} 
                                alt={selectedImage.filename}
                                className="max-w-full max-h-[70vh] object-contain"
                            />
                        </div>
                        
                        <div className="w-full md:w-80 p-6 flex flex-col gap-4">
                            <div>
                                <h3 className="text-xl font-black text-foreground mb-1">{selectedImage.incident_title}</h3>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className={cn(
                                        "text-xs font-black px-2 py-0.5 rounded uppercase",
                                        selectedImage.incident_severity === 'critical' ? 'bg-primary/20 text-primary' : 'bg-orange-500/20 text-orange-600'
                                    )}>
                                        {selectedImage.incident_severity} Priority
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3 py-4 border-y border-border/40">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Captured At</p>
                                        <p className="text-sm font-semibold">{new Date(selectedImage.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">File Details</p>
                                        <p className="text-sm font-semibold truncate">{selectedImage.filename}</p>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => window.open(getImageUrl(selectedImage.filepath), '_blank')}
                                className="mt-auto w-full flex items-center justify-center gap-2 bg-primary py-3 rounded-xl text-primary-foreground font-black hover:bg-primary/90 transition-all shadow-lg active:scale-95"
                            >
                                <ExternalLink className="w-4 h-4" />
                                VIEW ORIGIN SOURCE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
