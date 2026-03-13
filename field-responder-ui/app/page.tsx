"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import LoginPage from "./login/page"

export default function Home() {
    const router = useRouter()

    useEffect(() => {
        // Check if user is already logged in
        const token = localStorage.getItem('authToken')
        const userStr = localStorage.getItem('currentUser')

        if (token && userStr) {
            const user = JSON.parse(userStr)
            // Redirect based on role
            if (user.role === 'responder') {
                router.push('/responder')
            } else {
                router.push('/user')
            }
        }
    }, [router])

    return <LoginPage />
}
