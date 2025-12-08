"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabaseClient"

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push("/")
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 relative overflow-hidden">
      {/* animated blue/purple background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-blue-500/20 blur-[120px]"
          animate={{
            x: [0, 100, 0],
            y: [0, -80, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 -left-48 w-[500px] h-[500px] rounded-full bg-purple-500/20 blur-[120px]"
          animate={{
            x: [0, -80, 0],
            y: [0, 100, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/15 blur-[100px]"
          animate={{
            x: [0, 60, 0],
            y: [0, -60, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/4 left-1/3 w-[450px] h-[450px] rounded-full bg-violet-500/15 blur-[110px]"
          animate={{
            x: [0, -50, 0],
            y: [0, 70, 0],
            scale: [1, 1.25, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">photka</h1>
          <p className="text-neutral-400 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-neutral-500"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-neutral-500"
          />

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white text-black py-3 text-sm font-semibold hover:bg-neutral-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-400 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-white hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

