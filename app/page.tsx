"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { SESSIONS, SESSION_KEYS, SessionType } from "@/data/sessions"
import { PHOTOGRAPHERS } from "@/data/photographers"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabaseClient"
import { Booking } from "@/types/booking"
import { THE_GULCH } from "@/constants/locations"
import { getGreeting, getCSTTime } from "@/utils/date"
import { LoadingScreen } from "@/components/LoadingScreen"
import { StaticLogo } from "@/components/StaticLogo"

function getContextualHint(
  weather?: { condition: string; temp: number; isGood: boolean }
): { icon: string; text: string } | null {
  // get cst time
  const now = new Date()
  const cstTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }))
  const hour = cstTime.getHours()
  const minute = cstTime.getMinutes()
  const timeInMinutes = hour * 60 + minute
  const day = cstTime.getDay() // 0 = Sunday, 6 = Saturday
  
  // helper to randomly select from array
  const random = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]
  
  if (day === 0 || day === 6) {
    return { icon: "✦", text: "Weekend shoots" }
  }
  if (weather) {
    const condition = weather.condition.toLowerCase()
    const showWeather = Math.random() < 0.5 // 50% chance to show weather hint
    
    // storm, always show weather
    if (condition.includes("thunderstorm") || condition.includes("severe")) {
      return { icon: "⛈️", text: "Indoors works too" }
    }
    
    // snow, always show weather
    if (condition.includes("snow") || condition.includes("sleet")) {
      return { icon: "❄️", text: "Winter Wonderland" }
    }
    
    // rainy
    if (condition.includes("rain") || condition.includes("shower") || condition.includes("drizzle")) {
      if (showWeather) {
        return { icon: "🌧️", text: "Rain or shine" }
      }
      // fall through to time-based
    }
    
    // Cloudy
    if (condition.includes("cloudy") && !condition.includes("partly") && !condition.includes("mostly")) {
      if (showWeather) {
        return { icon: "☁️", text: "Soft, diffused light" }
      }
      // fall through to time-based
    }
    
    // partly cloudy
    if (condition.includes("partly") || condition.includes("mostly cloudy")) {
      if (showWeather) {
        return { icon: "☁️", text: "Balanced light" }
      }
      // fall through to time-based
    }
    
    // sunny morning (before 12 pm)
    if ((condition.includes("sunny") || condition.includes("clear")) && hour < 12) {
      if (showWeather) {
        const options = ["Bright start", "Morning looks good", "Start the day", "Fresh lighting"]
        return { icon: "☀️", text: random(options) }
      }
      // fall through to time-based
    }
  }
  
  // time-based hints
  // 5:30 pm to 10:00 pm
  if (timeInMinutes >= 17 * 60 + 30 && timeInMinutes < 22 * 60) {
    const options = ["Proof of tonight", "Capture tonight"]
    return { icon: "🌙", text: random(options) }
  }
  
  // 4:30 pm to 5:30 pm
  if (timeInMinutes >= 16 * 60 + 30 && timeInMinutes < 17 * 60 + 30) {
    const options = ["Evening starts soon", "Before the night", "Worth remembering"]
    return { icon: "🌅", text: random(options) }
  }
  
  // 2:30 pm to 4:30 pm
  if (timeInMinutes >= 14 * 60 + 30 && timeInMinutes < 16 * 60 + 30) {
    const options = ["Sunset shoots", "Last light window"]
    return { icon: "🌅", text: random(options) }
  }
  
  // 12:00 pm to 2:30 pm
  if (timeInMinutes >= 12 * 60 && timeInMinutes < 14 * 60 + 30) {
    const options = ["Beautiful day for photos", "Easy photo hour", "Midday window"]
    return { icon: "☀️", text: random(options) }
  }
  
  // morning (before 12 pm)
  if (hour < 12) {
    const options = ["Bright start", "Morning looks good", "Start the day", "Fresh lighting"]
    return { icon: "☀️", text: random(options) }
  }
  
  return null
}

// gallery images
const galleryImages = [
  "/photkapic1.jpg",
  "/photkapic2.jpg",
  "/photkapic3.jpg",
  "/photkapic4.jpg",
  "/photkapic5.jpg",
  "/photkapic6.jpg",
]

// live activity feed items
const recentActivity = [
  { name: "Emma", action: "booked", type: "iPhone Session", time: "2 min ago" },
  { name: "James", action: "completed", type: "RAW DSLR", time: "15 min ago" },
  { name: "Sofia", action: "booked", type: "Edited Session", time: "23 min ago" },
]

