"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/hooks/useAuth"
import { SESSIONS, isValidSessionType, SessionType, SESSION_KEYS } from "@/data/sessions"
import Link from "next/link"

function ScheduleFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()

  const [step, setStep] = useState<"session" | "calendar" | "time" | "details" | "confirm">("session")
  const [selectedType, setSelectedType] = useState<SessionType | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [shootDescription, setShootDescription] = useState<string>("")
  const [preferredPhotographer, setPreferredPhotographer] = useState<string>("")
  const [showPhotographerDropdown, setShowPhotographerDropdown] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSessionDropdown, setShowSessionDropdown] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showDateTimePicker, setShowDateTimePicker] = useState(false)
  const [dateTimePickerStep, setDateTimePickerStep] = useState<"date" | "time">("date")

  // available photographers
  const photographers = [
    { id: "nic-noel", name: "Nic Noel", specialty: "Lifestyle & Portraits", rating: 4.9 },
    { id: "amalia-karaman", name: "Amalia Karaman", specialty: "Events & Weddings", rating: 4.8 },
  ]

  // get preselected session type from query params
  const paramType = searchParams.get("session_type") || searchParams.get("type")

  useEffect(() => {
    if (paramType && isValidSessionType(paramType)) {
      setSelectedType(paramType)
      setStep("calendar")
    }
  }, [paramType])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  // generate time slots
  const getTimeSlots = () => {
    const slots = []
    for (let hour = 8; hour <= 20; hour++) {
      slots.push(`${hour}:00`)
      if (hour < 20) {
        slots.push(`${hour}:30`)
      }
    }
    return slots
  }

  // check if a time slot is available (80% should be busy)
  const isTimeSlotAvailable = (time: string, date: string) => {
    // use date and time as seed for consistent results
    const seed = `${date}-${time}`
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // convert to 32bit integer
    }
    // use hash to determine availability (20% available, 80% busy)
    const normalized = Math.abs(hash) % 100
    return normalized < 20
  }

  const formatDate = (date: Date) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: months[date.getMonth()],
      full: date.toISOString().split("T")[0],
    }
  }

  const formatTimeDisplay = (time: string) => {
    const [hour] = time.split(":")
    const h = parseInt(hour)
    const ampm = h >= 12 ? "PM" : "AM"
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${displayHour}:${time.split(":")[1]} ${ampm}`
  }

  function handleSelectSession(type: SessionType) {
    setSelectedType(type)
    setStep("calendar")
  }

  // calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    
    const days: (Date | null)[] = []
    
    // add empty slots for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null)
    }
    
    // add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    
    return days
  }

  const isDateSelectable = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date >= today
  }

  const isSameDay = (date1: Date, date2: string) => {
    const d = new Date(date2)
    return date1.getFullYear() === d.getFullYear() &&
           date1.getMonth() === d.getMonth() &&
           date1.getDate() === d.getDate()
  }

  const formatMonthYear = (date: Date) => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    return `${months[date.getMonth()]} ${date.getFullYear()}`
  }

  const goToPrevMonth = () => {
    const today = new Date()
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    // don't go before current month
    if (newMonth.getMonth() >= today.getMonth() || newMonth.getFullYear() > today.getFullYear()) {
      setCurrentMonth(newMonth)
    }
  }

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    // allow up to 3 months ahead
    const maxMonth = new Date()
    maxMonth.setMonth(maxMonth.getMonth() + 3)
    if (newMonth <= maxMonth) {
      setCurrentMonth(newMonth)
    }
  }

  function handleSelectDate(date: Date) {
    setSelectedDate(date.toISOString().split("T")[0])
    setStep("time")
  }

  function handleSelectTime(time: string) {
    setSelectedTime(time)
    setStep("details")
  }

  async function handleConfirmBooking() {
    if (!user || !selectedType || !selectedDate || !selectedTime) return

    setIsSubmitting(true)

    const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}:00`)

    const { error } = await supabase.from("bookings").insert({
      full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      email: user.email,
      phone: user.user_metadata?.phone || "",
      session_type: selectedType,
      duration_min: 60,
      when_time: scheduledDateTime.toISOString(),
      location_text: shootDescription || "To be confirmed",
      status: "scheduled",
    })

    if (error) {
      setIsSubmitting(false)
    } else {
      setStep("confirm")
      setTimeout(() => router.push("/activity"), 2500)
    }
  }

  const currentSession = selectedType ? SESSIONS[selectedType] : null
  const allTimeSlots = getTimeSlots()
  
  // filter to only show available time slots (20% available, 80% hidden)
  const getAvailableTimeSlots = (date: string) => {
    return allTimeSlots.filter(time => isTimeSlotAvailable(time, date))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // check if any dropdown is open to add extra scroll space
  const isAnyDropdownOpen = showPhotographerDropdown || showSessionDropdown || showDateTimePicker

  return (
    <div className={`bg-black text-white min-h-screen ${isAnyDropdownOpen ? "pb-96" : "pb-24"}`}>
      {/* header */}
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-black/80 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Back</span>
            </Link>
          </div>

          {/* now / later toggle */}
          <div className="flex bg-neutral-900/80 backdrop-blur-xl rounded-full p-1 border border-white/[0.06]">
            <button
              onClick={() => router.push("/book")}
              className="flex-1 py-2.5 px-4 rounded-full text-sm font-medium transition-all text-neutral-400 hover:text-white"
            >
              Shoot Now
            </button>
            <button
              className="flex-1 py-2.5 px-4 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2 bg-white text-black"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Schedule Later
            </button>
          </div>
        </div>
      </div>

      {/* content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {/* step 1: session selection */}
          {step === "session" && (
            <motion.div
              key="session"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-xl font-semibold mb-1">Schedule a shoot</h2>
              <p className="text-sm text-neutral-400 mb-6">Choose your session type</p>

              <div className="space-y-3">
                {SESSION_KEYS.map((key) => {
                  const session = SESSIONS[key]
                  return (
                    <motion.button
                      key={key}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectSession(key)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-blue-500/30 hover:bg-white/[0.05] transition-all text-left group"
                    >
                      <div className="flex-1">
                        <p className="font-medium mb-0.5">{session.title}</p>
                        <p className="text-xs text-neutral-500">{session.blurb}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-blue-400">{session.price}</p>
                        <p className="text-[10px] text-neutral-500">{session.delivery}</p>
                      </div>
                      <svg className="w-4 h-4 text-neutral-600 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* step 2: calendar view */}
          {step === "calendar" && currentSession && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* selected session summary with dropdown */}
              <div className="relative mb-6">
                <div className="rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 p-[1px]">
                  <button
                    onClick={() => setShowSessionDropdown(!showSessionDropdown)}
                    className="w-full rounded-2xl bg-neutral-950/95 p-4 text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{currentSession.title}</h3>
                        <p className="text-xs text-neutral-400">{currentSession.price}</p>
                      </div>
                      <svg 
                        className={`w-4 h-4 text-neutral-600 group-hover:text-blue-400 transition-all ${showSessionDropdown ? "rotate-180" : ""}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                </div>

                {/* session dropdown */}
                <AnimatePresence>
                  {showSessionDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 right-0 mt-2 z-30 rounded-2xl bg-neutral-900/95 backdrop-blur-xl border border-white/[0.08] overflow-hidden shadow-xl"
                    >
                      {SESSION_KEYS.map((key) => {
                        const session = SESSIONS[key]
                        const isSelected = key === selectedType
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              setSelectedType(key)
                              setShowSessionDropdown(false)
                            }}
                            className={`w-full flex items-center justify-between p-4 text-left transition-all ${
                              isSelected 
                                ? "bg-blue-500/10 border-l-2 border-blue-400" 
                                : "hover:bg-white/[0.03] border-l-2 border-transparent"
                            }`}
                          >
                            <div>
                              <p className={`font-medium ${isSelected ? "text-blue-400" : ""}`}>{session.title}</p>
                              <p className="text-xs text-neutral-500">{session.blurb}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-blue-400">{session.price}</p>
                            </div>
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* monthly calendar */}
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={goToPrevMonth}
                    className="p-2 rounded-full hover:bg-white/[0.05] transition text-neutral-400 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h3 className="text-lg font-semibold">{formatMonthYear(currentMonth)}</h3>
                  <button
                    onClick={goToNextMonth}
                    className="p-2 rounded-full hover:bg-white/[0.05] transition text-neutral-400 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Day Labels */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-center text-xs text-neutral-500 font-medium py-2">
                      {day}
                    </div>
                            ))}
                          </div>

                          {/* calendar grid */}
                          <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(currentMonth).map((date, idx) => {
                    if (!date) {
                      return <div key={`empty-${idx}`} className="aspect-square" />
                    }
                    
                    const isSelectable = isDateSelectable(date)
                    const isToday = date.toDateString() === new Date().toDateString()
                    
                    return (
                      <motion.button
                        key={date.toISOString()}
                        whileTap={isSelectable ? { scale: 0.9 } : undefined}
                        onClick={() => isSelectable && handleSelectDate(date)}
                        disabled={!isSelectable}
                        className={`aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all relative ${
                          isSelectable
                            ? "hover:bg-blue-500/20 hover:text-blue-400"
                            : "text-neutral-700 cursor-not-allowed"
                        } ${isToday ? "ring-1 ring-blue-500/50" : ""}`}
                      >
                        {date.getDate()}
                        {isToday && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              <p className="text-center text-xs text-neutral-500 mt-4">
                Tap a date to see available times
              </p>
            </motion.div>
          )}

          {/* step 3: time selection */}
          {step === "time" && currentSession && (
            <motion.div
              key="time"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* selected date header */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => {
                    setStep("calendar")
                    setSelectedDate("")
                  }}
                  className="p-2 -ml-2 rounded-full hover:bg-white/[0.05] transition text-neutral-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h2 className="text-xl font-semibold">
                    {formatDate(new Date(selectedDate)).day}, {formatDate(new Date(selectedDate)).month} {formatDate(new Date(selectedDate)).date}
                  </h2>
                  <p className="text-sm text-neutral-400">{currentSession.title}</p>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-1">Choose a time</h3>
              <p className="text-sm text-neutral-500 mb-4">All times in your local timezone</p>

              <div className="grid grid-cols-3 gap-2">
                {getAvailableTimeSlots(selectedDate).map((time) => (
                  <motion.button
                    key={time}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelectTime(time)}
                    className="py-3.5 px-3 rounded-xl text-sm font-medium border bg-white/[0.03] border-white/[0.06] hover:border-blue-500/30 hover:bg-blue-500/10 text-neutral-300 hover:text-white transition-all"
                  >
                    {formatTimeDisplay(time)}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* step 4: shoot details */}
          {step === "details" && currentSession && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* summary header */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => {
                    setStep("time")
                    setSelectedTime("")
                  }}
                  className="p-2 -ml-2 rounded-full hover:bg-white/[0.05] transition text-neutral-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h2 className="text-xl font-semibold">Almost there!</h2>
                  <p className="text-sm text-neutral-400">
                    {formatDate(new Date(selectedDate)).month} {formatDate(new Date(selectedDate)).date} at {formatTimeDisplay(selectedTime)}
                  </p>
                </div>
              </div>

              {/* session summary card with date/time picker */}
              <div className="relative mb-6">
                <div className="rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 p-[1px]">
                  <div className="rounded-2xl bg-neutral-950/95 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{currentSession.title}</h3>
                        <p className="text-xs text-neutral-400">{currentSession.price} · {currentSession.delivery}</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowDateTimePicker(!showDateTimePicker)
                          setDateTimePickerStep("date")
                        }}
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition group"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-medium">
                          {formatDate(new Date(selectedDate)).month} {formatDate(new Date(selectedDate)).date}, {formatTimeDisplay(selectedTime)}
                        </span>
                        <svg 
                          className={`w-3 h-3 transition-transform ${showDateTimePicker ? "rotate-180" : ""}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* date/time picker dropdown */}
                <AnimatePresence>
                  {showDateTimePicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 right-0 mt-2 z-30 rounded-2xl bg-neutral-900/95 backdrop-blur-xl border border-white/[0.08] overflow-hidden shadow-xl"
                    >
                      {/* step indicator */}
                      <div className="flex border-b border-white/[0.06]">
                        <button
                          onClick={() => setDateTimePickerStep("date")}
                          className={`flex-1 py-3 text-sm font-medium transition ${
                            dateTimePickerStep === "date" 
                              ? "text-blue-400 border-b-2 border-blue-400" 
                              : "text-neutral-500 hover:text-white"
                          }`}
                        >
                          Date
                        </button>
                        <button
                          onClick={() => setDateTimePickerStep("time")}
                          className={`flex-1 py-3 text-sm font-medium transition ${
                            dateTimePickerStep === "time" 
                              ? "text-blue-400 border-b-2 border-blue-400" 
                              : "text-neutral-500 hover:text-white"
                          }`}
                        >
                          Time
                        </button>
                      </div>

                      {/* date selection */}
                      {dateTimePickerStep === "date" && (
                        <div className="p-4">
                          {/* month navigation */}
                          <div className="flex items-center justify-between mb-3">
                            <button
                              onClick={goToPrevMonth}
                              className="p-1.5 rounded-full hover:bg-white/[0.05] transition text-neutral-400 hover:text-white"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                              </svg>
                            </button>
                            <span className="text-sm font-medium">{formatMonthYear(currentMonth)}</span>
                            <button
                              onClick={goToNextMonth}
                              className="p-1.5 rounded-full hover:bg-white/[0.05] transition text-neutral-400 hover:text-white"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>

                          {/* day labels */}
                          <div className="grid grid-cols-7 gap-1 mb-1">
                            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                              <div key={i} className="text-center text-[10px] text-neutral-500 font-medium py-1">
                                {day}
                              </div>
                            ))}
                          </div>

                          {/* calendar grid */}
                          <div className="grid grid-cols-7 gap-1">
                            {getDaysInMonth(currentMonth).map((date, idx) => {
                              if (!date) {
                                return <div key={`empty-${idx}`} className="aspect-square" />
                              }
                              
                              const isSelectable = isDateSelectable(date)
                              const isSelected = selectedDate && isSameDay(date, selectedDate)
                              
                              return (
                                <button
                                  key={date.toISOString()}
                                  onClick={() => {
                                    if (isSelectable) {
                                      setSelectedDate(date.toISOString().split("T")[0])
                                      setDateTimePickerStep("time")
                                    }
                                  }}
                                  disabled={!isSelectable}
                                  className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                                    isSelected
                                      ? "bg-blue-500 text-white"
                                      : isSelectable
                                        ? "hover:bg-blue-500/20 hover:text-blue-400"
                                        : "text-neutral-700 cursor-not-allowed"
                                  }`}
                                >
                                  {date.getDate()}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* time selection */}
                      {dateTimePickerStep === "time" && (
                        <div className="p-4 max-h-64 overflow-y-auto">
                          <div className="grid grid-cols-3 gap-2">
                            {getAvailableTimeSlots(selectedDate).map((time) => {
                              const isSelected = selectedTime === time
                              return (
                                <button
                                  key={time}
                                  onClick={() => {
                                    setSelectedTime(time)
                                    setShowDateTimePicker(false)
                                  }}
                                  className={`py-2.5 px-2 rounded-xl text-xs font-medium border transition-all ${
                                    isSelected
                                      ? "bg-blue-500 border-blue-400 text-white"
                                      : "bg-white/[0.03] border-white/[0.06] hover:border-blue-500/30 hover:bg-blue-500/10 text-neutral-300 cursor-pointer"
                                  }`}
                                >
                                  {formatTimeDisplay(time)}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* shoot description, required */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold">Describe your shoot</h3>
                  <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">Required</span>
                </div>
                <p className="text-sm text-neutral-500 mb-4">Location, vibe, any special requests</p>
                
                <textarea
                  value={shootDescription}
                  onChange={(e) => setShootDescription(e.target.value)}
                  placeholder="e.g. Professional headshots at my office in SoHo, modern/minimalist vibe. Need both indoor and outdoor shots..."
                  className={`w-full h-32 px-4 py-3 rounded-2xl bg-white/[0.03] border focus:outline-none focus:ring-0 text-white placeholder-neutral-600 text-sm resize-none transition-colors ${
                    shootDescription.trim() ? "border-white/[0.08] focus:border-blue-500/50" : "border-red-500/30 focus:border-red-500/50"
                  }`}
                />
                {!shootDescription.trim() && (
                  <p className="text-xs text-red-400/70 mt-2">Please describe your shoot so we can match you with the right photographer</p>
                )}
              </div>

              {/* preferred photographer, optional */}
              <div className="mb-8 relative">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold">Preferred photographer</h3>
                  <span className="text-[10px] text-neutral-500 bg-white/[0.05] px-1.5 py-0.5 rounded">Optional</span>
                </div>
                <p className="text-sm text-neutral-500 mb-4">Request a specific photographer if you have one in mind</p>

                <button
                  onClick={() => setShowPhotographerDropdown(!showPhotographerDropdown)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-blue-500/30 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    {preferredPhotographer ? (
                      <>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-black font-semibold text-sm">
                          {photographers.find(p => p.id === preferredPhotographer)?.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{photographers.find(p => p.id === preferredPhotographer)?.name}</p>
                          <p className="text-xs text-neutral-500">{photographers.find(p => p.id === preferredPhotographer)?.specialty}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center">
                          <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <p className="text-neutral-400">Any available photographer</p>
                      </>
                    )}
                  </div>
                  <svg 
                    className={`w-4 h-4 text-neutral-600 group-hover:text-blue-400 transition-all ${showPhotographerDropdown ? "rotate-180" : ""}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* photographer dropdown */}
                <AnimatePresence>
                  {showPhotographerDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 right-0 mt-2 z-30 rounded-2xl bg-neutral-900/95 backdrop-blur-xl border border-white/[0.08] shadow-xl max-h-72 overflow-y-auto"
                    >
                      {/* no preference option */}
                      <button
                        onClick={() => {
                          setPreferredPhotographer("")
                          setShowPhotographerDropdown(false)
                        }}
                        className={`w-full flex items-center gap-3 p-4 text-left transition-all ${
                          !preferredPhotographer 
                            ? "bg-blue-500/10 border-l-2 border-blue-400" 
                            : "hover:bg-white/[0.03] border-l-2 border-transparent"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center">
                          <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className={`font-medium ${!preferredPhotographer ? "text-blue-400" : ""}`}>Any available</p>
                          <p className="text-xs text-neutral-500">We&apos;ll match you with the best fit</p>
                        </div>
                      </button>

                      {/* photographer options */}
                      {photographers.map((photographer) => {
                        const isSelected = preferredPhotographer === photographer.id
                        return (
                          <button
                            key={photographer.id}
                            onClick={() => {
                              setPreferredPhotographer(photographer.id)
                              setShowPhotographerDropdown(false)
                            }}
                            className={`w-full flex items-center gap-3 p-4 text-left transition-all ${
                              isSelected 
                                ? "bg-blue-500/10 border-l-2 border-blue-400" 
                                : "hover:bg-white/[0.03] border-l-2 border-transparent"
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-black font-semibold text-sm">
                              {photographer.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <p className={`font-medium ${isSelected ? "text-blue-400" : ""}`}>{photographer.name}</p>
                              <p className="text-xs text-neutral-500">{photographer.specialty}</p>
                            </div>
                            <div className="flex items-center gap-1 text-amber-400">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="text-xs font-medium">{photographer.rating}</span>
                            </div>
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* confirm button */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleConfirmBooking}
                disabled={isSubmitting || !shootDescription.trim()}
                className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all ${
                  shootDescription.trim()
                    ? "bg-white text-black hover:bg-neutral-100"
                    : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-neutral-400 border-t-black rounded-full animate-spin" />
                    Scheduling...
                  </span>
                ) : (
                  "Confirm Booking"
                )}
              </motion.button>
            </motion.div>
          )}

          {/* step 3: confirmation */}
          {step === "confirm" && currentSession && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15 }}
                className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6"
              >
                <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>

              <h2 className="text-2xl font-semibold mb-2 text-emerald-400">Shoot Scheduled!</h2>
              <p className="text-neutral-400 mb-4">
                Your {currentSession.title} is booked for
              </p>
              <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-full px-5 py-2.5">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">
                  {formatDate(new Date(selectedDate)).month} {formatDate(new Date(selectedDate)).date} at {formatTimeDisplay(selectedTime)}
                </span>
              </div>

              <p className="text-sm text-neutral-500 mt-8">
                We&apos;ll match you with a photographer soon. Redirecting...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function SchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="animate-pulse text-neutral-400">Loading...</div>
        </div>
      }
    >
      <ScheduleFlow />
    </Suspense>
  )
}

