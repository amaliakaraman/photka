"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"

const tabs = [
  {
    name: "Home",
    href: "/",
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? "text-white" : "text-neutral-500"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 2.5 : 1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    name: "Book",
    href: "/book",
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? "text-white" : "text-neutral-500"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 2.5 : 1.5}
          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 2.5 : 1.5}
          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    name: "Activity",
    href: "/activity",
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? "text-white" : "text-neutral-500"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 2.5 : 1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    name: "Messages",
    href: "/messages",
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? "text-white" : "text-neutral-500"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 2.5 : 1.5}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    name: "Account",
    href: "/account",
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? "text-white" : "text-neutral-500"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 2.5 : 1.5}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const [activityUnreadCount, setActivityUnreadCount] = useState(0)
  const [messagesUnreadCount, setMessagesUnreadCount] = useState(0)

  // Listen for unread count updates from Activity page
  useEffect(() => {
    if (typeof window === 'undefined') return

    const getActivityCount = () => {
      const count = localStorage.getItem('photka_unread_count')
      if (count) {
        setActivityUnreadCount(parseInt(count, 10))
      }
    }

    const getMessagesCount = () => {
      const count = localStorage.getItem('photka_messages_unread_count')
      if (count) {
        setMessagesUnreadCount(parseInt(count, 10))
      }
    }

    getActivityCount()
    getMessagesCount()

    const handleActivityUpdate = (e: CustomEvent) => {
      setActivityUnreadCount(e.detail)
    }

    const handleMessagesUpdate = (e: CustomEvent) => {
      setMessagesUnreadCount(e.detail)
    }
    
    window.addEventListener('photka_unread_update', handleActivityUpdate as EventListener)
    window.addEventListener('photka_messages_unread_update', handleMessagesUpdate as EventListener)
    
    const interval = setInterval(() => {
      getActivityCount()
      getMessagesCount()
    }, 2000)

    return () => {
      window.removeEventListener('photka_unread_update', handleActivityUpdate as EventListener)
      window.removeEventListener('photka_messages_unread_update', handleMessagesUpdate as EventListener)
      clearInterval(interval)
    }
  }, [])

  // Hide on auth pages
  if (pathname === "/login" || pathname === "/signup") {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10 pb-safe">
      <div className="flex justify-center items-center h-16 gap-12 mx-auto">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          const showActivityBadge = tab.name === "Activity" && activityUnreadCount > 0
          const showMessagesBadge = tab.name === "Messages" && messagesUnreadCount > 0
          const showBadge = showActivityBadge || showMessagesBadge
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className="flex flex-col items-center justify-center py-2 px-4 transition-colors relative"
            >
              <div className="relative">
                {tab.icon(isActive)}
                {showBadge && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-400 rounded-full ring-2 ring-black" />
                )}
              </div>
              <span
                className={`text-xs mt-1 ${
                  isActive ? "text-white font-medium" : "text-neutral-500"
                }`}
              >
                {tab.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

