"use client"

import { Home, List, MessageSquare, Users, User, FileText, MapPin, Bell } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomNavProps {
    activeTab: string
    onTabChange: (tab: string) => void
    mode: "user" | "responder"
}

export default function BottomNav({ activeTab, onTabChange, mode }: BottomNavProps) {
    // User mode navigation
    const userNavItems = [
        { id: "home", icon: Home, label: "Home" },
        { id: "report", icon: FileText, label: "Report" },
        { id: "resources", icon: MapPin, label: "Resources" },
        { id: "alerts", icon: Bell, label: "Alerts" },
        { id: "profile", icon: User, label: "Profile" },
    ]

    // Responder mode navigation
    const responderNavItems = [
        { id: "mission", icon: Home, label: "Mission" },
        { id: "incidents", icon: List, label: "Incidents" },
        { id: "comms", icon: MessageSquare, label: "Comms" },
        { id: "team", icon: Users, label: "Team" },
        { id: "profile", icon: User, label: "Profile" },
    ]

    const navItems = mode === "user" ? userNavItems : responderNavItems

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
            <div className="w-full glass-strong border-t border-border/50 shadow-apple-lg">
                <div className="flex items-center justify-around px-1 py-1.5">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = activeTab === item.id

                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-300 min-w-[60px] ios-press",
                                    isActive
                                        ? "bg-primary/15 scale-105"
                                        : "hover:bg-muted/50 active:bg-muted/70"
                                )}
                            >
                                <div className={cn(
                                    "relative transition-all duration-300",
                                    isActive && "scale-110"
                                )}>
                                    <Icon className={cn(
                                        "w-5 h-5 transition-colors duration-300",
                                        isActive ? "text-primary" : "text-muted-foreground"
                                    )} />
                                    {isActive && (
                                        <div className="absolute -inset-2 bg-primary/20 rounded-full blur-md -z-10 animate-pulse" />
                                    )}
                                </div>
                                <span className={cn(
                                    "text-[10px] font-semibold transition-all duration-300",
                                    isActive ? "text-primary opacity-100 scale-100" : "text-muted-foreground opacity-70 scale-95"
                                )}>
                                    {item.label}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </nav>
    )
}


