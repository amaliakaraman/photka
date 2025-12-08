"use client"

import { useState, useEffect, Suspense, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/hooks/useAuth"
import { SESSIONS, isValidSessionType, SessionType, SESSION_KEYS } from "@/data/sessions"
import { getNearestPhotographer, Photographer } from "@/data/photographers"
import { MapView } from "@/components/MapView"
import { PhotographerCard } from "@/components/PhotographerCard"
import { THE_GULCH, LOCATION_SEARCH_RADIUS, NASHVILLE } from "@/constants/locations"

type BookingState = "selecting" | "searching" | "found" | "confirming" | "confirmed"
type BookingMode = "now" | "later"

function BookingFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()

  const [bookingState, setBookingState] = useState<BookingState>("selecting")
  const [bookingMode, setBookingMode] = useState<BookingMode>("now")
  const [photographer, setPhotographer] = useState<Photographer | null>(null)
  const [selectedType, setSelectedType] = useState<SessionType | null>(null)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [showSessionDropdown, setShowSessionDropdown] = useState(false)
  const [locationText, setLocationText] = useState<string>("Current Location")
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [locationSearch, setLocationSearch] = useState("")
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([])
  const [isCurrentLocation, setIsCurrentLocation] = useState(true)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const prevLocationRef = useRef<string>("")

  // Google Places Autocomplete - Nashville biased
  useEffect(() => {
    if (locationSearch.length < 2) {
      setLocationSuggestions([])
      return
    }

    const controller = new AbortController()
    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true)
      try {
        const response = await fetch(
          "https://places.googleapis.com/v1/places:autocomplete",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || "",
            },
            body: JSON.stringify({
              input: locationSearch,
              locationRestriction: {
                circle: {
                  center: { latitude: THE_GULCH.lat, longitude: THE_GULCH.lng },
                  radius: LOCATION_SEARCH_RADIUS,
                },
              },
              includedPrimaryTypes: ["street_address", "premise", "subpremise", "point_of_interest", "establishment"],
              includedRegionCodes: ["us"],
            }),
            signal: controller.signal,
          }
        )

        if (response.ok) {
          const data = await response.json()
          const suggestions = data.suggestions?.map(
            (s: { placePrediction?: { text?: { text?: string } } }) => 
              s.placePrediction?.text?.text || ""
          ).filter(Boolean) || []
          setLocationSuggestions(suggestions.slice(0, 5))
        }
      } catch (err) {
        // Silently ignore abort errors from cancelled requests
        if ((err as Error).name === "AbortError") return
      } finally {
        setIsLoadingSuggestions(false)
      }
    }

    const timer = setTimeout(fetchSuggestions, 300) // Debounce 300ms
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [locationSearch])

  // Get preselected session type from query params
  const paramType = searchParams.get("session_type") || searchParams.get("type")

  useEffect(() => {
    if (paramType && isValidSessionType(paramType)) {
      setSelectedType(paramType)
      setBookingState("searching")
    }
  }, [paramType])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  // Geocode address when locationText changes (if not current location)
  useEffect(() => {
    if (
      locationText && 
      locationText !== "Current Location" && 
      locationText !== prevLocationRef.current &&
      !isCurrentLocation && 
      selectedType
    ) {
      prevLocationRef.current = locationText
      
      const geocodeAddress = async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const randomOffset = () => (Math.random() - 0.5) * 0.1
        const newCoords = {
          lat: NASHVILLE.lat + randomOffset(),
          lng: NASHVILLE.lng + randomOffset(),
        }
        
        setUserCoords(newCoords)
        setPhotographer(null)
        setBookingState("searching")
        
        setTimeout(() => {
          const nearestPhotographer = getNearestPhotographer(newCoords)
          setPhotographer(nearestPhotographer)
          setBookingState("found")
        }, 2000)
      }
      
      geocodeAddress()
    }
  }, [locationText, isCurrentLocation, selectedType])

  // Find photographer after location is found and session is selected
  useEffect(() => {
    if (userCoords && bookingState === "searching" && selectedType) {
      const timer = setTimeout(() => {
        const nearestPhotographer = getNearestPhotographer(userCoords)
        setPhotographer(nearestPhotographer)
        setBookingState("found")
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [userCoords, bookingState, selectedType])

  const handleLocationFound = useCallback((coords: { lat: number; lng: number }) => {
    setUserCoords(coords)
  }, [])

  function handleSelectSession(type: SessionType) {
    setSelectedType(type)
    setBookingState("searching")
  }

  async function handleConfirmBooking() {
    if (!user || !photographer || !selectedType) return

    // Verify we have an active session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      alert("You must be logged in to create a booking. Redirecting to login...")
      router.push("/login")
      return
    }

    // check for existing instant bookings (requested status) - prevent multiple in queue
    // exclude old bookings (older than 2 hours) - cancelled bookings are already excluded by status filter
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("id, status, created_at")
      .eq("email", user.email)
      .eq("status", "requested")
      .gte("created_at", twoHoursAgo)
      .limit(1)

    if (existingBookings && existingBookings.length > 0) {
      alert("You already have an instant booking in queue. Please wait for it to be confirmed or cancelled before booking another.")
      return
    }

    setBookingState("confirming")

    const bookingData = {
      full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      email: user.email,
      phone: user.user_metadata?.phone || "",
      session_type: selectedType,
      duration_min: 60,
      when_time: new Date().toISOString(),
      location_text: locationText,
      status: "requested",
    }

    const { error } = await supabase
      .from("bookings")
      .insert(bookingData)
      .select()

    if (error) {
      setBookingState("found")
      alert(`Failed to create booking: ${error.message || "Please try again."}`)
    } else {
      setBookingState("confirmed")
      setTimeout(() => {
        router.push("/activity")
        router.refresh()
      }, 2500)
    }
  }

  const currentSession = selectedType ? SESSIONS[selectedType] : null

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

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      {/* Map Background - dimmed when selecting */}
      <div className={`transition-opacity duration-300 ${bookingState === "selecting" ? "opacity-40" : "opacity-100"}`}>
        <MapView
          isSearching={bookingState === "searching"}
          photographerFound={photographer !== null}
          onLocationFound={handleLocationFound}
          userCoords={userCoords}
          photographerCoords={photographer?.coords}
          photographerMatched={bookingState === "found" || bookingState === "confirming"}
        />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Top Bar */}
        <div className="p-4 pb-0">
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

          {/* Now / Later Toggle */}
          <div className="flex bg-neutral-900/80 backdrop-blur-xl rounded-full p-1 border border-white/[0.06] mb-4">
            <button
              onClick={() => setBookingMode("now")}
              className={`flex-1 py-2.5 px-4 rounded-full text-sm font-medium transition-all ${
                bookingMode === "now"
                  ? "bg-white text-black"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Shoot Now
            </button>
            <button
              onClick={() => {
                setBookingMode("later")
                router.push("/schedule")
              }}
              className={`flex-1 py-2.5 px-4 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                bookingMode === "later"
                  ? "bg-white text-black"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Schedule Later
            </button>
          </div>

          {/* Combined Session + Location Card */}
          {currentSession && bookingState !== "selecting" && (
            <div className="z-30">
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={`rounded-2xl bg-gradient-to-r ${currentSession.accentColor} p-[1px]`}
              >
                <div className="rounded-2xl bg-neutral-950/95 backdrop-blur-sm overflow-visible">
                  {/* Session Type Row + Dropdown Container */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowSessionDropdown(!showSessionDropdown)
                        setShowLocationDropdown(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.02] transition text-left rounded-t-2xl"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{currentSession.title}</p>
                        <p className="text-[10px] text-neutral-500">{currentSession.price}</p>
                      </div>
                      <svg 
                        className={`w-4 h-4 text-neutral-500 transition-transform ${showSessionDropdown ? "rotate-180" : ""}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Session Dropdown - appears right under session row */}
                    <AnimatePresence>
                      {showSessionDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 right-0 mt-1 z-50 rounded-2xl bg-neutral-900 backdrop-blur-xl border border-white/[0.08] overflow-hidden shadow-2xl"
                        >
                          {SESSION_KEYS.map((key) => {
                            const session = SESSIONS[key]
                            const isSelected = key === selectedType
                            return (
                              <button
                                key={key}
                                onClick={() => {
                                  if (key !== selectedType) {
                                    setSelectedType(key)
                                    setPhotographer(null)
                                    setBookingState("searching")
                                  }
                                  setShowSessionDropdown(false)
                                }}
                                className={`w-full flex items-center justify-between p-3 text-left transition-all ${
                                  isSelected 
                                    ? "bg-blue-500/10 border-l-2 border-blue-400" 
                                    : "hover:bg-white/[0.03] border-l-2 border-transparent"
                                }`}
                              >
                                <div>
                                  <p className={`text-sm font-medium ${isSelected ? "text-blue-400" : ""}`}>{session.title}</p>
                                  <p className="text-[10px] text-neutral-500">{session.blurb}</p>
                                </div>
                                <p className="text-sm font-semibold text-blue-400">{session.price}</p>
                              </button>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-white/[0.06] mx-3" />

                  {/* Location Row + Dropdown Container */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowLocationDropdown(!showLocationDropdown)
                        setShowSessionDropdown(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.02] transition text-left rounded-b-2xl"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{locationText}</p>
                        <p className="text-[10px] text-neutral-500">{isCurrentLocation ? "Using GPS" : "Custom address"}</p>
                      </div>
                      <svg 
                        className={`w-4 h-4 text-neutral-500 transition-transform ${showLocationDropdown ? "rotate-180" : ""}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Location Dropdown - appears right under location row */}
                    <AnimatePresence>
                      {showLocationDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 right-0 mt-1 z-50 rounded-2xl bg-neutral-900 backdrop-blur-xl border border-white/[0.08] overflow-hidden shadow-2xl"
                        >
                          {/* Search Input */}
                          <div className="p-3 border-b border-white/[0.06]">
                            <div className="flex items-center gap-2 bg-white/[0.05] rounded-xl px-3 py-2">
                              <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              <input
                                type="text"
                                placeholder="Search address..."
                                value={locationSearch}
                                onChange={(e) => setLocationSearch(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 outline-none"
                                autoFocus
                              />
                              {locationSearch && (
                                <button onClick={() => setLocationSearch("")} className="text-neutral-500 hover:text-white">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Current Location Option */}
                          <button
                            onClick={() => {
                              setLocationText("Current Location")
                              setIsCurrentLocation(true)
                              setShowLocationDropdown(false)
                              setLocationSearch("")
                            }}
                            className={`w-full flex items-center gap-3 p-3 text-left transition-all ${
                              isCurrentLocation 
                                ? "bg-blue-500/10 border-l-2 border-blue-400" 
                                : "hover:bg-white/[0.03] border-l-2 border-transparent"
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
                              <svg className="w-3.5 h-3.5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="4" />
                              </svg>
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${isCurrentLocation ? "text-blue-400" : ""}`}>Current Location</p>
                              <p className="text-[10px] text-neutral-500">Using your live GPS</p>
                            </div>
                          </button>

                          {/* Loading state */}
                          {isLoadingSuggestions && locationSearch.length >= 2 && (
                            <div className="p-4 flex items-center justify-center gap-2 border-t border-white/[0.06]">
                              <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                              <span className="text-xs text-neutral-400">Searching...</span>
                            </div>
                          )}

                          {/* Address Suggestions from Google */}
                          {!isLoadingSuggestions && locationSuggestions.length > 0 && (
                            <div className="border-t border-white/[0.06]">
                              {locationSuggestions.map((addr, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setLocationText(addr)
                                    setIsCurrentLocation(false)
                                    setShowLocationDropdown(false)
                                    setLocationSearch("")
                                  }}
                                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.03] transition-all border-l-2 border-transparent hover:border-l-2 hover:border-blue-400"
                                >
                                  <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center">
                                    <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                  </div>
                                  <p className="text-sm text-neutral-300 line-clamp-2">{addr}</p>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Use custom address - show when typing but no suggestions found */}
                          {!isLoadingSuggestions && locationSearch.length >= 3 && locationSuggestions.length === 0 && (
                            <div className="border-t border-white/[0.06]">
                              <button
                                onClick={() => {
                                  const finalAddress = locationSearch.includes(",") ? locationSearch : `${locationSearch}, Nashville, TN`
                                  setLocationText(finalAddress)
                                  setIsCurrentLocation(false)
                                  setShowLocationDropdown(false)
                                  setLocationSearch("")
                                }}
                                className="w-full flex items-center gap-3 p-3 text-left hover:bg-blue-500/10 transition-all border-l-2 border-blue-400"
                              >
                                <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-blue-400">Use "{locationSearch}"</p>
                                  <p className="text-[10px] text-neutral-500">Enter custom address</p>
                                </div>
                              </button>
                            </div>
                          )}

                          {/* Hint when no search */}
                          {locationSearch.length === 0 && (
                            <div className="p-3 text-center text-xs text-neutral-500">
                              Start typing an address
                            </div>
                          )}

                          {/* No results hint */}
                          {!isLoadingSuggestions && locationSearch.length >= 2 && locationSearch.length < 3 && locationSuggestions.length === 0 && (
                            <div className="p-3 text-center text-xs text-neutral-500">
                              Keep typing for suggestions...
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom Content */}
        <div className="p-4 pb-24">
          <AnimatePresence mode="wait">
            {/* Session Type Selection */}
            {bookingState === "selecting" && (
              <motion.div
                key="selecting"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-2xl p-4"
              >
                <h3 className="text-base font-semibold mb-3">Choose a session</h3>
                
                <div className="space-y-2">
                  {SESSION_KEYS.map((key) => {
                    const session = SESSIONS[key]
                    return (
                      <motion.button
                        key={key}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectSession(key)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-blue-500/30 hover:bg-white/[0.05] transition-all text-left group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{session.title}</p>
                          <p className="text-[11px] text-neutral-500 truncate">{session.blurb}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-blue-400">{session.price}</p>
                        </div>
                        <svg className="w-4 h-4 text-neutral-600 group-hover:text-blue-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Searching */}
            {bookingState === "searching" && (
              <motion.div
                key="searching"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-2xl p-4 text-center"
              >
                <div className="flex items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-neutral-700 border-t-white animate-spin" />
                  <div className="text-left">
                    <h3 className="text-sm font-semibold">Finding photographers</h3>
                    <p className="text-xs text-neutral-400">Searching nearby...</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Photographer Found */}
            {(bookingState === "found" || bookingState === "confirming") && photographer && (
              <PhotographerCard
                key="photographer"
                photographer={photographer}
                sessionType={currentSession?.title || ""}
                onConfirm={handleConfirmBooking}
                isLoading={bookingState === "confirming"}
              />
            )}

            {/* Confirmed */}
            {bookingState === "confirmed" && (
              <motion.div
                key="confirmed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-neutral-900/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-400">Booking Requested!</h3>
                    <p className="text-xs text-neutral-400">{photographer?.name} will confirm shortly</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="animate-pulse text-neutral-400">Loading...</div>
        </div>
      }
    >
      <BookingFlow />
    </Suspense>
  )
}
