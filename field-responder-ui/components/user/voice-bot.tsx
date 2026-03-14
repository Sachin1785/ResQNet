"use client"

import { useState, useEffect, useRef } from "react"
import { Mic, MicOff, X, MessageSquare, Loader2, Volume2 } from "lucide-react"
import { voiceBotAPI } from "@/lib/api"

export default function VoiceBot() {
    const [isOpen, setIsOpen] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [text, setText] = useState("")
    const [history, setHistory] = useState<any[]>([])
    const [error, setError] = useState<string | null>(null)
    
    // Web Speech API
    const recognitionRef = useRef<any>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition()
                recognitionRef.current.continuous = false
                recognitionRef.current.interimResults = false
                recognitionRef.current.lang = "en-US"

                recognitionRef.current.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript
                    setText(transcript)
                    sendMessage(transcript)
                }

                recognitionRef.current.onend = () => {
                    setIsListening(false)
                }

                recognitionRef.current.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error)
                    setError("Could not hear you. Please try again.")
                    setIsListening(false)
                }
            }
        }
    }, [])

    const toggleBot = () => {
        const newOpen = !isOpen
        setIsOpen(newOpen)
        
        if (newOpen) {
            // Reset state when opening
            setText("")
            setError(null)
            
            // If it's a new session, let Arya start first
            if (history.length === 0) {
                sendMessage("START_DISPATCH_SESSION")
            }
        } else {
            // Reset history and clear audio when closing
            setHistory([])
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current.src = ""
            }
        }
    }

    const startListening = () => {
        if (!recognitionRef.current) {
            setError("Speech recognition is not supported in this browser.")
            return
        }
        
        setError(null)
        setText("")
        setIsListening(true)
        recognitionRef.current.start()
    }

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
        }
    }

    const sendMessage = async (input: string) => {
        setIsProcessing(true)
        setError(null)
        
        try {
            const res = await voiceBotAPI.chat(input, history)
            setHistory(res.history)
            
            // Play audio if returned
            if (res.audio) {
                playAudio(res.audio)
            }
        } catch (err: any) {
            setError("Failed to connect to Arya. Please try again.")
        } finally {
            setIsProcessing(false)
        }
    }

    const playAudio = (base64Audio: string) => {
        const audioBlob = base64ToBlob(base64Audio, "audio/mpeg")
        const url = URL.createObjectURL(audioBlob)
        
        if (audioRef.current) {
            audioRef.current.src = url
            audioRef.current.play()
        } else {
            const audio = new Audio(url)
            audioRef.current = audio
            audio.play()
        }
    }

    const base64ToBlob = (base64: string, type: string) => {
        const binStr = atob(base64)
        const len = binStr.length
        const arr = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
            arr[i] = binStr.charCodeAt(i)
        }
        return new Blob([arr], { type })
    }

    return (
        <>
            {/* Floating Action Button */}
            <button 
                onClick={toggleBot}
                className={`fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 z-50 ${isOpen ? 'bg-red-500 rotate-90' : 'bg-primary hover:scale-110 shadow-primary/40'}`}
            >
                {isOpen ? <X className="text-white w-6 h-6" /> : <Mic className="text-white w-6 h-6" />}
                {!isOpen && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">
                        ARYA
                    </span>
                )}
            </button>

            {/* Expansion Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md animate-in fade-in zoom-in duration-300">
                    <div className="w-full max-w-md p-6 flex flex-col items-center text-center space-y-8">
                        
                        {/* Status / Logo */}
                        <div className="relative">
                            <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${isListening ? 'border-primary animate-pulse shadow-[0_0_30px_rgba(var(--primary),0.5)]' : isProcessing ? 'border-primary/50' : 'border-muted'}`}>
                                {isListening ? (
                                    <Mic className="w-12 h-12 text-primary" />
                                ) : isProcessing ? (
                                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                ) : (
                                    <Volume2 className="w-12 h-12 text-muted-foreground" />
                                )}
                            </div>
                            
                            {/* Listening Waves */}
                            {isListening && (
                                <>
                                    <div className="absolute inset-0 rounded-full border border-primary animate-ping opacity-20"></div>
                                    <div className="absolute inset-0 rounded-full border border-primary animate-ping opacity-10 delay-150"></div>
                                </>
                            )}
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight">Arya Dispatcher</h2>
                            <p className="text-muted-foreground text-sm">
                                {isListening ? "Listening for your emergency..." : isProcessing ? "Arya is identifying safety protocols..." : "Tap the button below to speak"}
                            </p>
                        </div>

                        {/* Text Display */}
                        <div className="w-full min-h-[100px] p-4 rounded-2xl bg-muted/30 border border-border/50 flex flex-col justify-center">
                            {text ? (
                                <p className="text-lg font-medium italic">"{text}"</p>
                            ) : error ? (
                                <p className="text-red-500 font-medium">{error}</p>
                            ) : history.length > 0 ? (
                                <p className="text-primary font-bold">{history[history.length - 1].content}</p>
                            ) : (
                                <p className="text-muted-foreground italic">"I'm at the North Gate, there's a flood!"</p>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="flex flex-col items-center gap-4">
                            {!isProcessing && (
                                <button 
                                    onClick={isListening ? stopListening : startListening}
                                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 animate-pulse' : 'bg-primary hover:scale-105'}`}
                                >
                                    {isListening ? <MicOff className="text-white w-8 h-8" /> : <Mic className="text-white w-8 h-8" />}
                                </button>
                            )}
                            
                            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                                Powered by ResQNet Emergency AI
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
