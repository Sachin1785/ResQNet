"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  Shield, Radio, Mic, Thermometer, Map, BarChart3,
  ChevronDown, ArrowRight, MessageSquare
} from "lucide-react"

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
interface Feature {
  icon: React.ReactNode
  title: string
  description: string
  tag: string
  tagColor: string
  glowColor: string
}

interface Metric {
  value: string
  label: string
  color: string
}

// ────────────────────────────────────────────────────────────
// Data
// ────────────────────────────────────────────────────────────
const FEATURES: Feature[] = [
  {
    icon: <Map className="w-8 h-8" />,
    title: "Real-Time Incident Map",
    description: "Live geospatial view of all active crises, responders, and geofence zones overlaid on a dynamic Leaflet map.",
    tag: "LIVE",
    tagColor: "#39ff14",
    glowColor: "rgba(57,255,20,0.15)",
  },
  {
    icon: <Radio className="w-8 h-8" />,
    title: "Bluetooth SOS Mesh",
    description: "Peer-to-peer emergency broadcasting over BLE when cellular infrastructure fails. ESP32 powered.",
    tag: "MESH",
    tagColor: "#60a5fa",
    glowColor: "rgba(96,165,250,0.15)",
  },
  {
    icon: <Mic className="w-8 h-8" />,
    title: "Arya — AI Voice Assistant",
    description: "Powered by Groq + ElevenLabs. Arya provides real-time voice guidance, safety protocols, and emotional support.",
    tag: "AI-POWERED",
    tagColor: "#f4a261",
    glowColor: "rgba(244,162,97,0.15)",
  },
  {
    icon: <Thermometer className="w-8 h-8" />,
    title: "IoT Sensor Intelligence",
    description: "Continuous telemetry from fire, flood, seismic, and gas sensors. Smart deduplication prevents alert fatigue.",
    tag: "SMART",
    tagColor: "#e63946",
    glowColor: "rgba(230,57,70,0.15)",
  },
  {
    icon: <Shield className="w-8 h-8" />,
    title: "Field Responder PWA",
    description: "Role-based mobile-first interface for field responders. Offline-capable, real-time incident sync.",
    tag: "SECURE",
    tagColor: "#a78bfa",
    glowColor: "rgba(167,139,250,0.15)",
  },
  {
    icon: <BarChart3 className="w-8 h-8" />,
    title: "Analytics & Heatmaps",
    description: "Historical incident analytics, resource allocation dashboards, and predictive heatmap overlays.",
    tag: "ANALYTICS",
    tagColor: "#34d399",
    glowColor: "rgba(52,211,153,0.15)",
  },
  {
    icon: <MessageSquare className="w-8 h-8" />,
    title: "SMS Gateway & NLP",
    description: "Natural language processing on incoming SMS alerts. Automatically classifies, routes, and escalates messages from citizens.",
    tag: "NLP",
    tagColor: "#f59e0b",
    glowColor: "rgba(245,158,11,0.15)",
  },
]

const METRICS: Metric[] = [
  { value: "12+", label: "IoT Sensor Types", color: "#f4a261" },
  { value: "40%", label: "Faster Response", color: "#e63946" },
  { value: "8", label: "Incident Categories", color: "#a0a0a0" },
  { value: "99.9%", label: "System Uptime", color: "#39ff14" },
]

// ────────────────────────────────────────────────────────────
// CountUp Hook
// ────────────────────────────────────────────────────────────
function useCountUp(target: string, inView: boolean) {
  const [display, setDisplay] = useState("0")

  useEffect(() => {
    if (!inView) return
    const num = parseFloat(target.replace(/[^0-9.]/g, ""))
    const suffix = target.replace(/[0-9.]/g, "")
    const duration = 1800
    const steps = 60
    const increment = num / steps
    let current = 0
    let step = 0
    const timer = setInterval(() => {
      step++
      current = Math.min(current + increment, num)
      setDisplay(
        (Number.isInteger(num) ? Math.round(current) : current.toFixed(1)) + suffix
      )
      if (step >= steps) clearInterval(timer)
    }, duration / steps)
    return () => clearInterval(timer)
  }, [inView, target])

  return display
}

