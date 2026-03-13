"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

type AppMode = "user" | "responder"

interface ModeContextType {
    mode: AppMode
    setMode: (mode: AppMode) => void
    toggleMode: () => void
}

const ModeContext = createContext<ModeContextType | undefined>(undefined)

export function ModeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setModeState] = useState<AppMode>("user")

    // Load mode from localStorage on mount
    useEffect(() => {
        const savedMode = localStorage.getItem("appMode") as AppMode
        if (savedMode === "user" || savedMode === "responder") {
            setModeState(savedMode)
        }
    }, [])

    const setMode = (newMode: AppMode) => {
        setModeState(newMode)
        localStorage.setItem("appMode", newMode)
    }

    const toggleMode = () => {
        const newMode = mode === "user" ? "responder" : "user"
        setMode(newMode)
    }

    return (
        <ModeContext.Provider value={{ mode, setMode, toggleMode }}>
            {children}
        </ModeContext.Provider>
    )
}

export function useMode() {
    const context = useContext(ModeContext)
    if (context === undefined) {
        throw new Error("useMode must be used within a ModeProvider")
    }
    return context
}
