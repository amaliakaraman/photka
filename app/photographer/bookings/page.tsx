"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/hooks/useAuth"
import { Booking, BookingStatus } from "@/types/booking"

type FilterStatus = "all" | BookingStatus

export default function PhotographerBookingsPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filter, setFilter] = useState<FilterStatus>("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBookings()
  }, [filter])

  async function fetchBookings() {
    setLoading(true)
    let query = supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false })

    if (filter !== "all") {
      query = query.eq("status", filter)
    }

    const { data } = await query

    if (data) setBookings(data)
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    // Update booking status
    const { data: updatedBooking } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id)
      .select()
      .single()
    
    if (status === "confirmed" && updatedBooking && user?.id) {
      try {
        // welcome message will be created when chat is first opened
      } catch (error) {
        // silent fail
      }
    }
    
    fetchBookings()
  }

  const statusColors: Record<string, string> = {
    requested: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    scheduled: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  }

  const sessionColors: Record<string, string> = {
    iphone: "text-blue-400",
    raw_dslr: "text-purple-400",
    edited_dslr: "text-amber-400",
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">Bookings</h1>
        <p className="text-neutral-400">Manage your photo session requests</p>
      </motion.div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(["all", "requested", "scheduled", "confirmed", "completed", "cancelled"] as FilterStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
              filter === status
                ? "bg-white text-black"
                : "bg-neutral-900 text-neutral-400 hover:text-white border border-white/[0.06]"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="py-12 text-center text-neutral-500">Loading bookings...</div>
      ) : bookings.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-4xl mb-4">📭</p>
          <p className="text-neutral-400">No bookings found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking, idx) => (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-neutral-900/50 border border-white/[0.06] rounded-2xl p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{booking.full_name}</h3>
                  <p className={`text-sm ${sessionColors[booking.session_type] || "text-blue-400"}`}>
                    {booking.session_type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())} Session
                  </p>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full border ${statusColors[booking.status]}`}>
                  {booking.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p className="text-neutral-500 text-xs mb-1">Contact</p>
                  <p className="text-neutral-300">{booking.email}</p>
                  {booking.phone && <p className="text-neutral-400">{booking.phone}</p>}
                </div>
                <div>
                  <p className="text-neutral-500 text-xs mb-1">When</p>
                  <p className="text-neutral-300">
                    {new Date(booking.when_time).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-neutral-400">
                    {new Date(booking.when_time).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-neutral-500 text-xs mb-1">Location</p>
                <p className="text-neutral-300 text-sm">{booking.location_text}</p>
              </div>

              {/* Actions based on status */}
              <div className="flex gap-2 pt-4 border-t border-white/[0.06]">
                {(booking.status === "requested" || booking.status === "scheduled") && (
                  <>
                    <button
                      onClick={() => updateStatus(booking.id, "confirmed")}
                      className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl transition"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => updateStatus(booking.id, "cancelled")}
                      className="flex-1 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm font-medium rounded-xl transition"
                    >
                      Decline
                    </button>
                  </>
                )}
                {booking.status === "confirmed" && (
                  <>
                    <button
                      onClick={() => updateStatus(booking.id, "completed")}
                      className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition"
                    >
                      Mark Complete
                    </button>
                    <button className="flex-1 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm font-medium rounded-xl transition">
                      Message Client
                    </button>
                  </>
                )}
                {booking.status === "completed" && (
                  <button className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-xl transition">
                    Upload Photos
                  </button>
                )}
                {booking.status === "cancelled" && (
                  <p className="text-sm text-neutral-500 py-2">This booking was cancelled</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

