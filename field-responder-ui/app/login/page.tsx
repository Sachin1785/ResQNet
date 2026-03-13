"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogIn, Loader2 } from "lucide-react"

export default function LoginPage() {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
            const response = await fetch(`${apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                },
                body: JSON.stringify({ username, password }),
            })

            const data = await response.json()

            if (data.success) {
                // Store user info and token
                localStorage.setItem('authToken', data.token)
                localStorage.setItem('currentUser', JSON.stringify(data.user))

                // Redirect based on role
                if (data.user.role === 'responder') {
                    router.push('/responder')
                } else {
                    router.push('/user')
                }
            } else {
                setError(data.error || 'Login failed')
            }
        } catch (err) {
            setError('Connection error. Please try again.')
            console.error('Login error:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
                        <LogIn className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">ResQnet</h1>
                    <p className="text-muted-foreground">Sign in to continue</p>
                </div>

                {/* Login Form */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Username */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                required
                                disabled={loading}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                required
                                disabled={loading}
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5" />
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>

                    {/* Demo Credentials */}
                    <div className="mt-6 pt-6 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-3 font-medium">Demo Credentials:</p>
                        <div className="space-y-2 text-xs">
                            <div className="bg-muted/50 px-3 py-2 rounded-lg">
                                <p className="font-medium">Responders:</p>
                                <p className="text-muted-foreground">responder1 / password123</p>
                                <p className="text-muted-foreground">responder2 / password123</p>
                            </div>
                            <div className="bg-muted/50 px-3 py-2 rounded-lg">
                                <p className="font-medium">Users:</p>
                                <p className="text-muted-foreground">user1 / password123</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
