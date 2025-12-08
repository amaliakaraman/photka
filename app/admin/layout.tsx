"use client"

import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      const role = user?.user_metadata?.role
      if (!user) {
        router.push("/login")
      } else if (role !== "admin") {
        router.push("/")
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/[0.06] bg-neutral-900/50 p-4 hidden md:block">
        <div className="mb-8">
          <Link href="/admin" className="text-xl font-bold">
            Photka <span className="text-red-400">Admin</span>
          </Link>
        </div>

        <nav className="space-y-1">
          {[
            { label: "Dashboard", href: "/admin", icon: "📊" },
            { label: "Users", href: "/admin/users", icon: "👥" },
            { label: "Photographers", href: "/admin/photographers", icon: "📸" },
            { label: "Bookings", href: "/admin/bookings", icon: "📅" },
            { label: "Transactions", href: "/admin/transactions", icon: "💳" },
            { label: "Analytics", href: "/admin/analytics", icon: "📈" },
            { label: "Settings", href: "/admin/settings", icon: "⚙️" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.05] transition"
            >
              <span>{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-8">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-500 hover:text-white hover:bg-white/[0.05] transition"
          >
            <span>←</span>
            <span className="text-sm">Back to App</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <header className="border-b border-white/[0.06] bg-neutral-900/30 backdrop-blur-xl sticky top-0 z-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold md:hidden">Admin Panel</h1>
            <div className="flex items-center gap-4 ml-auto">
              <span className="text-sm text-neutral-400">{user?.email}</span>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-600" />
            </div>
          </div>
        </header>

        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}

