"use client"

import { createContext, useEffect, useState, ReactNode, useCallback } from "react"
import { User, Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabaseClient"

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const updateAuth = useCallback((session: Session | null) => {
    setSession(session)
    setUser(session?.user ?? null)
    setLoading(false)
    setInitialized(true)
  }, [])

  useEffect(() => {
    // only run on client
    if (typeof window === 'undefined') return

    let mounted = true

    // get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        updateAuth(session)
      }
    })

    // listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        updateAuth(session)
        // clear loading screen flag on logout so it shows again next login
        if (event === "SIGNED_OUT") {
          sessionStorage.removeItem("photka_loading_shown")
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [updateAuth])

  // don't render children until we've checked auth on client
  if (typeof window !== "undefined" && !initialized) {
    return (
      <AuthContext.Provider value={{ user: null, session: null, loading: true }}>
        {children}
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
