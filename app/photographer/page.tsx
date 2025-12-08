"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/hooks/useAuth"
import Link from "next/link"
import { Booking } from "@/types/booking"

export default function PhotographerDashboard() {
  const { user } = useAuth()
  const [todayBookings, setTodayBookings] = useState<Booking[]>([])
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState({
    totalShoots: 0,
    thisWeek: 0,
    earnings: 0,
    rating: 4.9,
  })

  useEffect(() => {
    fetchBookings()
  }, [])

  async function fetchBookings() {
    // Fetch pending bookings (requests)
    const { data: pending } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "requested")
      .order("created_at", { ascending: false })
      .limit(5)

    if (pending) setPendingBookings(pending)

    // Fetch today's confirmed bookings
    const today = new Date().toISOString().split("T")[0]
    const { data: today_bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "confirmed")
      .gte("when_time", today)
      .order("when_time", { ascending: true })
      .limit(5)

    if (today_bookings) setTodayBookings(today_bookings)

    // Get stats
    const { count: totalCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")

    setStats(prev => ({
      ...prev,
      totalShoots: totalCount || 0,
      thisWeek: Math.floor(Math.random() * 8) + 2,
      earnings: (totalCount || 0) * 75,
    }))
  }

  async function handleAcceptBooking(id: string) {
    // Update booking status to confirmed
    // Chat will be automatically available - welcome message can be sent when photographer opens chat
    await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", id)
    
    fetchBookings()
  }

  async function handleDeclineBooking(id: string) {
    await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id)
    
    fetchBookings()
  }

  const sessionColors: Record<string, string> = {
    iphone: "text-blue-400",
    raw_dslr: "text-purple-400",
    edited_dslr: "text-amber-400",
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.user_metadata?.full_name?.split(" ")[0] || "Photographer"}
        </h1>
        <p className="text-neutral-400">Here's what's happening with your bookings today.</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Shoots", value: stats.totalShoots, icon: "📸" },
          { label: "This Week", value: stats.thisWeek, icon: "📅" },
          { label: "Earnings", value: `$${stats.earnings.toLocaleString()}`, icon: "💰" },
          { label: "Rating", value: stats.rating, icon: "⭐" },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-neutral-900/50 border border-white/[0.06] rounded-2xl p-4"
          >
            <p className="text-2xl mb-1">{stat.icon}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-neutral-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pending Requests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-neutral-900/50 border border-white/[0.06] rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Pending Requests</h2>
            {pendingBookings.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                {pendingBookings.length} new
              </span>
            )}
          </div>

          {pendingBookings.length === 0 ? (
            <p className="text-neutral-500 text-sm py-8 text-center">No pending requests</p>
          ) : (
            <div className="space-y-3">
              {pendingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium">{booking.full_name}</p>
                      <p className={`text-sm ${sessionColors[booking.session_type] || "text-blue-400"}`}>
                        {booking.session_type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())} Session
                      </p>
                    </div>
                    <p className="text-xs text-neutral-500">
                      {new Date(booking.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm text-neutral-400 mb-3 truncate">
                    📍 {booking.location_text}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptBooking(booking.id)}
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineBooking(booking.id)}
                      className="flex-1 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm font-medium rounded-lg transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Today's Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-neutral-900/50 border border-white/[0.06] rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Today's Schedule</h2>
            <Link href="/photographer/bookings" className="text-sm text-blue-400 hover:text-blue-300">
              View all →
            </Link>
          </div>

          {todayBookings.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-4xl mb-2">🎉</p>
              <p className="text-neutral-500 text-sm">No shoots scheduled today</p>
              <p className="text-neutral-600 text-xs mt-1">Enjoy your free time!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-lg">
                    📸
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{booking.full_name}</p>
                    <p className="text-sm text-neutral-400 truncate">{booking.location_text}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {new Date(booking.when_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className={`text-xs ${sessionColors[booking.session_type] || "text-blue-400"}`}>
                      {booking.session_type.replace("_", " ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: "Go Online", icon: "🟢", href: "#", color: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "Upload Photos", icon: "📤", href: "/photographer/gallery", color: "bg-blue-500/10 border-blue-500/20" },
          { label: "View Earnings", icon: "💵", href: "/photographer/earnings", color: "bg-amber-500/10 border-amber-500/20" },
          { label: "Edit Profile", icon: "✏️", href: "/photographer/settings", color: "bg-purple-500/10 border-purple-500/20" },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={`${action.color} border rounded-2xl p-4 text-center hover:scale-[1.02] transition-transform`}
          >
            <p className="text-2xl mb-2">{action.icon}</p>
            <p className="text-sm font-medium">{action.label}</p>
          </Link>
        ))}
      </motion.div>
    </div>
  )
}