export default function HomePage() {
  const { user } = useAuth()
  const [recentBooking, setRecentBooking] = useState<Booking | null>(null)
  const [loadingBooking, setLoadingBooking] = useState(true)
  const [activityIndex, setActivityIndex] = useState(0)
  const [weather, setWeather] = useState<{ condition: string; temp: number; isGood: boolean } | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showLoading, setShowLoading] = useState(false)
  const [loadingComplete, setLoadingComplete] = useState(false)
  const [contextHint, setContextHint] = useState<{ icon: string; text: string } | null>(null)
  
  const greeting = getGreeting()
  const displayName = user?.user_metadata?.full_name?.split(" ")[0] || 
                      user?.email?.split("@")[0] || 
                      null

  // show loading screen once per session after login
  useEffect(() => {
    if (typeof window === "undefined") return
    
    const hasSeenLoading = sessionStorage.getItem("photka_loading_shown")
    
    if (user && !hasSeenLoading) {
      setShowLoading(true)
      sessionStorage.setItem("photka_loading_shown", "true")
    } else if (hasSeenLoading) {
      setLoadingComplete(true)
    }
  }, [user])

  const handleLoadingComplete = () => {
    setShowLoading(false)
    setLoadingComplete(true)
  }

  // calculate context hint on client side only to avoid hydration mismatch
  useEffect(() => {
    setContextHint(getContextualHint(weather || undefined))
  }, [weather, currentTime])

  // update time every minute to refresh contextual hints
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // update every minute
    return () => clearInterval(interval)
  }, [])

  // rotate activity feed
  useEffect(() => {
    const interval = setInterval(() => {
      setActivityIndex((prev) => (prev + 1) % recentActivity.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // fetch weather data from national weather service (default to nashville)
  useEffect(() => {
    async function fetchWeather() {
      try {
        // step 1: get grid point from lat/lon
        const pointsResponse = await fetch(
          `https://api.weather.gov/points/${THE_GULCH.lat},${THE_GULCH.lng}`,
          {
            headers: {
              'User-Agent': 'Photka App (contact@photka.com)'
            }
          }
        )
        
        if (!pointsResponse.ok) {
          throw new Error("Failed to get grid point")
        }

        const pointsData = await pointsResponse.json()
        const forecastUrl = pointsData.properties?.forecast
        
        if (!forecastUrl) {
          throw new Error("No forecast URL found")
        }

        // step 2: get current forecast
        const forecastResponse = await fetch(forecastUrl, {
          headers: {
            'User-Agent': 'Photka App (contact@photka.com)'
          }
        })
        
        if (!forecastResponse.ok) {
          throw new Error("Failed to get forecast")
        }

        const forecastData = await forecastResponse.json()
        const currentPeriod = forecastData.properties?.periods?.[0]
        
        if (currentPeriod) {
          const condition = currentPeriod.shortForecast?.toLowerCase() || ""
          const temp = currentPeriod.temperature || 70
          const isDaytime = currentPeriod.isDaytime
          
          // determine if weather is good for photos
          const isGood = condition.includes("sunny") || 
                        condition.includes("clear") ||
                        (condition.includes("partly") && condition.includes("cloudy")) ||
                        (condition.includes("mostly") && condition.includes("sunny"))
          
          setWeather({ condition, temp, isGood })
        }
      } catch {
        // fail silently, weather is optional
      }
    }

    fetchWeather()
  }, [])

  // fetch most recent booking
  useEffect(() => {
    async function fetchRecentBooking() {
      if (!user?.email) {
        setLoadingBooking(false)
        return
      }

      const { data } = await supabase
        .from("bookings")
        .select("*")
        .eq("email", user.email)
        .not("id", "like", "00000000-0000-0000-0000-%")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      setRecentBooking(data as Booking | null)
      setLoadingBooking(false)
    }

    fetchRecentBooking()
  }, [user])

  const popularSession: SessionType = "raw_dslr"

  if (showLoading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />
  }

  return (
    <div className="min-h-screen bg-black text-white pb-28 relative overflow-hidden">
      
      {/* noise texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.012] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ambient gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-48 -right-48 w-[500px] h-[500px] rounded-full bg-blue-500/15 blur-[120px]"
          animate={{
            x: [0, 40, 0],
            y: [0, -30, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 -left-48 w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[100px]"
          animate={{
            x: [0, -30, 0],
            y: [0, 40, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="max-w-lg mx-auto px-6 relative z-10">
        
        {/* hero header */}
        <motion.header 
          className="pt-20 pb-10 flex items-start justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="flex-1">
            <p className="text-blue-300/50 text-lg tracking-wide mb-2">
              {greeting},
            </p>
          <h1 className="text-[3.25rem] leading-[1.1] font-bold tracking-tight">
            <span className="bg-gradient-to-br from-white via-white to-blue-200/80 bg-clip-text text-transparent">
              {displayName ? displayName : "Ready to shoot?"}
            </span>
          </h1>
          
          {/* contextual hint */}
          {contextHint && (
            <motion.div 
              className="mt-6 inline-flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <span className="text-base">{contextHint.icon}</span>
              <span className="text-sm text-white/60 font-light tracking-wide">{contextHint.text}</span>
            </motion.div>
          )}
          </div>
          {loadingComplete && (
            <div className="ml-6 mt-2 flex-shrink-0">
              <StaticLogo />
            </div>
          )}
        </motion.header>

        {/* live activity ticker */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <motion.div
            key={activityIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-sm text-white/40 tracking-wide">
              <span className="text-white/70 font-medium">{recentActivity[activityIndex].name}</span>
              {" "}{recentActivity[activityIndex].action}{" "}
              <span className="text-blue-400/70">{recentActivity[activityIndex].type}</span>
              <span className="text-white/20"> · </span>{recentActivity[activityIndex].time}
            </span>
          </motion.div>
        </motion.div>

        {/* active booking banner */}
        {!loadingBooking && recentBooking && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mb-12"
          >
            <Link href="/activity" className="block group">
              <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.06] rounded-3xl p-5 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/15 to-cyan-500/15 border border-white/[0.06] flex items-center justify-center text-xl">
                      {SESSIONS[recentBooking.session_type as SessionType]?.icon || "📸"}
                    </div>
                    <div>
                      <p className="text-[15px] font-medium tracking-tight">
                        {recentBooking.status === "requested" ? "Pending booking" : "Recent shoot"}
                      </p>
                      <p className="text-sm text-white/40 mt-0.5">
                        {SESSIONS[recentBooking.session_type as SessionType]?.title || recentBooking.session_type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      recentBooking.status === "requested" 
                        ? "bg-amber-500/15 text-amber-300/90" 
                        : "bg-blue-500/15 text-blue-300/90"
                    }`}>
                      {recentBooking.status}
                    </span>
                    <svg className="w-4 h-4 text-white/20 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* shoot now section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mb-14"
        >
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Shoot Now</h2>
              <p className="text-[15px] text-neutral-400 mt-1">On-demand photographer, ASAP.</p>
            </div>
            <span className="text-xs text-blue-400 tracking-wide pb-1">Swipe →</span>
          </div>
          
          {/* session cards */}
          <div className="flex gap-5 overflow-x-auto pt-4 pb-4 -mx-6 px-6 scrollbar-hide">
            {SESSION_KEYS.map((key, index) => {
              const session = SESSIONS[key]
              const isPopular = key === popularSession
              return (
                <Link
                  key={session.id}
                  href={`/session/${session.slug}`}
                  className="flex-shrink-0 w-[280px] group pt-3"
                >
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                    whileHover={{ y: -4, transition: { duration: 0.25 } }}
                    className="relative h-full"
                  >
                    {/* popular badge, positioned outside card */}
                    {isPopular && (
                      <div className="absolute -top-3 left-5 z-10">
                        <span className="bg-gradient-to-r from-amber-400 to-yellow-300 text-black text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-full shadow-lg shadow-amber-500/20">
                          POPULAR
                        </span>
                      </div>
                    )}
                    
                    {/* card */}
                    <div className="relative bg-white/[0.025] backdrop-blur-2xl border border-white/[0.06] rounded-3xl p-6 h-full group-hover:border-blue-500/20 group-hover:bg-white/[0.04] transition-all duration-300 overflow-hidden">
                      {/* hover glow, inside card */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="relative">
                        <h3 className="text-lg font-semibold tracking-tight mb-3">{session.title}</h3>
                        <p className="text-sm text-neutral-400 leading-relaxed mb-6 line-clamp-2">{session.blurb}</p>
                        
                        <div className="flex items-baseline justify-between pt-5 border-t border-white/[0.06]">
                          <span className="text-xl font-semibold tracking-tight">{session.price}</span>
                          <span className="text-xs text-neutral-500">{session.delivery}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </motion.section>

        {/* shoot later section */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-16"
        >
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">Shoot Later</h2>
            <p className="text-[15px] text-neutral-400 mt-1">Choose a date + lock your slot.</p>
          </div>
          
          <Link href="/schedule" className="block group">
            <div className="relative overflow-hidden bg-white/[0.025] backdrop-blur-2xl border border-white/[0.06] rounded-3xl p-6 hover:border-white/[0.1] hover:bg-white/[0.04] transition-all duration-300">
              {/* subtle gradient accent */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-500/8 to-transparent rounded-full blur-2xl" />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-white/[0.04] border border-white/[0.06] rounded-2xl flex items-center justify-center group-hover:border-blue-500/20 transition-colors">
                    <svg className="w-6 h-6 text-blue-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[17px] font-medium tracking-tight group-hover:text-blue-100 transition-colors">Schedule a future session</p>
                    <p className="text-sm text-neutral-400 mt-0.5">Pick your date, time & session type</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-white/20 group-hover:text-white/40 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </motion.section>

        {/* photka shots today gallery, above featured photographers */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              Photka Shots Today: {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </h2>
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">LIVE</span>
            </div>
          </div>
          <div className="overflow-hidden -mx-6 px-6">
            <div className="flex gap-4 animate-scroll scrollbar-hide pointer-events-none">
              {galleryImages.map((img, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-48 h-48 rounded-2xl overflow-hidden ring-1 ring-white/[0.06]"
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {/* duplicate for seamless loop */}
              {galleryImages.map((img, index) => (
                <div
                  key={`duplicate-${index}`}
                  className="flex-shrink-0 w-48 h-48 rounded-2xl overflow-hidden ring-1 ring-white/[0.06]"
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* divider */}
        <div className="flex items-center gap-6 mb-12">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          <span className="text-[11px] text-neutral-500 uppercase tracking-[0.2em]">Featured Photographers</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        </div>

        {/* featured photographers */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="mb-16"
        >
          <div className="space-y-4">
            {PHOTOGRAPHERS.slice(0, 2).map((photographer, index) => (
              <motion.div
                key={photographer.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.01 }}
                className="bg-white/[0.025] backdrop-blur-2xl border border-white/[0.06] rounded-3xl p-5 hover:border-white/[0.1] hover:bg-white/[0.04] transition-all duration-300 cursor-pointer group"
              >
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <img
                      src={photographer.photo}
                      alt={photographer.name}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-white/[0.06] group-hover:ring-white/[0.12] transition-all"
                    />
                    {/* online indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-[2.5px] border-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-[17px] font-semibold tracking-tight truncate">{photographer.name}</p>
                      <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-md">
                        <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-xs font-medium text-amber-400">{photographer.rating}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {photographer.specialties.map((specialty) => (
                        <span key={specialty} className="text-[11px] text-neutral-400 bg-white/[0.06] px-2.5 py-1 rounded-full">
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right pl-4">
                    <p className="text-lg font-semibold tracking-tight">{photographer.totalShoots}</p>
                    <p className="text-[11px] text-neutral-400">shoots</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent mb-12" />

        {/* referral card */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-14"
        >
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-cyan-500/10 border border-white/[0.06] rounded-3xl p-6">
            {/* decorative orb */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl" />
            
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-500/20">
                  🎁
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-tight">Give $10, Get $10</p>
                  <p className="text-sm text-white/40 mt-0.5 font-light">Share Photka with friends</p>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="bg-white text-black text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-white/90 transition shadow-lg shadow-black/10"
              >
                Invite
              </motion.button>
            </div>
          </div>
        </motion.section>

        {/* stats footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
        >
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-3xl p-6">
            <div className="grid grid-cols-3 divide-x divide-white/[0.04]">
              <div className="text-center px-2">
                <div className="w-11 h-11 mx-auto mb-3 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                </div>
                <p className="text-xl font-semibold tracking-tight">2,400+</p>
                <p className="text-[11px] text-neutral-400 mt-1">Shoots</p>
              </div>
              <div className="text-center px-2">
                <div className="w-11 h-11 mx-auto mb-3 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <p className="text-xl font-semibold tracking-tight">4.9</p>
                <p className="text-[11px] text-neutral-400 mt-1">Rating</p>
              </div>
              <div className="text-center px-2">
                <div className="w-11 h-11 mx-auto mb-3 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xl font-semibold tracking-tight">12m</p>
                <p className="text-[11px] text-neutral-400 mt-1">Avg wait</p>
              </div>
            </div>
          </div>
        </motion.footer>

      </div>
    </div>
  )
}
