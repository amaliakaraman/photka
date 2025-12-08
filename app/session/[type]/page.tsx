"use client"

import { useRouter } from "next/navigation"
import { use } from "react"
import { motion } from "framer-motion"
import { SESSIONS, isValidSessionType, SessionType } from "@/data/sessions"
import Link from "next/link"

interface PageProps {
  params: Promise<{ type: string }>
}

export default function SessionPage({ params }: PageProps) {
  const router = useRouter()
  const { type } = use(params)

  // validate session type
  if (!isValidSessionType(type)) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold mb-2">Session not found</h1>
          <p className="text-neutral-400 mb-6">
            The session type &quot;{type}&quot; doesn&apos;t exist.
          </p>
          <Link
            href="/"
            className="inline-block bg-white text-black px-6 py-3 rounded-xl font-medium hover:bg-neutral-200 transition"
          >
            Back to Home
          </Link>
        </motion.div>
      </div>
    )
  }

  const session = SESSIONS[type as SessionType]

  function handleContinue() {
    router.push(`/book?session_type=${session.id}`)
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      
      {/* noise texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.015] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* animated gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-blue-500/30 blur-[120px]"
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 -left-40 w-96 h-96 rounded-full bg-cyan-500/20 blur-[100px]"
          animate={{
            x: [0, -20, 0],
            y: [0, 30, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-blue-600/15 blur-[80px]"
          animate={{
            x: [0, 20, 0],
            y: [0, -15, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* content */}
      <div className="relative z-10 min-h-screen flex flex-col px-4 pt-6 pb-8">
        {/* back button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-200/60 hover:text-white transition mb-8"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-sm">Back</span>
          </Link>
        </motion.div>

        {/* hero card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex-1 flex flex-col"
        >
          {/* glassmorphism card */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
            {/* title */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold tracking-tight mb-2 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                {session.title}
              </h1>
              <p className="text-sm font-medium text-blue-300/80">
                {session.tagline}
              </p>
            </div>

            {/* blurb */}
            <p className="text-neutral-300 text-center mb-8 leading-relaxed">
              {session.blurb}
            </p>

            {/* stats grid */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-center">
                <p className="text-[10px] text-blue-300/50 uppercase tracking-wider mb-1">
                  Price
                </p>
                <p className="text-lg font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">{session.price}</p>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-center">
                <p className="text-[10px] text-blue-300/50 uppercase tracking-wider mb-1">
                  Delivery
                </p>
                <p className="text-sm font-medium leading-tight text-neutral-200">
                  {session.delivery}
                </p>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-center">
                <p className="text-[10px] text-blue-300/50 uppercase tracking-wider mb-1">
                  Output
                </p>
                <p className="text-sm font-medium leading-tight text-neutral-200">
                  {session.output}
                </p>
              </div>
            </div>

            {/* best for section */}
            <div className="mb-6">
              <h3 className="text-[10px] text-blue-300/50 uppercase tracking-wider mb-3">
                Best for
              </h3>
              <ul className="space-y-2.5">
                {session.bestFor.map((item, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                      <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-sm text-neutral-300">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* cta button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 pb-20"
        >
          <motion.button
            onClick={handleContinue}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-2xl font-semibold text-black bg-gradient-to-r from-blue-400 to-cyan-400 shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30"
          >
            Continue to booking
          </motion.button>
          <p className="text-center text-xs text-blue-200/40 mt-3">
            No payment required until session is confirmed
          </p>
        </motion.div>
      </div>
    </div>
  )
}
