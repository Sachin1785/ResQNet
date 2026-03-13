"use client"

import { Send, Mic, Paperclip, CheckCheck, Loader2 } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { useWebSocket } from "@/hooks/use-websocket"

export default function CommsView() {
    const [messages, setMessages] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [pendingMessage, setPendingMessage] = useState("")
    const [isSending, setIsSending] = useState(false)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    const { on, off, emit, isConnected } = useWebSocket({
        autoConnect: true,
        onConnect: () => {
            console.log('CommsView connected to WebSocket')
        },
    })

    // Load current user from localStorage
    useEffect(() => {
        const userStr = localStorage.getItem('currentUser')
        if (userStr) {
            const user = JSON.parse(userStr)
            setCurrentUser(user)
            console.log('Current user:', user)
        }
    }, [])

    useEffect(() => {
        // Show welcome message
        setMessages([
            {
                id: 'welcome',
                sender_id: null,
                sender_name: 'System',
                message: 'Team communication channel active. All responders will receive your messages.',
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

    return (
        <div className="flex flex-col h-full bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border">
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h1 className="text-2xl font-bold">Team Communications</h1>
                            <p className="text-xs text-muted-foreground mt-1">
                                All Responders • Live Channel
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                            <span className="text-xs text-success font-medium">Live</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <Loader2 className="w-10 h-10 animate-spin mb-4" />
                        <p className="text-sm">Loading messages...</p>
                    </div>
                ) : messages.length === 0 ? (
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
                                        You {msg.sender_id && `(ID: ${msg.sender_id})`}
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

                                {/* Time and Status */}
                                <div className={cn(
                                    "flex items-center gap-1 px-3 text-xs text-muted-foreground",
                                    msg.type === "sent" && "justify-end"
                                )}>
                                    <span>{msg.time}</span>
                                    {msg.type === "sent" && (
                                        <CheckCheck className={cn("w-3.5 h-3.5", msg.status === "read" ? "text-primary" : "")} />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input Area */}
            <div className="sticky bottom-16 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border">
                <div className="px-4 py-3">
                    <div className="flex items-end gap-2">
                        {/* Attachments */}
                        <button className="p-2.5 bg-muted/50 rounded-xl hover:bg-muted transition-all active:scale-95 flex-shrink-0">
                            <Paperclip className="w-5 h-5" />
                        </button>

                        {/* Input */}
                        <div className="flex-1 relative">
                            <textarea
                                value={pendingMessage}
                                onChange={(e) => setPendingMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSendMessage()
                                    }
                                }}
                                placeholder="Type a message..."
                                rows={1}
                                className="w-full px-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all max-h-24"
                                style={{ minHeight: "42px" }}
                            />
                        </div>

                        {/* Voice/Send */}
                        {pendingMessage.trim() ? (
                            <button
                                onClick={handleSendMessage}
                                disabled={isSending}
                                className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all active:scale-95 flex-shrink-0 disabled:opacity-50"
                            >
                                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        ) : (
                            <button className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all active:scale-95 flex-shrink-0">
                                <Mic className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Quick Responses */}
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                        {["On my way", "Need backup", "Arrived", "All clear"].map((quick) => (
                            <button
                                key={quick}
                                onClick={() => setPendingMessage(quick)}
                                className="px-3 py-1.5 bg-muted/50 border border-border rounded-full text-xs font-medium hover:bg-muted transition-all whitespace-nowrap active:scale-95"
                            >
                                {quick}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

