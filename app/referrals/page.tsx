"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"

const howItWorks = [
  {
    step: "1",
    title: "Share your code",
    description: "Send your unique referral code to friends via text, email, or social media.",
  },
  {
    step: "2",
    title: "Friend signs up",
    description: "They create an account and enter your code, or use your referral link directly.",
  },
  {
    step: "3",
    title: "They book a session",
    description: "Once they complete their first paid session, you both get rewarded.",
  },
  {
    step: "4",
    title: "You both earn $10",
    description: "Credits are added instantly. Use them on your next session.",
  },
]

const milestones = [
  { count: 3, reward: "Bonus $15 credit", icon: "🎯" },
  { count: 5, reward: "Free iPhone session", icon: "📱" },
  { count: 10, reward: "1 month Pro free", icon: "⚡" },
  { count: 25, reward: "Free Edited DSLR session", icon: "✨" },
]

export default function ReferralsPage() {
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)
  
  const referralCode = user?.id?.slice(0, 8).toUpperCase() || "PHOTKA10"
  const referralLink = `https://photka.app/r/${referralCode}`

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute bottom-0 -left-40 w-[300px] h-[300px] rounded-full bg-orange-500/10 blur-[100px]" />
      </div>

      <div className="max-w-lg mx-auto px-5 relative z-10">
        {/* Header */}
        <div className="pt-6 pb-8">
          <Link
            href="/account"
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition mb-8"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Back</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Give $10, Get $10</h1>
            <p className="text-neutral-400">Share Photka, earn credits together</p>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
            <p className="text-2xl font-bold">0</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Invited</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
            <p className="text-2xl font-bold text-amber-400">0</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Signed up</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
            <p className="text-2xl font-bold text-emerald-400">$0</p>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Earned</p>
          </div>
        </motion.div>

        {/* Referral Code & Link */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-5 mb-6"
        >
          <p className="text-xs text-neutral-400 uppercase tracking-wider mb-3">Your referral code</p>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 p-3 bg-black/30 rounded-xl border border-white/10">
              <p className="text-2xl font-mono font-bold text-amber-400 text-center">{referralCode}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => copyToClipboard(referralCode)}
              className="p-3 bg-amber-500/20 rounded-xl hover:bg-amber-500/30 transition"
            >
              {copied ? (
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </motion.button>
          </div>
          
          <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">Or share your link</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-2.5 bg-black/30 rounded-xl border border-white/10 overflow-hidden">
              <p className="text-sm text-neutral-400 truncate">{referralLink}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => copyToClipboard(referralLink)}
              className="px-4 py-2.5 bg-amber-500 text-black text-sm font-medium rounded-xl hover:bg-amber-400 transition"
            >
              Copy
            </motion.button>
          </div>
        </motion.div>

        {/* Share Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3 mb-8"
        >
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-sm">WhatsApp</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
            <span className="text-sm">Email</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span className="text-sm">X</span>
          </button>
        </motion.div>

        {/* How it Works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mb-10"
        >
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">How it works</h2>
          <div className="space-y-3">
            {howItWorks.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="flex items-start gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]"
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-sm font-bold text-amber-400">
                  {step.step}
                </div>
                <div>
                  <p className="font-medium mb-0.5">{step.title}</p>
                  <p className="text-sm text-neutral-400">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Milestones */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-10"
        >
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">Unlock milestones</h2>
          <div className="grid grid-cols-2 gap-3">
            {milestones.map((m) => (
              <div
                key={m.count}
                className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-center"
              >
                <span className="text-2xl block mb-2">{m.icon}</span>
                <p className="text-lg font-bold mb-0.5">{m.count} referrals</p>
                <p className="text-xs text-neutral-500">{m.reward}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Terms */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 mb-6"
        >
          <h3 className="text-sm font-medium mb-2">Terms</h3>
          <ul className="text-xs text-neutral-500 space-y-1">
            <li>• Credits applied after referee completes first paid session</li>
            <li>• Credits expire after 12 months</li>
            <li>• Cannot be combined with other promotions</li>
            <li>• Photka reserves the right to modify or end this program</li>
          </ul>
        </motion.div>

        {/* Invite History (empty state) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
        >
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">Your referrals</h2>
          <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center">
            <svg className="w-12 h-12 mx-auto text-neutral-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-neutral-500 mb-1">No referrals yet</p>
            <p className="text-xs text-neutral-600">Share your code to start earning</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

