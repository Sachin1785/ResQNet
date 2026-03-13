"use client"

import { useState, useEffect } from "react"
import { MapPin, Search, Filter, Home, Heart, Droplet, Tent, Info, Loader2 } from "lucide-react"
import dynamic from "next/dynamic"
import { resourcesAPI } from "@/lib/api"
import { cn } from "@/lib/utils"

// Dynamic import for Leaflet map
const ResourceMap = dynamic(() => import("@/components/user/resource-map-leaftlet"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-muted flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
    ),
})

export default function ResourcesView() {
    const [resources, setResources] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null)

    useEffect(() => {
        // Get user location
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    })
                },
                (err) => console.error("Location access denied", err)
            )
        }

        const fetchResources = async () => {
            try {
                setLoading(true)
                const response = await resourcesAPI.getPublic()
                if (response.success) {
                    setResources(response.resources)
                }
            } catch (error) {
                console.error("Failed to fetch resources:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchResources()
    }, [])

    const { calculateDistance } = require("@/lib/utils")

    const processedResources = resources.map(res => {
        let distance = null
        if (userLocation && res.lat && res.lng) {
            distance = calculateDistance(userLocation.lat, userLocation.lng, res.lat, res.lng)
        }
        return { ...res, distance }
    })

    const filteredResources = processedResources
        .filter(res => {
            const matchesFilter = filter === "all" || res.type === filter
            const matchesSearch = res.name.toLowerCase().includes(searchQuery.toLowerCase())
            return matchesFilter && matchesSearch
        })
        .sort((a, b) => {
            if (a.distance && b.distance) return a.distance - b.distance
            return 0
        })

    const resourceTypes = [
        { id: "all", label: "All", icon: Filter },
        { id: "shelter", label: "Shelter", icon: Home },
        { id: "medical", label: "Medical", icon: Heart },
        { id: "food_water", label: "Food/Water", icon: Droplet },
    ]

    return (
        <div className="flex flex-col h-full bg-background relative pb-20 ">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-background/80 backdrop-blur-md z-10">
                <h1 className="text-xl font-bold mb-3">Community Resources</h1>
                
                {/* Search */}
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                        type="text" 
                        placeholder="Search shelters, medical..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {resourceTypes.map((type) => {
                        const Icon = type.icon
                        return (
                            <button
                                key={type.id}
                                onClick={() => setFilter(type.id)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border",
                                    filter === type.id 
                                        ? "bg-primary text-primary-foreground border-primary" 
                                        : "bg-card text-muted-foreground border-border hover:border-primary/50"
                                )}
                            >
                                <Icon className="w-3 h-3" />
                                {type.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Content (Map or List) */}
            <div className="flex-1 overflow-hidden relative m-1">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-sm">Finding help nearby...</p>
                    </div>
                ) : (
                    <div className="h-full w-full">
                         <ResourceMap resources={filteredResources} />
                         
                         {/* Floating List Card for closest resource? OR Toggle */}
                         {/* For now, just the map is enough, markers will show details */}
                     </div> 
                 )} 
            </div>
            
            {/* Legend / Info Overlay or Nearest Help Banner */}
            <div className="relative z-[50] mb-5">
                {filteredResources.length > 0 && filteredResources[0].distance !== null ? (
                    <div className="bg-primary text-primary-foreground border border-primary/20 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-500">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 fill-primary-foreground/20" />
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-90">Nearest Assistance</span>
                            </div>
                            <span className="text-xs font-black bg-white/20 px-2 py-0.5 rounded-full">
                                {filteredResources[0].distance.toFixed(1)} KM
                            </span>
                        </div>
                        <h3 className="text-lg font-black leading-tight mb-1">{filteredResources[0].name}</h3>
                        <p className="text-xs font-medium opacity-80 leading-relaxed">
                           
                        </p>
                    </div>
                ) : (
                    <div className="bg-card/90 backdrop-blur border border-border rounded-xl p-3 shadow-lg pointer-events-none">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-medium">Public Assistance</p>
                                <p className="text-[10px] text-muted-foreground">
                                    These resources are verified by Crisis Command. 
                                    Tap a marker for details and directions.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