// ────────────────────────────────────────────────────────────
// Metric Card
// ────────────────────────────────────────────────────────────
function MetricCard({ metric, inView }: { metric: Metric; inView: boolean }) {
  const display = useCountUp(metric.value, inView)
  return (
    <div className="metric-card">
      <div className="metric-value" style={{ color: metric.color }}>{display}</div>
      <div className="metric-label">{metric.label}</div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Feature Card
// ────────────────────────────────────────────────────────────
function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1"
          el.style.transform = "translateY(0) scale(1)"
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={cardRef}
      className="feature-card"
      style={{
        opacity: 0,
        transform: "translateY(60px) scale(0.92)",
        transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.1}s`,
        background: `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)`,
      }}
    >
      <div className="feature-glow" style={{ background: feature.glowColor }} />
      <div className="feature-icon" style={{ color: feature.tagColor }}>
        {feature.icon}
      </div>
      <div className="feature-tag" style={{ color: feature.tagColor, borderColor: feature.tagColor + "55" }}>
        {feature.tag}
      </div>
      <h3 className="feature-title">{feature.title}</h3>
      <p className="feature-desc">{feature.description}</p>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const metricsRef = useRef<HTMLDivElement>(null)
  const [metricsInView, setMetricsInView] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [heroTextVisible, setHeroTextVisible] = useState(false)

  // Scroll for navbar
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Hero text stagger on mount
  useEffect(() => {
    const t = setTimeout(() => setHeroTextVisible(true), 300)
    return () => clearTimeout(t)
  }, [])

  // Metrics in-view
  useEffect(() => {
    const el = metricsRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMetricsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* ── Google Fonts ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .landing-root {
          background: #000;
          color: #f0ede8;
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
          min-height: 100vh;
        }

        /* ── NAVBAR ── */
        .landing-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 3rem;
          transition: background 0.4s, backdrop-filter 0.4s;
        }
        .landing-nav.scrolled {
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .nav-logo {
          font-family: 'Cinzel', serif;
          font-size: 1.3rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: #f0ede8;
          text-decoration: none;
        }
        .nav-logo span { color: #e63946; }
        .nav-links { display: flex; gap: 2.5rem; align-items: center; }
        .nav-link {
          font-size: 0.78rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.55);
          text-decoration: none;
          transition: color 0.2s;
          cursor: pointer;
          background: none;
          border: none;
        }
        .nav-link:hover { color: #f0ede8; }
        .nav-cta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.55rem 1.4rem;
          border: 1px solid rgba(230,57,70,0.6);
          color: #e63946;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.25s;
          background: transparent;
        }
        .nav-cta:hover {
          background: #e63946;
          color: #000;
          box-shadow: 0 0 24px rgba(230,57,70,0.5);
        }

        /* ── HERO ── */
        .hero-section {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          text-align: center;
        }
        .hero-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 60% at 50% 50%, rgba(230,57,70,0.07) 0%, transparent 70%);
          z-index: 0;
        }
        .hero-noise {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          opacity: 0.5;
          z-index: 0;
        }

        .hero-globe-container {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -55%);
          z-index: 1;
          pointer-events: none;
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 900px;
          padding: 0 2rem;
        }
        .hero-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.25em;
          color: rgba(230,57,70,0.8);
          text-transform: uppercase;
          margin-bottom: 2rem;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.7s ease 0.1s;
        }
        .hero-eyebrow.visible { opacity: 1; transform: translateY(0); }

        .hero-h1 {
          font-family: 'Cinzel', serif;
          font-size: clamp(3rem, 8vw, 6.5rem);
          font-weight: 700;
          line-height: 1.05;
          letter-spacing: -0.01em;
          margin-bottom: 0.3rem;
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.25s;
        }
        .hero-h1.visible { opacity: 1; transform: translateY(0); }

        .hero-h1-accent {
          font-family: 'Cinzel', serif;
          font-size: clamp(3rem, 8vw, 6.5rem);
          font-weight: 900;
          line-height: 1.05;
          color: #e63946;
          text-shadow: 0 0 60px rgba(230,57,70,0.45), 0 0 120px rgba(230,57,70,0.2);
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.42s;
          display: block;
          margin-bottom: 2rem;
        }
        .hero-h1-accent.visible { opacity: 1; transform: translateY(0); }

        .hero-subtitle {
          font-size: 1.1rem;
          font-weight: 300;
          color: rgba(240,237,232,0.5);
          max-width: 560px;
          margin: 0 auto 3rem;
          line-height: 1.7;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.7s ease 0.6s;
        }
        .hero-subtitle.visible { opacity: 1; transform: translateY(0); }

        .hero-actions {
          display: flex;
          gap: 1.25rem;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.7s ease 0.75s;
        }
        .hero-actions.visible { opacity: 1; transform: translateY(0); }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2.5rem;
          background: #e63946;
          color: #000;
          font-family: 'Inter', sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          text-decoration: none;
          cursor: pointer;
          border: none;
          transition: all 0.25s;
          position: relative;
          overflow: hidden;
        }
        .btn-primary::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0.15);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .btn-primary:hover::after { opacity: 1; }
        .btn-primary:hover {
          box-shadow: 0 0 40px rgba(230,57,70,0.7), 0 0 80px rgba(230,57,70,0.25);
          transform: translateY(-2px);
        }

        .btn-ghost {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 2rem;
          background: transparent;
          color: rgba(240,237,232,0.6);
          font-size: 0.85rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
          cursor: pointer;
          border: 1px solid rgba(255,255,255,0.1);
          transition: all 0.25s;
        }
        .btn-ghost:hover {
          color: #f0ede8;
          border-color: rgba(255,255,255,0.3);
        }

        .hero-scroll-hint {
          position: absolute;
          bottom: 2.5rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: rgba(240,237,232,0.3);
          font-size: 0.72rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          z-index: 2;
          animation: scrollBounce 2s ease-in-out infinite;
        }
        @keyframes scrollBounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }

        /* ── HERO GRID PATTERN ── */
        .hero-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(230,57,70,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(230,57,70,0.04) 1px, transparent 1px);
          background-size: 80px 80px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%);
          z-index: 0;
        }

        /* ── METRICS ── */
        .metrics-section {
          padding: 5rem 3rem;
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.01);
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
          max-width: 1100px;
          margin: 0 auto;
        }
        .metric-card {
          text-align: center;
          padding: 2rem 1rem;
          border: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.02);
          transition: transform 0.3s;
        }
        .metric-card:hover { transform: translateY(-4px); }
        .metric-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 3.2rem;
          font-weight: 600;
          line-height: 1;
          margin-bottom: 0.75rem;
        }
        .metric-label {
          font-size: 0.75rem;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(240,237,232,0.4);
        }

        /* ── FEATURES ── */
        .features-section {
          padding: 8rem 3rem;
          max-width: 1300px;
          margin: 0 auto;
        }
        .section-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.25em;
          color: rgba(230,57,70,0.7);
          text-transform: uppercase;
          margin-bottom: 1rem;
        }
        .section-title {
          font-family: 'Cinzel', serif;
          font-size: clamp(2.2rem, 5vw, 4rem);
          font-weight: 700;
          line-height: 1.1;
          margin-bottom: 1.5rem;
          max-width: 600px;
        }
        .section-sub {
          font-size: 1rem;
          color: rgba(240,237,232,0.45);
          max-width: 520px;
          line-height: 1.7;
          margin-bottom: 4rem;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
        }
        .feature-card {
          position: relative;
          padding: 2.25rem;
          border: 1px solid rgba(255,255,255,0.06);
          overflow: hidden;
          cursor: default;
        }
        .feature-card:hover {
          border-color: rgba(255,255,255,0.12);
        }
        .feature-card:hover .feature-glow {
          opacity: 1;
        }
        .feature-glow {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.4s;
          pointer-events: none;
        }
        .feature-icon {
          margin-bottom: 1.25rem;
          position: relative;
        }
        .feature-tag {
          display: inline-block;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          border: 1px solid;
          padding: 0.2rem 0.6rem;
          margin-bottom: 1rem;
          position: relative;
        }
        .feature-title {
          font-family: 'Cinzel', serif;
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
          position: relative;
          line-height: 1.3;
        }
        .feature-desc {
          font-size: 0.88rem;
          color: rgba(240,237,232,0.45);
          line-height: 1.7;
          position: relative;
        }

        /* ── MISSION ── */
        .mission-section {
          padding: 10rem 3rem;
          text-align: center;
          position: relative;
          overflow: hidden;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .mission-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(230,57,70,0.05), transparent);
        }
        .mission-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.72rem;
          letter-spacing: 0.25em;
          color: rgba(230,57,70,0.6);
          text-transform: uppercase;
          margin-bottom: 2.5rem;
        }
        .mission-quote {
          font-family: 'Cinzel', serif;
          font-size: clamp(1.4rem, 3.5vw, 2.4rem);
          font-weight: 400;
          line-height: 1.6;
          color: rgba(240,237,232,0.85);
          max-width: 860px;
          margin: 0 auto 3rem;
        }
        .mission-quote em {
          color: #e63946;
          font-style: normal;
          font-weight: 600;
        }
        .mission-divider {
          width: 60px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #e63946, transparent);
          margin: 0 auto 3rem;
        }
        .mission-stack {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        .stack-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          padding: 0.4rem 0.9rem;
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(240,237,232,0.45);
          text-transform: uppercase;
        }

        /* ── FOOTER CTA ── */
        .footer-cta {
          padding: 8rem 3rem 3rem;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .footer-cta-title {
          font-family: 'Cinzel', serif;
          font-size: clamp(2.5rem, 6vw, 5rem);
          font-weight: 700;
          margin-bottom: 1.5rem;
        }
        .footer-cta-sub {
          font-size: 1rem;
          color: rgba(240,237,232,0.4);
          margin-bottom: 3rem;
        }
        .footer-bottom {
          margin-top: 6rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .footer-logo {
          font-family: 'Cinzel', serif;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.12em;
        }
        .footer-logo span { color: #e63946; }
        .footer-copy {
          font-size: 0.75rem;
          color: rgba(240,237,232,0.25);
          letter-spacing: 0.08em;
        }

        /* Live indicator */
        .live-dot {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          color: #39ff14;
        }
        .live-dot::before {
          content: '';
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #39ff14;
          box-shadow: 0 0 8px #39ff14;
          animation: livePulse 1.4s ease-in-out infinite;
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        /* Responsive */
          @media (max-width: 900px) {
          .features-grid { grid-template-columns: repeat(2, 1fr); }
          .metrics-grid { grid-template-columns: repeat(2, 1fr); }
          .landing-nav { padding: 1.25rem 1.5rem; }
          .features-section { padding: 6rem 1.5rem; }
        }
        @media (max-width: 600px) {
          .features-grid { grid-template-columns: 1fr; }
          .metrics-grid { grid-template-columns: repeat(2, 1fr); }
          .nav-links { display: none; }
        }
      `}</style>

      <div className="landing-root">

        {/* ─── NAVBAR ─── */}
        <nav className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
          <Link href="/landing" className="nav-logo">
            RES<span>Q</span>NET
          </Link>
          <div className="nav-links">
            <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="nav-link">Features</button>
            <button onClick={() => document.getElementById("mission")?.scrollIntoView({ behavior: "smooth" })} className="nav-link">Mission</button>
            <span className="live-dot">SYSTEM LIVE</span>
          </div>
          <Link href="/" className="nav-cta">
            Command Center <ArrowRight size={14} />
          </Link>
        </nav>

        {/* ─── HERO ─── */}
        <section className="hero-section">
          <div className="hero-bg" />
          <div className="hero-noise" />

          <div className="hero-grid" />

          {/* Text */}
          <div className="hero-content">
            <div className={`hero-eyebrow ${heroTextVisible ? "visible" : ""}`}>
              — Crisis Management System —
            </div>
            <h1 className={`hero-h1 ${heroTextVisible ? "visible" : ""}`}>
              When Every Second Counts.
            </h1>
            <span className={`hero-h1-accent ${heroTextVisible ? "visible" : ""}`}>
              ResQNet Responds.
            </span>
            <p className={`hero-subtitle ${heroTextVisible ? "visible" : ""}`}>
              Unified AI-powered emergency coordination for modern first responders. Real-time intelligence. Zero compromise.
            </p>
            <div className={`hero-actions ${heroTextVisible ? "visible" : ""}`}>
              <Link href="/" className="btn-primary">
                Go to Command Center <ArrowRight size={16} />
              </Link>
              <button
                className="btn-ghost"
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              >
                Explore Features <ChevronDown size={16} />
              </button>
            </div>
          </div>

          <div className="hero-scroll-hint">
            <ChevronDown size={18} /> Scroll
          </div>
        </section>

        {/* ─── METRICS ─── */}
        <section className="metrics-section" ref={metricsRef}>
          <div className="metrics-grid">
            {METRICS.map((m, i) => (
              <MetricCard key={i} metric={m} inView={metricsInView} />
            ))}
          </div>
        </section>

        {/* ─── FEATURES ─── */}
        <section className="features-section" id="features">
          <div className="section-eyebrow">Platform Capabilities</div>
          <h2 className="section-title">Intelligence Built for Crisis.</h2>
          <p className="section-sub">
            Every module of ResQNet is engineered to perform when infrastructure fails and lives are on the line.
          </p>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <FeatureCard key={i} feature={f} index={i} />
            ))}
          </div>
        </section>

        {/* ─── MISSION ─── */}
        <section className="mission-section" id="mission">
          <div className="mission-bg" />
          <div style={{ position: "relative" }}>
            <div className="mission-label">Our Mission</div>
            <div className="mission-divider" />
            <blockquote className="mission-quote">
              "ResQNet was built for the moments when <em>infrastructure breaks down</em>.
              We bridge the gap between raw data and coordinated action — so responders can
              focus on <em>saving lives</em>, not managing chaos."
            </blockquote>
            <div className="mission-stack">
              {["Flask", "Next.js", "Groq AI", "ElevenLabs", "MQTT", "ESP32", "SQLite", "WebSockets"].map((t) => (
                <span key={t} className="stack-badge">{t}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FOOTER CTA ─── */}
        <section className="footer-cta">
          <div className="section-eyebrow" style={{ marginBottom: "1.5rem" }}>Ready to Respond?</div>
          <h2 className="footer-cta-title">
            Enter the <span style={{ color: "#e63946" }}>Command Center.</span>
          </h2>
          <p className="footer-cta-sub">
            Full situational awareness. Real-time command. Zero delay.
          </p>
          <Link href="/" className="btn-primary" style={{ display: "inline-flex" }}>
            Go to Command Center <ArrowRight size={16} />
          </Link>

          <div className="footer-bottom">
            <div className="footer-logo">RES<span>Q</span>NET</div>
            <span className="live-dot">All Systems Operational</span>
            <div className="footer-copy">© 2026 ResQNet Crisis Management System. All rights reserved.</div>
          </div>
        </section>

      </div>
    </>
  )
}
