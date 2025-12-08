"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"

const perks = [
  {
    icon: "⚡",
    title: "Priority Matching",
    description: "Skip the queue. Get matched with available photographers 2x faster than standard members.",
  },
  {
    icon: "💰",
    title: "Discounted Rates",
    description: "Save 15% on every session. The more you shoot, the more you save.",
  },
  {
    icon: "🖼️",
    title: "10 Free Edited Images",
    description: "Every RAW DSLR session includes 10 professionally edited selects at no extra cost.",
  },
  {
    icon: "🎯",
    title: "Priority Support",
    description: "Direct access to our support team. Get help within minutes, not hours.",
  },
  {
    icon: "📅",
    title: "Advance Booking",
    description: "Book sessions up to 30 days in advance. Lock in your preferred photographers early.",
  },
  {
    icon: "⭐",
    title: "Exclusive Photographers",
    description: "Access to our top-rated photographers with 4.9+ ratings, reserved for Pro members.",
  },
  {
    icon: "🔄",
    title: "Unlimited Rebooking",
    description: "Reschedule sessions anytime without fees. Life happens, we get it.",
  },
  {
    icon: "📊",
    title: "Analytics Dashboard",
    description: "Track your content performance, session history, and spending insights.",
  },
]

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Content Creator",
    text: "Pro paid for itself in the first month. The priority matching alone saves me hours.",
    avatar: "S",
  },
  {
    name: "Marcus Johnson",
    role: "Brand Manager",
    text: "We book 4-5 sessions weekly. The 15% discount adds up to serious savings.",
    avatar: "M",
  },
]

export default function ProPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[150px]" />
        <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[120px]" />
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
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Photka Pro</h1>
            <p className="text-neutral-400">For creators & businesses who need more</p>
          </motion.div>
        </div>

        {/* Pricing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 p-6 mb-8"
        >
          <div className="text-center mb-4">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold">$19</span>
              <span className="text-neutral-400">/month</span>
            </div>
            <p className="text-sm text-neutral-500 mt-1">or $190/year (save 2 months)</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-2xl font-semibold text-black bg-gradient-to-r from-blue-400 to-cyan-400 shadow-lg shadow-blue-500/25"
          >
            Start 7-day free trial
          </motion.button>
          <p className="text-center text-xs text-neutral-500 mt-3">Cancel anytime. No commitment.</p>
        </motion.div>

        {/* Perks */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">Everything you get</h2>
          <div className="space-y-3">
            {perks.map((perk, index) => (
              <motion.div
                key={perk.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + index * 0.05 }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{perk.icon}</span>
                  <div>
                    <p className="font-medium mb-1">{perk.title}</p>
                    <p className="text-sm text-neutral-400">{perk.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-10"
        >
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">What Pro members say</h2>
          <div className="space-y-3">
            {testimonials.map((t, index) => (
              <div
                key={t.name}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <p className="text-sm text-neutral-300 mb-3">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-sm font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-neutral-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mb-10"
        >
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">Questions</h2>
          <div className="space-y-3">
            {[
              { q: "Can I cancel anytime?", a: "Yes! Cancel with one tap. No questions, no fees." },
              { q: "Does the discount stack with credits?", a: "Absolutely. Use credits + Pro discount together." },
              { q: "What if I don't like it?", a: "Full refund within 7 days, no questions asked." },
            ].map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="font-medium mb-1">{faq.q}</p>
                <p className="text-sm text-neutral-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="sticky bottom-24 bg-black/80 backdrop-blur-xl rounded-2xl p-4 border border-white/[0.06]"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-xl font-semibold text-black bg-gradient-to-r from-blue-400 to-cyan-400 shadow-lg shadow-blue-500/25"
          >
            Start free trial
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}

