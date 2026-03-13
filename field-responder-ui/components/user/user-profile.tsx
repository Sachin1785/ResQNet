"use client"

import { LogOut, ChevronRight, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useMode } from "@/contexts/mode-context"

export default function UserProfile() {
    const { theme, setTheme } = useTheme()
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const { toggleMode } = useMode()
    const [tapCount, setTapCount] = useState(0)
    const [showModeSwitch, setShowModeSwitch] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('authToken')
        localStorage.removeItem('currentUser')
        router.push('/')
    }

    // Triple-tap detection
    const handleVersionTap = () => {
        setTapCount(prev => prev + 1)

        if (tapCount === 2) {
            // Third tap
            setShowModeSwitch(true)
            setTapCount(0)
        }

        // Reset tap count after 1 second
        setTimeout(() => setTapCount(0), 1000)
    }

    const handleModeSwitch = () => {
        toggleMode()
        setShowModeSwitch(false)
    }



    return (
        <div className="flex flex-col h-full bg-background pb-20 overflow-y-auto">
            {/* Header */}
            <div className="gradient-header border-b border-border">
                <div className="px-4 py-6">
                    <div className="flex items-center gap-4 mb-4">
                        {/* Avatar */}
                        <div className="w-20 h-20 rounded-full bg-primary/20 text-primary ring-4 ring-primary/30 flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-apple">
                            JD
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold mb-1">John Doe</h1>
                            <p className="text-sm text-muted-foreground mb-1">Citizen</p>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-success/20 text-success text-xs font-semibold rounded-full">
                                    Verified
                                </span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Content */}
            <div className="px-4 py-4 space-y-4">
                {/* Theme Toggle */}
                <div className="card-elevated rounded-2xl p-4 shadow-apple">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            {mounted && theme === "dark" ? (
                                <Moon className="w-5 h-5 text-primary" />
                            ) : (
                                <Sun className="w-5 h-5 text-primary" />
                            )}
                            <div>
                                <div className="font-semibold">Appearance</div>
                                <div className="text-xs text-muted-foreground">
                                    {mounted ? (theme === "dark" ? "Dark Mode" : "Light Mode") : "Loading..."}
                                </div>
                            </div>
                        </div>
                    </div>
                    {mounted && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setTheme("light")}
                                className={cn(
                                    "flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold transition-apple ios-press flex items-center justify-center gap-2",
                                    theme === "light"
                                        ? "bg-primary text-primary-foreground shadow-apple"
                                        : "bg-muted/50 hover:bg-muted"
                                )}
                            >
                                <Sun className="w-4 h-4" />
                                Light
                            </button>
                            <button
                                onClick={() => setTheme("dark")}
                                className={cn(
                                    "flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold transition-apple ios-press flex items-center justify-center gap-2",
                                    theme === "dark"
                                        ? "bg-primary text-primary-foreground shadow-apple"
                                        : "bg-muted/50 hover:bg-muted"
                                )}
                            >
                                <Moon className="w-4 h-4" />
                                Dark
                            </button>
                        </div>
                    )}
                </div>

                {/* Menu Items - Sign Out Only */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-all active:scale-[0.99] text-accent"
                    >
                        <div className="flex items-center gap-3">
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Sign Out</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                    </button>
                </div>

                {/* Version Info - Triple Tap to Switch Mode */}
                <div
                    onClick={handleVersionTap}
                    className="text-center text-xs text-muted-foreground py-4 cursor-pointer select-none"
                >
                    ResQnet v2.1.0
                    <br />
                    © 2026 ResQnet
                </div>
            </div>

            {/* Mode Switch Modal */}
            {showModeSwitch && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="glass-strong rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border animate-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-2">Switch to Responder Mode?</h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            You'll be switched to the professional responder interface with mission management capabilities.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowModeSwitch(false)}
                                className="flex-1 py-3 rounded-xl font-semibold bg-muted/50 hover:bg-muted transition-all ios-press"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleModeSwitch}
                                className="flex-1 py-3 rounded-xl font-semibold bg-primary text-primary-foreground shadow-apple transition-all ios-press"
                            >
                                Switch Mode
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
