"use client"

import { useEffect, useRef } from "react"
import { personnelAPI } from "@/lib/api"

/**
 * Hook to periodically update the responder's location in the backend.
 * Only runs if the user is in responder mode.
 */
export function useResponderLocation(responderId: number | null, isEnabled: boolean) {
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (!isEnabled || !responderId) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
            return
        }

        const updateLocation = () => {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        try {
                            await personnelAPI.updateLocation(
                                responderId,
                                position.coords.latitude,
                                position.coords.longitude
                            )
                        } catch (error) {
                            console.error("Failed to update responder location:", error)
                        }
                    },
                    (error) => {
                        console.error("Geolocation error:", error)
                    },
                    { enableHighAccuracy: true }
                )
            }
        }

        // Initial update
        updateLocation()

        // Periodic update every 10 seconds
        intervalRef.current = setInterval(updateLocation, 10000)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [responderId, isEnabled])
}
