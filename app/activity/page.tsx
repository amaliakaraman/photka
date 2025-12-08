"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/hooks/useAuth"
import Link from "next/link"
import { 
  Booking, 
  SESSION_TYPE_LABELS as sessionTypeLabels, 
  STATUS_STYLES as statusStyles, 
  getStatusLabel 
} from "@/types/booking"
import { addMockPhotosToBookings, formatDate, formatShortDate } from "@/utils/bookings"

type SortOption = "newest" | "oldest" | "type" | "status"

export default function ActivityPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [fetching, setFetching] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [filterType, setFilterType] = useState<string>("all")
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null)
  const [showManageSheet, setShowManageSheet] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [viewedBookings, setViewedBookings] = useState<Set<string>>(new Set())

  // load viewed bookings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const viewed = localStorage.getItem('photka_viewed_bookings')
      if (viewed) {
        setViewedBookings(new Set(JSON.parse(viewed)))
      }
    }
  }, [])

  // mark booking as viewed
  const markAsViewed = useCallback((bookingId: string) => {
    setViewedBookings(prev => {
      const newViewed = new Set(prev)
      newViewed.add(bookingId)
      if (typeof window !== 'undefined') {
        localStorage.setItem('photka_viewed_bookings', JSON.stringify(Array.from(newViewed)))
      }
      return newViewed
    })
  }, [])

  // handle cancel booking
  async function handleCancelBooking() {
    if (!selectedBooking || !user?.email) return
    setIsCancelling(true)
    
    try {
      const response = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          userEmail: user.email,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("error cancelling booking via API:", errorData)
        alert(`failed to cancel booking: ${errorData.error || "please try again"}`)
        setIsCancelling(false)
        return
      }

      const result = await response.json()
      
      // remove from local state immediately
      if (result.deleted) {
        setBookings(prev => prev.filter(b => b.id !== selectedBooking.id))
      } else {
        setBookings(prev => prev.map(b => 
          b.id === selectedBooking.id ? { ...b, status: "cancelled" } : b
        ))
      }
    } catch (error) {
      console.error("error cancelling booking:", error)
      alert("failed to cancel booking. please try again.")
      setIsCancelling(false)
      return
    }
    
    setShowCancelConfirm(false)
    setShowManageSheet(false)
    setSelectedBooking(null)
    
    await fetchBookings()
    setIsCancelling(false)
  }

  // handle reschedule
  function handleReschedule() {
    if (!selectedBooking) return
    router.push(`/schedule?session_type=${selectedBooking.session_type}&reschedule=${selectedBooking.id}`)
  }

  // open manage sheet
  function openManageSheet(booking: Booking) {
    setSelectedBooking(booking)
    setShowManageSheet(true)
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  async function fetchBookings() {
    if (!user?.email) {
      setFetching(false)
      return
    }

    setFetching(true)
    
    const { data, error } = await supabase
      .from("bookings")
      .select("id, session_type, when_time, location_text, status, created_at, email")
      .eq("email", user.email)
      .order("created_at", { ascending: false })
    
    // filter out support chat bookings (they use special uuid pattern)
    const filteredData = (data || []).filter((booking) => {
      // support chat bookings always start with this pattern
      return !booking.id.startsWith("00000000-0000-0000-0000-")
    })

    if (error) {
      setFetching(false)
    } else {
      const now = new Date()
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
      
      // cleanup old requested bookings
      const requestedBookings = filteredData.filter((b) => b.status === "requested")
      const toDelete: string[] = []
      
      for (const booking of requestedBookings) {
        const bookingCreated = new Date(booking.created_at)
        if (bookingCreated < twoHoursAgo) {
          toDelete.push(booking.id)
        }
      }
      
      if (requestedBookings.length > 1) {
        const sorted = requestedBookings.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        const duplicates = sorted.slice(1)
        duplicates.forEach(booking => {
          if (!toDelete.includes(booking.id)) {
            toDelete.push(booking.id)
          }
        })
      }
      
      if (toDelete.length > 0) {
        await supabase
          .from("bookings")
          .delete()
          .in("id", toDelete)
        
        const finalData = filteredData.filter(b => !toDelete.includes(b.id))
        setBookings(addMockPhotosToBookings(finalData))
      } else {
        setBookings(addMockPhotosToBookings(filteredData))
      }
      setFetching(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchBookings()
    }
  }, [user])

  // refetch when page gains focus or becomes visible
  useEffect(() => {
    if (!user) return

    const handleRefetch = () => {
      if (user) {
        fetchBookings()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        fetchBookings()
      }
    }

    window.addEventListener('focus', handleRefetch)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('focus', handleRefetch)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])

  function hasUnreadNotifications(booking: Booking): boolean {
    if (viewedBookings.has(booking.id)) return false
    // only show blue dot for:
    // - "confirmed" status (photographer responded/accepted)
    // - "completed" status with photos (gallery delivery not opened)
    return booking.status === "confirmed" || 
           (booking.status === "completed" && Boolean(booking.photos && booking.photos.length > 0))
  }

  // count unread notifications
  const unreadCount = bookings.filter(b => hasUnreadNotifications(b)).length

  // track viewed bookings in localStorage and auto-mark pending instant shoots
  useEffect(() => {
    if (typeof window !== 'undefined' && bookings.length > 0) {
      const viewed = localStorage.getItem('photka_viewed_bookings')
      const viewedSet = viewed ? new Set<string>(JSON.parse(viewed) as string[]) : new Set<string>()
      
      // auto-mark pending bookings as viewed
      bookings.forEach(booking => {
        if ((booking.status === "requested" || booking.status === "scheduled") && 
            !viewedSet.has(booking.id)) {
          viewedSet.add(booking.id)
        }
      })
      
      setViewedBookings(viewedSet)
      if (viewedSet.size > 0) {
        localStorage.setItem('photka_viewed_bookings', JSON.stringify(Array.from(viewedSet)))
      }
    }
  }, [bookings.length])

  // mark booking as viewed when expanded or clicked
  useEffect(() => {
    if (expandedBooking) {
      markAsViewed(expandedBooking)
    }
  }, [expandedBooking, markAsViewed])

  // store unread count in localStorage for bottomnav to access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('photka_unread_count', unreadCount.toString())
      // dispatch event so bottomnav can update
      window.dispatchEvent(new CustomEvent('photka_unread_update', { detail: unreadCount }))
    }
  }, [unreadCount])

  const filteredBookings = useMemo(() => {
    let result = [...bookings].filter((b) => b.status !== "requested")

    // exclude cancelled bookings that don't have photos (cancelled before delivery)
    // keep cancelled bookings with photos for records
    if (!searchQuery || !searchQuery.toLowerCase().includes("cancel")) {
      result = result.filter((b) => {
        if (b.status === "cancelled") {
          // only show cancelled if it has photos (was completed before cancellation)
          return b.photos && b.photos.length > 0
        }
        return true
      })
    }

    // search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (b) =>
          sessionTypeLabels[b.session_type]?.toLowerCase().includes(query) ||
          b.location_text.toLowerCase().includes(query) ||
          b.status.toLowerCase().includes(query)
      )
    }

    // type filter
    if (filterType !== "all") {
      result = result.filter((b) => b.session_type === filterType)
    }

    // sort
    switch (sortBy) {
      case "oldest":
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case "newest":
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case "type":
        result.sort((a, b) => a.session_type.localeCompare(b.session_type))
        break
      case "status":
        result.sort((a, b) => a.status.localeCompare(b.status))
        break
    }

    return result
  }, [bookings, searchQuery, sortBy, filterType])

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const now = new Date()
  const completedCount = bookings.filter((b) => b.status === "completed").length
  const totalPhotos = bookings.reduce((acc, b) => acc + (b.photos?.length || 0), 0)
  
  const requestedBookings = bookings.filter((b) => b.status === "requested")
  const mostRecentRequested = requestedBookings.length > 0
    ? requestedBookings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    : null
  
  const upcomingBookings = bookings.filter((b) => {
    if (b.status === "requested") {
      return mostRecentRequested && b.id === mostRecentRequested.id
    }
    if (b.status === "scheduled") {
      return true
    }
    if (b.status === "confirmed") {
      return new Date(b.when_time) >= now
    }
    return false
  }).sort((a, b) => new Date(a.when_time).getTime() - new Date(b.when_time).getTime())
  
  const totalCount = completedCount + upcomingBookings.length
  
  const pastBookings = bookings.filter((b) => {
    // exclude "requested" bookings from past - they should only be in upcoming or cancelled
    if (b.status === "requested") return false
    
    // exclude cancelled bookings without photos (cancelled before delivery)
    if (b.status === "cancelled" && (!b.photos || b.photos.length === 0)) return false
    
    const bookingDate = new Date(b.when_time)
    return bookingDate < now || b.status === "completed" || (b.status === "cancelled" && b.photos && b.photos.length > 0)
  })

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      {/* Background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-blue-500/10 blur-[100px]" />
      </div>

      <div className="max-w-lg mx-auto px-5 pt-14 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
            <p className="text-sm text-neutral-400 mt-1">Your bookings & photo galleries</p>
          </div>
          <button
            onClick={fetchBookings}
            disabled={fetching}
            className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition disabled:opacity-50"
            title="Refresh"
          >
            <svg 
              className={`w-5 h-5 text-neutral-400 ${fetching ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
            <p className="text-xl font-bold">{totalCount}</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Total</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
            <p className="text-xl font-bold text-blue-400">{completedCount}</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Completed</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
            <p className="text-xl font-bold text-emerald-400">{totalPhotos}</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Photos</p>
          </div>
        </motion.div>

        {/* Upcoming Shoots Section */}
        {upcomingBookings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Upcoming</h2>
              <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">{upcomingBookings.length}</span>
            </div>
            <div className="space-y-3">
              {upcomingBookings.map((booking, index) => {
                const hasUnread = hasUnreadNotifications(booking)
                return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-transparent p-4 relative cursor-pointer"
                  onClick={() => {
                    markAsViewed(booking.id)
                    setExpandedBooking(expandedBooking === booking.id ? null : booking.id)
                  }}
                >
                  {/* Three dots menu or right arrow - top right */}
                  {booking.status === "completed" && booking.photos && booking.photos.length > 0 ? (
                    // right arrow for completed bookings with photos (view gallery)
                    <div className="absolute top-4 text-neutral-400 z-10"
                      style={{ right: 'calc(1rem - 0.875rem)', transform: 'translateX(-50%)' }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ) : (
                    // three dots for bookings that can be managed
                    (booking.status === "requested" || booking.status === "scheduled" || booking.status === "confirmed") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openManageSheet(booking)
                        }}
                        className="absolute top-4 text-neutral-400 hover:text-white transition z-10"
                        style={{ right: 'calc(1rem - 0.875rem)', transform: 'translateX(-50%)' }}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>
                    )
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{sessionTypeLabels[booking.session_type] || booking.session_type}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium flex-shrink-0 ${statusStyles[booking.status] || statusStyles.requested}`}>
                            {getStatusLabel(booking.status)}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500">{formatDate(booking.when_time)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 pr-14">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <span className="truncate">{booking.location_text}</span>
                  </div>
                </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Divider if there are upcoming bookings */}
        {upcomingBookings.length > 0 && (
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            <span className="text-[10px] text-neutral-600 uppercase tracking-wider">Past & Galleries</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          </div>
        )}

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search bookings, locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </motion.div>

        {/* Sort & Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex gap-2 mb-6"
        >
          {/* Sort Dropdown */}
          <div className="relative flex-1">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full appearance-none px-4 py-2.5 pr-10 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
            >
              <option value="newest">Most recent</option>
              <option value="oldest">Earliest first</option>
              <option value="type">By shoot type</option>
              <option value="status">By status</option>
            </select>
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Filter Dropdown */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none px-4 py-2.5 pr-10 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
            >
              <option value="all">All types</option>
              <option value="iphone">iPhone</option>
              <option value="raw_dslr">RAW DSLR</option>
              <option value="edited_dslr">Edited DSLR</option>
            </select>
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </motion.div>

        {/* Results count */}
        {(searchQuery || filterType !== "all") && (
          <p className="text-xs text-neutral-500 mb-4">
            {filteredBookings.length} result{filteredBookings.length !== 1 ? "s" : ""} found
          </p>
        )}

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
              <svg className="w-10 h-10 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-neutral-400 mb-2">No bookings yet</p>
            <p className="text-sm text-neutral-600 mb-6">Your photo sessions will appear here</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition"
            >
              Book your first session
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </motion.div>
        ) : filteredBookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-neutral-400">No matching bookings found</p>
            <button
              onClick={() => {
                setSearchQuery("")
                setFilterType("all")
              }}
              className="mt-2 text-sm text-blue-400 hover:text-blue-300"
            >
              Clear filters
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredBookings.map((booking, index) => {
                const hasUnread = hasUnreadNotifications(booking)
                return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.03 }}
                  className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden relative"
                >
                  {/* Three dots menu or right arrow - top right */}
                  {booking.status === "completed" && booking.photos && booking.photos.length > 0 ? (
                    // right arrow for completed bookings with photos (view gallery)
                    <div className="absolute top-5 text-neutral-400 z-10"
                      style={{ right: 'calc(1.25rem - 0.875rem)', transform: 'translateX(-50%)' }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ) : (
                    // three dots for bookings that can be managed
                    (booking.status === "requested" || booking.status === "scheduled" || booking.status === "confirmed") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openManageSheet(booking)
                        }}
                        className="absolute top-5 text-neutral-400 hover:text-white transition z-10"
                        style={{ right: 'calc(1.25rem - 0.875rem)', transform: 'translateX(-50%)' }}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>
                    )
                  )}
                  {/* Booking Header */}
                  <div
                    className="p-5 cursor-pointer hover:bg-white/[0.02] transition"
                    onClick={() => {
                      markAsViewed(booking.id)
                      setExpandedBooking(expandedBooking === booking.id ? null : booking.id)
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold">
                            {sessionTypeLabels[booking.session_type] || booking.session_type}
                          </h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium flex-shrink-0 ${
                              statusStyles[booking.status] || statusStyles.requested || "bg-neutral-700 text-neutral-300"
                            }`}
                          >
                            {getStatusLabel(booking.status)}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500">{formatDate(booking.when_time)}</p>
                      </div>
                      <motion.div
                        animate={{ rotate: expandedBooking === booking.id ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-shrink-0"
                      >
                        <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </motion.div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-neutral-400 pr-12">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">{booking.location_text}</span>
                    </div>

                    {/* Photo preview for completed bookings */}
                    {booking.photos && booking.photos.length > 0 && (
                      <div className="flex gap-2 mt-4">
                        {booking.photos.slice(0, 4).map((photo, i) => (
                          <div
                            key={i}
                            className="relative w-14 h-14 rounded-xl overflow-hidden ring-1 ring-white/10"
                          >
                            <img src={photo} alt="" className="w-full h-full object-cover" />
                            {i === 3 && booking.photos && booking.photos.length > 4 && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <span className="text-xs font-medium">+{booking.photos.length - 4}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {expandedBooking === booking.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 border-t border-white/[0.04]">
                          {/* Full Photo Gallery */}
                          {booking.photos && booking.photos.length > 0 ? (
                            <div className="pt-4">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-xs text-neutral-500 uppercase tracking-wider">
                                  {booking.photos.length} Photos
                                </p>
                                <button className="text-xs text-blue-400 hover:text-blue-300">
                                  Download all
                                </button>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {booking.photos.map((photo, i) => (
                                  <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="aspect-square rounded-xl overflow-hidden ring-1 ring-white/10 hover:ring-blue-500/40 transition cursor-pointer"
                                  >
                                    <img src={photo} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="pt-4 text-center py-6">
                              <p className="text-sm text-neutral-500">
                                {booking.status === "completed"
                                  ? "Photos coming soon..."
                                  : "Photos will appear here once the session is complete"}
                              </p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 mt-4">
                            {booking.status === "completed" && (
                              <button className="flex-1 py-2.5 rounded-xl bg-blue-500/10 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition">
                                Share gallery
                              </button>
                            )}
                            {(booking.status === "requested" || booking.status === "scheduled" || booking.status === "confirmed") && (
                              <button 
                                onClick={() => openManageSheet(booking)}
                                className="flex-1 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm font-medium hover:bg-white/[0.05] transition"
                              >
                                Manage booking
                              </button>
                            )}
                            {(booking.status === "completed" || booking.status === "cancelled") && (
                              <button 
                                onClick={() => router.push(`/book?session_type=${booking.session_type}`)}
                                className="flex-1 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm font-medium hover:bg-white/[0.05] transition"
                              >
                                Book again
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Manage Booking Sheet */}
      <AnimatePresence>
        {showManageSheet && selectedBooking && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowManageSheet(false)
                setShowCancelConfirm(false)
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-900 border-t border-white/[0.08] rounded-t-3xl overflow-hidden"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {!showCancelConfirm ? (
                <div className="px-5 pb-8">
                  {/* Booking Summary */}
                  <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/[0.06]">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{sessionTypeLabels[selectedBooking.session_type]}</h3>
                      <p className="text-xs text-neutral-400">{formatDate(selectedBooking.when_time)}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{selectedBooking.location_text}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full capitalize font-medium ${statusStyles[selectedBooking.status] || statusStyles.requested}`}>
                      {getStatusLabel(selectedBooking.status)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    {/* View Details */}
                    <button
                      onClick={() => {
                        setShowManageSheet(false)
                        setExpandedBooking(selectedBooking.id)
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
                        <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">View details</p>
                        <p className="text-xs text-neutral-500">See full booking information</p>
                      </div>
                      <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* Message */}
                    <button
                      onClick={() => {
                        setShowManageSheet(false)
                        router.push(`/messages?booking=${selectedBooking.id}`)
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Message photographer</p>
                        <p className="text-xs text-neutral-500">Chat about your shoot</p>
                      </div>
                      <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* Reschedule */}
                    {(selectedBooking.status === "requested" || selectedBooking.status === "scheduled" || selectedBooking.status === "confirmed") && (
                      <button
                        onClick={handleReschedule}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">Reschedule</p>
                          <p className="text-xs text-neutral-500">Change date or time</p>
                        </div>
                        <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}

                    {/* Cancel */}
                    {(selectedBooking.status === "requested" || selectedBooking.status === "scheduled" || selectedBooking.status === "confirmed") && (
                      <button
                        onClick={() => setShowCancelConfirm(true)}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-red-400">Cancel booking</p>
                          <p className="text-xs text-neutral-500">This cannot be undone</p>
                        </div>
                        <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Close button */}
                  <button
                    onClick={() => setShowManageSheet(false)}
                    className="w-full mt-4 py-3 text-sm text-neutral-400 hover:text-white transition"
                  >
                    Close
                  </button>
                </div>
              ) : (
                /* Cancel Confirmation */
                <div className="px-5 pb-8">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-1">Cancel this booking?</h3>
                    <p className="text-sm text-neutral-400">
                      This will cancel your {sessionTypeLabels[selectedBooking.session_type] || selectedBooking.session_type} 
                      {" "}scheduled for {formatShortDate(selectedBooking.when_time)}.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={handleCancelBooking}
                      disabled={isCancelling}
                      className="w-full py-3.5 rounded-2xl bg-red-500 text-white font-medium hover:bg-red-600 transition disabled:opacity-50"
                    >
                      {isCancelling ? "Cancelling..." : "Yes, cancel booking"}
                    </button>
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="w-full py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] font-medium hover:bg-white/[0.05] transition"
                    >
                      Keep booking
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

