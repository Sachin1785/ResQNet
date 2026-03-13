import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ModeProvider } from "@/contexts/mode-context"
import { PWARegister } from "@/components/pwa-register"

import type { Viewport } from "next"

export const metadata: Metadata = {
  title: "Field Responder - ResQnet",
  description: "Modern tactical field response platform",
  generator: "v0.app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Field Responder",
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <PWARegister />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <ModeProvider>
            {children}
          </ModeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

