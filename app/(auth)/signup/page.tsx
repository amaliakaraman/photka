"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"

type UserRole = "client" | "photographer"

export default function SignupPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<UserRole>("client")

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const fullName = formData.get("fullName") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
          role: role,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Redirect based on role
      if (role === "photographer") {
        router.push("/photographer")
      } else {
        router.push("/")
      }
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Photka</h1>
          <p className="text-neutral-400 mt-2">Create your account</p>
        </div>

        {/* Role Selection */}
        <div className="flex bg-neutral-900 rounded-xl p-1 mb-6 border border-neutral-800">
          <button
            type="button"
            onClick={() => setRole("client")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              role === "client"
                ? "bg-white text-black"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            I need photos
          </button>
          <button
            type="button"
            onClick={() => setRole("photographer")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              role === "photographer"
                ? "bg-white text-black"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            I'm a photographer
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="fullName"
            type="text"
            placeholder="Full name"
            required
            className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-neutral-500"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-neutral-500"
          />
          <input
            name="phone"
            type="tel"
            placeholder="Phone number"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-neutral-500"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-neutral-500"
          />
          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm password"
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
            {loading ? "Creating account..." : role === "photographer" ? "Join as photographer" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-400 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-white hover:underline font-medium">
            Sign in
          </Link>
        </p>

        {role === "photographer" && (
          <p className="text-center text-xs text-neutral-500 mt-4">
            Photographer accounts require approval before going live.
          </p>
        )}
      </div>
    </div>
  )
}
