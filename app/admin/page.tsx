"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabaseClient"
import Link from "next/link"

interface Stats {
  totalUsers: number
  totalPhotographers: number
  totalBookings: number
  pendingBookings: number
  completedBookings: number
  revenue: number
}

interface RecentBooking {
  id: string
  full_name: string
  email: string
  session_type: string
  status: string
  created_at: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalPhotographers: 0,
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    revenue: 0,
  })
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])

  useEffect(() => {
    fetchStats()
    fetchRecentBookings()
  }, [])

  async function fetchStats() {
    // Total bookings
    const { count: totalBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })

    // Pending bookings
    const { count: pendingBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "requested")

    // Completed bookings
    const { count: completedBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")

    setStats({
      totalUsers: 127, // Mock - would come from auth.users count
      totalPhotographers: 12, // Mock
      totalBookings: totalBookings || 0,
      pendingBookings: pendingBookings || 0,
      completedBookings: completedBookings || 0,
      revenue: (completedBookings || 0) * 75, // Mock calculation
    })
  }

  async function fetchRecentBookings() {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)

    if (data) setRecentBookings(data)
  }

  const statusColors: Record<string, string> = {
    requested: "bg-amber-500/20 text-amber-400",
    confirmed: "bg-blue-500/20 text-blue-400",
    completed: "bg-emerald-500/20 text-emerald-400",
    cancelled: "bg-red-500/20 text-red-400",
  }

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-neutral-400">Overview of your platform metrics</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {[
          { label: "Total Users", value: stats.totalUsers, icon: "👥", color: "text-blue-400" },
          { label: "Photographers", value: stats.totalPhotographers, icon: "📸", color: "text-purple-400" },
          { label: "Total Bookings", value: stats.totalBookings, icon: "📅", color: "text-cyan-400" },
          { label: "Pending", value: stats.pendingBookings, icon: "⏳", color: "text-amber-400" },
          { label: "Completed", value: stats.completedBookings, icon: "✅", color: "text-emerald-400" },
          { label: "Revenue", value: `$${stats.revenue.toLocaleString()}`, icon: "💰", color: "text-green-400" },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-neutral-900/50 border border-white/[0.06] rounded-2xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">{stat.icon}</span>
            </div>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-neutral-500 mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Bookings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-neutral-900/50 border border-white/[0.06] rounded-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Bookings</h2>
          <Link href="/admin/bookings" className="text-sm text-blue-400 hover:text-blue-300">
            View all →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-5 py-3">
                  Customer
                </th>
                <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-5 py-3">
                  Session
                </th>
                <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-5 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider px-5 py-3">
                  Date
                </th>
                <th className="text-right text-xs font-medium text-neutral-500 uppercase tracking-wider px-5 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {recentBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-medium text-sm">{booking.full_name}</p>
                      <p className="text-xs text-neutral-500">{booking.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm">
                      {booking.session_type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[booking.status] || "bg-neutral-500/20 text-neutral-400"}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-neutral-400">
                    {new Date(booking.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button className="text-sm text-blue-400 hover:text-blue-300">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {recentBookings.length === 0 && (
          <div className="py-12 text-center text-neutral-500">
            No bookings yet
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: "Add Photographer", icon: "➕", href: "/admin/photographers/new" },
          { label: "Send Announcement", icon: "📢", href: "#" },
          { label: "Export Data", icon: "📥", href: "#" },
          { label: "View Reports", icon: "📊", href: "/admin/analytics" },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-center hover:bg-white/[0.05] hover:border-white/[0.1] transition"
          >
            <p className="text-2xl mb-2">{action.icon}</p>
            <p className="text-sm font-medium">{action.label}</p>
          </Link>
        ))}
      </motion.div>
    </div>
  )
}

