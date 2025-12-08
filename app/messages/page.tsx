"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/hooks/useAuth"
import { Conversation, Message } from "@/types/message"
import { SESSION_TYPE_LABELS } from "@/types/booking"
import { formatDate } from "@/utils/bookings"
import { ChatView } from "@/components/ChatView"
import { SupportChatView } from "@/components/SupportChatView"

function MessagesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    searchParams.get("booking") || null
  )
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [showSupportChat, setShowSupportChat] = useState(false)
  const [showNewChatMenu, setShowNewChatMenu] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return

    try {
      // get all bookings where user is involved (as client)
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, session_type, location_text, when_time, status, email, full_name")
        .eq("email", user.email)
        .order("created_at", { ascending: false })

      if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError)
        return
      }

      if (!bookings || bookings.length === 0) {
        setConversations([])
        setLoadingConversations(false)
        return
      }

      // get all messages for all bookings in one query
      const bookingIds = bookings.map(b => b.id)
      
      if (bookingIds.length === 0) {
        setConversations([])
        setLoadingConversations(false)
        return
      }

      // fetch all messages for all bookings at once
      const { data: allMessages } = await supabase
        .from("messages")
        .select("*")
        .in("booking_id", bookingIds)
        .order("created_at", { ascending: false })

      // group messages by booking_id and calculate stats
      const messagesByBooking = new Map<string, Message[]>()
      const unreadByBooking = new Map<string, number>()
      
      allMessages?.forEach((msg: Message) => {
        const bookingId = msg.booking_id
        if (!messagesByBooking.has(bookingId)) {
          messagesByBooking.set(bookingId, [])
        }
        messagesByBooking.get(bookingId)!.push(msg)
        
        // count unread
        if (msg.receiver_id === user.id && !msg.read_at) {
          unreadByBooking.set(bookingId, (unreadByBooking.get(bookingId) || 0) + 1)
        }
      })

      // filter out support chat bookings (they use special UUID pattern)
      const filteredBookings = bookings.filter((booking) => {
        return !booking.id.startsWith("00000000-0000-0000-0000-")
      })

      // build conversations
      const fetchedConversations = filteredBookings.map((booking) => {
        const bookingMessages = messagesByBooking.get(booking.id) || []
        const lastMessage = bookingMessages[0] || null
        const unreadCount = unreadByBooking.get(booking.id) || 0
        
        // include conversations that have messages, unread count, OR are confirmed (chat is available)
        if (!lastMessage && unreadCount === 0 && booking.status !== "confirmed") {
          return null
        }

        const otherUserId = booking.email === user.email 
          ? "photographer-id"
          : booking.email

        return {
          booking_id: booking.id,
          booking: {
            id: booking.id,
            session_type: booking.session_type,
            location_text: booking.location_text,
            when_time: booking.when_time,
            status: booking.status,
          },
          other_user: {
            id: otherUserId,
            email: booking.email === user.email ? "photographer@photka.com" : booking.email,
            full_name: booking.full_name || booking.email?.split("@")[0] || "User",
            avatar_url: undefined,
          },
          last_message: lastMessage,
          unread_count: unreadCount,
        } as Conversation
      }).filter((c): c is Conversation => c !== null)
      // show conversations with messages, unread count, or confirmed status
      setConversations(fetchedConversations.filter(c => 
        c.last_message || c.unread_count > 0 || c.booking.status === "confirmed"
      ))
      setLoadingConversations(false)

      // update unread count for bottom nav
      const totalUnread = fetchedConversations.reduce((sum, c) => sum + c.unread_count, 0)
      if (typeof window !== 'undefined') {
        localStorage.setItem('photka_messages_unread_count', totalUnread.toString())
        window.dispatchEvent(new CustomEvent('photka_messages_unread_update', { detail: totalUnread }))
      }
    } catch (error) {
      console.error("Error fetching conversations:", error)
      setLoadingConversations(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchConversations()
    }
  }, [user, fetchConversations])

  // subscribe to real-time message updates
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchConversations])

  if (loading || loadingConversations) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading messages...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (showSupportChat) {
    return (
      <div className="min-h-screen bg-black">
        <SupportChatView
          onBack={() => setShowSupportChat(false)}
          onMessageSent={fetchConversations}
        />
      </div>
    )
  }

  if (selectedConversation) {
    return (
      <ChatView
        bookingId={selectedConversation}
        onBack={() => setSelectedConversation(null)}
        onMessageSent={fetchConversations}
      />
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Messages</h1>
            <p className="text-sm text-neutral-400 mt-1">
              {conversations.length} {conversations.length === 1 ? "conversation" : "conversations"}
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowNewChatMenu(!showNewChatMenu)}
              className="w-10 h-10 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] flex items-center justify-center transition flex-shrink-0"
            >
              <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>

            {/* New Chat Menu */}
            <AnimatePresence>
              {showNewChatMenu && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowNewChatMenu(false)}
                    className="fixed inset-0 z-40"
                  />
                  
                  {/* Menu */}
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 z-50 w-64 rounded-2xl bg-neutral-900 border border-white/[0.08] shadow-2xl overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        setShowNewChatMenu(false)
                        setShowSupportChat(true)
                      }}
                      className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.05] transition text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-lg">p</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">photka</p>
                        <p className="text-xs text-neutral-400 truncate">Support Team</p>
                      </div>
                      <svg className="w-4 h-4 text-neutral-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[60vh] px-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-6">
            <span className="text-blue-400 font-bold text-3xl">p</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
          <p className="text-sm text-neutral-400 text-center mb-8 max-w-sm">
            Start a conversation with our support team or wait for messages from your photographers.
          </p>
          <button
            onClick={(e) => {
              e.preventDefault()
              setShowSupportChat(true)
            }}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            Chat with Support
          </button>
        </div>
      ) : (
        <div className="px-6 py-4 space-y-2">
          {/* Support Chat Card - Always visible at top */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={(e) => {
              e.preventDefault()
              setShowSupportChat(true)
            }}
            className="rounded-2xl bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20 p-4 cursor-pointer hover:from-blue-500/15 hover:to-blue-600/15 transition mb-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-lg">p</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-white">photka</p>
                  <span className="text-xs text-blue-400 font-medium">Support</span>
                </div>
                <p className="text-xs text-neutral-400">Get help with bookings, sessions, and more</p>
              </div>
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </motion.div>

          {/* Divider */}
          {conversations.length > 0 && (
            <div className="h-px bg-white/[0.06] my-3" />
          )}

          <AnimatePresence>
            {conversations.map((conversation, index) => (
              <motion.div
                key={conversation.booking_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedConversation(conversation.booking_id)}
                className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 cursor-pointer hover:bg-white/[0.04] transition"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-lg">
                      {conversation.other_user.full_name?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-white truncate">
                        {conversation.other_user.full_name}
                      </p>
                      {conversation.unread_count > 0 && (
                        <span className="w-5 h-5 rounded-full bg-blue-400 text-black text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-neutral-500 mb-1">
                      {SESSION_TYPE_LABELS[conversation.booking.session_type] || conversation.booking.session_type}
                    </p>
                    
                    {conversation.last_message && (
                      <p className="text-sm text-neutral-400 truncate">
                        {conversation.last_message.message_text}
                      </p>
                    )}
                    
                    {conversation.last_message && (
                      <p className="text-[10px] text-neutral-600 mt-1">
                        {formatDate(conversation.last_message.created_at)}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="animate-pulse text-neutral-400">Loading...</div>
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  )
}

