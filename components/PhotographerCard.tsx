"use client"

import { motion } from "framer-motion"
import type { Photographer } from "@/data/photographers"

interface PhotographerCardProps {
  photographer: Photographer
  sessionType: string
  onConfirm: () => void
  isLoading?: boolean
}

export function PhotographerCard({
  photographer,
  sessionType,
  onConfirm,
  isLoading,
}: PhotographerCardProps) {
  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-2xl p-4 shadow-2xl"
    >
      {/* Compact header with photo, info, and ETA */}
      <div className="flex items-center gap-3 mb-3">
        {/* Photographer photo */}
        <div className="relative flex-shrink-0">
          <img
            src={photographer.photo}
            alt={photographer.name}
            className="w-12 h-12 rounded-xl object-cover"
          />
          <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 rounded-full p-0.5">
            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Name, rating, gear inline */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white truncate">{photographer.name}</h3>
            <div className="flex items-center gap-0.5 text-amber-400">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs font-medium">{photographer.rating}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {photographer.cameraBodies.slice(0, 2).map((camera) => (
              <span key={camera} className="text-[10px] text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full">
                {camera}
              </span>
            ))}
          </div>
        </div>

        {/* ETA - compact */}
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-bold text-white">{photographer.eta}</p>
          <p className="text-[10px] text-neutral-500">min</p>
        </div>
      </div>

      {/* Confirm button - smaller */}
      <motion.button
        onClick={onConfirm}
        disabled={isLoading}
        whileTap={{ scale: 0.98 }}
        className="w-full py-3 bg-white text-black rounded-xl font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Requesting...
          </span>
        ) : (
          `Request ${sessionType}`
        )}
      </motion.button>
    </motion.div>
  )
}

