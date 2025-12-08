"use client"

import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"

export default function PhotographerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      const role = user?.user_metadata?.role
      if (!user) {
        router.push("/login")
      } else if (role !== "photographer" && role !== "admin") {
        router.push("/")
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Photographer Header */}
      <header className="border-b border-white/[0.06] bg-neutral-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/photographer" className="text-xl font-bold">
              Photka <span className="text-blue-400">Pro</span>
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link href="/photographer" className="text-sm text-neutral-400 hover:text-white transition">
                Dashboard
              </Link>
              <Link href="/photographer/bookings" className="text-sm text-neutral-400 hover:text-white transition">
                Bookings
              </Link>
              <Link href="/photographer/gallery" className="text-sm text-neutral-400 hover:text-white transition">
                Gallery
              </Link>
              <Link href="/photographer/earnings" className="text-sm text-neutral-400 hover:text-white transition">
                Earnings
              </Link>
              <Link href="/photographer/settings" className="text-sm text-neutral-400 hover:text-white transition">
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-neutral-400">Online</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  )
}

