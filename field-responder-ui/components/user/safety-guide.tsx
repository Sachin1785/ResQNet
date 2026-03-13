"use client"

import { useState } from "react"
import { ChevronLeft, ChevronDown, ChevronUp, Droplets, Activity, Flame, Heart, Wind, CloudLightning } from "lucide-react"

interface SafetyGuideProps {
    onBack: () => void
}

export default function SafetyGuide({ onBack }: SafetyGuideProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const guides = [
        {
            id: "flood",
            title: "Flood Safety",
            icon: Droplets,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            tips: {
                before: [
                    "Know your area's flood risk.",
                    "Prepare an emergency kit with food, water, and medicines.",
                    "Move valuables to higher floors."
                ],
                during: [
                    "Move to higher ground immediately.",
                    "Do not walk, swim, or drive through floodwaters.",
                    "Disconnect electrical appliances if safe to do so."
                ],
                after: [
                    "Avoid floodwaters; they may be contaminated.",
                    "Listen to local alerts for safe water updates.",
                    "Clean and disinfect everything that got wet."
                ]
            }
        },
        {
            id: "earthquake",
            title: "Earthquake Safety",
            icon: Activity,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            tips: {
                before: [
                    "Secure heavy furniture to walls.",
                    "Practice 'Drop, Cover, and Hold On'.",
                    "Identify safe spots in each room."
                ],
                during: [
                    "Drop to your hands and knees.",
                    "Cover your head and neck with your arms.",
                    "Hold on to your shelter (table/desk) until shaking stops."
                ],
                after: [
                    "Check yourself for injuries.",
                    "Expect aftershocks.",
                    "Stay away from damaged buildings."
                ]
            }
        },
        {
            id: "fire",
            title: "Fire Safety",
            icon: Flame,
            color: "text-red-500",
            bg: "bg-red-500/10",
            tips: {
                before: [
                    "Install smoke alarms on every level.",
                    "Plan two ways out of every room.",
                    "Keep flammable items away from heat sources."
                ],
                during: [
                    "Get out, stay out, and call for help.",
                    "Stay low under smoke.",
                    "Touch doors with back of hand before opening."
                ],
                after: [
                    "Do not enter until declared safe.",
                    "Check for structural damage.",
                    "Contact family to let them know you are safe."
                ]
            }
        },
        {
            id: "firstaid",
            title: "First Aid Basics",
            icon: Heart,
            color: "text-pink-500",
            bg: "bg-pink-500/10",
            tips: {
                general: [
                    "Call emergency services immediately for serious conditions.",
                    "Check the scene for safety before approaching.",
                    "Check the person for responsiveness and breathing."
                ],
                cuts: [
                    "Apply direct pressure to stop bleeding.",
                    "Clean wound with water.",
                    "Cover with a sterile bandage."
                ],
                burns: [
                    "Cool the burn with cool running water for 10 minutes.",
                    "Cover loosely with a sterile bandage.",
                    "Do not pop blisters."
                ]
            }
        },
        {
            id: "cyclone",
            title: "Cyclone / Hurricane",
            icon: Wind,
            color: "text-teal-500",
            bg: "bg-teal-500/10",
            tips: {
                before: [
                    "Secure windows and doors (board up if needed).",
                    "Trim trees and remove loose outdoor items.",
                    "Stock up on food and water."
                ],
                during: [
                    "Stay indoors away from windows.",
                    "Listen to battery-operated radio for updates.",
                    "Turn off utilities if instructed."
                ],
                after: [
                    "Stay indoors until official 'All Clear' is given.",
                    "Watch out for downed power lines.",
                    "Do not drink tap water until declared safe."
                ]
            }
        }
    ]

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id)
    }

    return (
        <div className="flex flex-col h-full bg-background animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-4 py-4 border-b border-border flex items-center gap-3 bg-card/50 backdrop-blur-md sticky top-0 z-10">
                <button 
                    onClick={onBack}
                    className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-xl">Safety Guide</h1>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
                {guides.map((guide) => {
                    const Icon = guide.icon
                    const isExpanded = expandedId === guide.id

                    return (
                        <div 
                            key={guide.id}
                            className={`border rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'border-primary/50 shadow-lg' : 'border-border shadow-sm'}`}
                        >
                            <button
                                onClick={() => toggleExpand(guide.id)}
                                className="w-full flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full ${guide.bg} flex items-center justify-center`}>
                                        <Icon className={`w-5 h-5 ${guide.color}`} />
                                    </div>
                                    <span className="font-bold text-sm md:text-base">{guide.title}</span>
                                </div>
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                            </button>

                            {isExpanded && (
                                <div className="p-4 bg-muted/30 border-t border-border/50 text-sm space-y-4">
                                    {(guide.tips as any).general ? (
                                        // Special layout for First Aid
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="font-bold text-primary mb-2 uppercase text-xs tracking-wider">General Steps</h4>
                                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                                    {(guide.tips as any).general.map((tip: string, i: number) => (
                                                        <li key={i}>{tip}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-primary mb-2 uppercase text-xs tracking-wider">Cuts & Bleeding</h4>
                                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                                    {(guide.tips as any).cuts.map((tip: string, i: number) => (
                                                        <li key={i}>{tip}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                             <div>
                                                <h4 className="font-bold text-primary mb-2 uppercase text-xs tracking-wider">Burns</h4>
                                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                                    {(guide.tips as any).burns.map((tip: string, i: number) => (
                                                        <li key={i}>{tip}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    ) : (
                                        // Standard layout (Before/During/After)
                                        <>
                                            <div>
                                                <h4 className="font-bold text-green-600 dark:text-green-400 mb-2 uppercase text-xs tracking-wider flex items-center gap-1">Before</h4>
                                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                                    {(guide.tips as any).before.map((tip: string, i: number) => (
                                                        <li key={i}>{tip}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-orange-600 dark:text-orange-400 mb-2 uppercase text-xs tracking-wider flex items-center gap-1">During</h4>
                                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                                    {(guide.tips as any).during.map((tip: string, i: number) => (
                                                        <li key={i}>{tip}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-2 uppercase text-xs tracking-wider flex items-center gap-1">After</h4>
                                                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                                                    {(guide.tips as any).after.map((tip: string, i: number) => (
                                                        <li key={i}>{tip}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
