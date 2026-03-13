"use client"

import { Send, Loader2 } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { useWebSocket } from "@/hooks/use-websocket"

export default function CommunicationsPanel() {
    const [messages, setMessages] = useState<any[]>([])
    const [pendingMessage, setPendingMessage] = useState("")
    const [isSending, setIsSending] = useState(false)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    const { on, off, emit, isConnected } = useWebSocket({
        autoConnect: true,
        onConnect: () => {
            console.log('Communications Panel connected to WebSocket')
        },
    })

    // Load current user from localStorage
    useEffect(() => {
        const userStr = localStorage.getItem('currentUser')
        if (userStr) {
            const user = JSON.parse(userStr)
            setCurrentUser(user)
            console.log('Current user:', user)
        } else {
            // Default command center user if not logged in
            setCurrentUser({
                id: 0,
                name: 'Command Center',
                role: 'user'
            })
        }
    }, [])

    useEffect(() => {
        // Show welcome message
        setMessages([
            {
                id: 'welcome',
                sender_id: null,
                sender_name: 'System',
                message: 'Command Center communications active. All messages are broadcast to field responders.',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'system',
                status: 'read'
            }
        ])
    }, [])

    useEffect(() => {
        if (!isConnected || !currentUser) return

        const handleBroadcastMessage = (data: any) => {
            console.log("Broadcast message received:", data)

            // Prevent duplicate messages by checking if message already exists
            setMessages(prev => {
                const exists = prev.some(msg => msg.id === data.comm_id)
                if (exists) {
                    console.log("Message already exists, skipping duplicate")
                    return prev
                }

                const newMsg = {
                    id: data.comm_id,
                    sender_id: data.sender_id,
                    sender_name: data.sender_name,
                    message: data.message,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    type: data.sender_id === currentUser.id ? 'sent' : 'received',
                    status: 'delivered'
                }
                return [...prev, newMsg]
            })
        }

        // Register listener once when socket connects
        on('broadcast_received', handleBroadcastMessage)

        // Cleanup when socket disconnects or component unmounts
        return () => {
            off('broadcast_received', handleBroadcastMessage)
        }
    }, [isConnected, on, off, currentUser])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSendMessage = async () => {
        if (!pendingMessage.trim() || isSending || !currentUser) return

        try {
            setIsSending(true)

            // Send broadcast message via WebSocket
            emit('broadcast_message', {
                message: pendingMessage,
                sender_name: currentUser.name,
                sender_id: currentUser.id,
                timestamp: new Date().toISOString()
            })

            setPendingMessage("")
        } catch (error) {
            console.error("Error sending message:", error)
        } finally {
            setIsSending(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-muted-foreground">No messages yet. Start the conversation.</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex",
                                msg.type === "sent" ? "justify-end" : "justify-start"
                            )}
                        >
                            <div className={cn(
                                "max-w-[80%] space-y-1",
                                msg.type === "sent" && "items-end"
                            )}>
                                {/* Sender Name */}
                                {msg.type !== "sent" && msg.type !== "system" && (
                                    <div className="text-xs font-medium text-muted-foreground px-3">
                                        {msg.sender_name} {msg.sender_id && `(ID: ${msg.sender_id})`}
                                    </div>
                                )}
                                {msg.type === "sent" && (
                                    <div className="text-xs font-medium text-muted-foreground px-3 text-right">
                                        You {msg.sender_id !== null && `(ID: ${msg.sender_id})`}
                                    </div>
                                )}

                                {/* Message Bubble */}
                                <div className={cn(
                                    "rounded-2xl px-4 py-2.5 shadow-sm",
                                    msg.type === "sent" && "bg-primary text-primary-foreground rounded-tr-sm",
                                    msg.type === "received" && "bg-card border border-border rounded-tl-sm",
                                    msg.type === "system" && "bg-warning/10 border border-warning/30 text-warning-foreground text-center",
                                )}>
                                    <p className="text-sm leading-relaxed">{msg.message}</p>
                                </div>

                                {/* Time */}
                                <div className={cn(
                                    "flex items-center gap-1 px-3 text-xs text-muted-foreground",
                                    msg.type === "sent" && "justify-end"
                                )}>
                                    <span>{msg.time}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input Area */}
            <div className="border-t border-border p-4 bg-card">
                <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                        <textarea
                            value={pendingMessage}
                            onChange={(e) => setPendingMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type a message to all field responders..."
                            className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[50px] max-h-[120px]"
                            rows={1}
                            disabled={isSending || !isConnected}
                        />
                    </div>
                    <button
                        onClick={handleSendMessage}
                        disabled={!pendingMessage.trim() || isSending || !isConnected}
                        className="p-3 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                        {isSending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
                {!isConnected && (
                    <div className="mt-2 text-xs text-destructive">
                        Disconnected from server. Reconnecting...
                    </div>
                )}
            </div>
        </div>
    )
}
