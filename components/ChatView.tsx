"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/hooks/useAuth"
import { Message } from "@/types/message"
import { formatDate } from "@/utils/bookings"

interface ChatViewProps {
  bookingId: string
  onBack: () => void
  onMessageSent: () => void
}

export function ChatView({ bookingId, onBack, onMessageSent }: ChatViewProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [otherUserId, setOtherUserId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = useCallback(async () => {
    if (!user?.id || !bookingId) return

    try {
      // get booking to find other user
      const { data: booking } = await supabase
        .from("bookings")
        .select("email, status")
        .eq("id", bookingId)
        .single()

      if (booking) {
        // if booking is confirmed and this is the first time opening chat,
        // create a welcome message if it doesn't exist
        if (booking.status === 'confirmed' && booking.email !== user.email) {
          // client opening chat - check if welcome message exists
          const { data: existingMessages } = await supabase
            .from("messages")
            .select("id")
            .eq("booking_id", bookingId)
            .limit(1)
          
        }
        const otherId = booking.email === user.email 
          ? "photographer-id" 
          : booking.email
        setOtherUserId(otherId)
      }

      // fetch messages
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching messages:", error)
        return
      }

      setMessages(data || [])
      setLoading(false)

      // mark messages as read
      if (data && data.length > 0) {
        const unreadIds = data
          .filter(m => m.receiver_id === user.id && !m.read_at)
          .map(m => m.id)

        if (unreadIds.length > 0) {
          await supabase
            .from("messages")
            .update({ read_at: new Date().toISOString() })
            .in("id", unreadIds)
          
          // update unread count in localStorage
          if (typeof window !== 'undefined') {
            const currentCount = parseInt(localStorage.getItem('photka_messages_unread_count') || '0', 10)
            const newCount = Math.max(0, currentCount - unreadIds.length)
            localStorage.setItem('photka_messages_unread_count', newCount.toString())
            window.dispatchEvent(new CustomEvent('photka_messages_unread_update', { detail: newCount }))
          }
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
      setLoading(false)
    }
  }, [user, bookingId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // subscribe to real-time message updates
  useEffect(() => {
    if (!user?.id || !bookingId) return

    const channel = supabase
      .channel(`messages:${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
          scrollToBottom()
          
          // mark as read if it's for current user
          if (payload.new.receiver_id === user.id) {
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", payload.new.id)
            
            // update unread count
            if (typeof window !== 'undefined') {
              const currentCount = parseInt(localStorage.getItem('photka_messages_unread_count') || '0', 10)
              const newCount = Math.max(0, currentCount - 1)
              localStorage.setItem('photka_messages_unread_count', newCount.toString())
              window.dispatchEvent(new CustomEvent('photka_messages_unread_update', { detail: newCount }))
            }
          } else {
            // new message received - increment count
            if (typeof window !== 'undefined') {
              const currentCount = parseInt(localStorage.getItem('photka_messages_unread_count') || '0', 10)
              const newCount = currentCount + 1
              localStorage.setItem('photka_messages_unread_count', newCount.toString())
              window.dispatchEvent(new CustomEvent('photka_messages_unread_update', { detail: newCount }))
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, bookingId])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.id || !otherUserId || sending) return

    setSending(true)
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          booking_id: bookingId,
          sender_id: user.id,
          receiver_id: otherUserId,
          message_text: newMessage.trim(),
        })
        .select()
        .single()

      if (error) {
        console.error("Error sending message:", error)
        alert("Failed to send message. Please try again.")
      } else {
        setNewMessage("")
        setMessages(prev => [...prev, data])
        onMessageSent()
        scrollToBottom()
      }
    } catch (error) {
      console.error("Error sending message:", error)
      alert("Failed to send message. Please try again.")
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading chat...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Chat</h2>
            <p className="text-xs text-neutral-400">Booking conversation</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => {
            const isOwn = message.sender_id === user?.id
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isOwn
                      ? "bg-blue-500 text-white"
                      : "bg-white/[0.06] text-neutral-200 border border-white/[0.1]"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.message_text}
                  </p>
                  <p
                    className={`text-[10px] mt-1.5 ${
                      isOwn ? "text-blue-100" : "text-neutral-500"
                    }`}
                  >
                    {new Date(message.created_at).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-black/95 backdrop-blur-xl border-t border-white/10 p-4 pb-safe">
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-2xl px-4 py-3 text-sm text-white placeholder-neutral-500 resize-none focus:outline-none focus:border-blue-500/50 transition"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

