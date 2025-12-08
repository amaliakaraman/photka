"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { Message } from "@/types/message"
import { AI_SUPPORT_UUID, getWelcomeMessage, formatDateHeader, isDifferentDay } from "@/constants/chat"
import { getSupportBookingId, formatMessageTime, detectSessionRecommendation, isUserConfirmation, isTimingQuestion, getUserTimingPreference, detectUserSessionPreference } from "@/utils/chat"

interface SupportChatViewProps {
  onBack: () => void
  onMessageSent?: () => void // optional - support chat is client-side only
}

export function SupportChatView({ onBack }: SupportChatViewProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isAITyping, setIsAITyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isAITyping])

  useEffect(() => {
    if (!user?.id) return
    
    // no database - just show welcome message
    const userName = user.user_metadata?.full_name?.split(" ")[0] || "there"
    const welcomeMessage = getWelcomeMessage(userName)
    const supportBookingId = getSupportBookingId(user.id)
    
    const tempWelcome: Message = {
      id: `welcome-${Date.now()}`,
      booking_id: supportBookingId,
      sender_id: AI_SUPPORT_UUID,
      receiver_id: null,
      message_text: welcomeMessage,
      created_at: new Date().toISOString(),
      read_at: null,
      attachments: [],
    }
    
    setMessages([tempWelcome])
    setLoading(false)
  }, [user])

  // no database cleanup needed - messages are only in local state

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.id || sending) return

    setSending(true)
    try {
      // no database - just add message to local state
      const messageText = newMessage.trim()
      const supportBookingId = getSupportBookingId(user.id)
      
      // add user message to ui immediately (no database save)
      const tempUserMessage: Message = {
        id: `user-${Date.now()}`,
        booking_id: supportBookingId,
        sender_id: user.id,
        receiver_id: null,
        message_text: messageText,
        created_at: new Date().toISOString(),
        read_at: null,
        attachments: [],
      }
      
      setNewMessage("")
      setMessages(prev => [...prev, tempUserMessage])
      scrollToBottom()

      // get ai response
      setIsAITyping(true)
      try {
        // build conversation history from existing messages (excluding welcome message and errors)
        const conversationHistory = messages
          .filter(msg => !msg.id.startsWith("welcome-") && !msg.id.startsWith("error-"))
          .slice(0, 10) // limit to last 10 messages
          .map(msg => ({
            role: msg.sender_id === user.id ? "user" : "assistant",
            content: msg.message_text
          }))

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: messageText,
            userId: user.id,
            bookingId: supportBookingId,
            saveToDatabase: false, // don't save to database
            conversationHistory: conversationHistory, // send client-side history
          }),
        })

        if (response.ok) {
          const { message, messageId } = await response.json()
          
          // create ai message object
          const aiMessage: Message = {
            id: messageId || `ai-${Date.now()}`,
            booking_id: supportBookingId,
            sender_id: AI_SUPPORT_UUID,
            receiver_id: null,
            message_text: message,
            created_at: new Date().toISOString(),
            read_at: null,
            attachments: [],
          }

          setMessages(prev => [...prev, aiMessage])
          setIsAITyping(false)
          scrollToBottom()
          // don't call onMessageSent since we're not saving to database
        } else {
          // try to get error details from response
          let errorMessage = "I'm having trouble responding right now. Please try again in a moment."
          
          try {
            const errorData = await response.json()
            console.error("AI response error:", response.status, errorData)
            
            // show more helpful error messages based on the error
            if (errorData.error) {
              if (errorData.error.includes("not configured")) {
                errorMessage = "The support chat is currently being set up. Please contact support directly or try again later."
              } else if (errorData.error.includes("Failed to get AI response")) {
                errorMessage = "I'm having trouble connecting right now. Please try again in a moment."
              } else {
                errorMessage = errorData.error
              }
            }
          } catch (parseError) {
            // if we can't parse the error, use default message
            console.error("AI response error (could not parse):", response.status, parseError)
          }
          
          // show helpful error message to user
          const errorMsg: Message = {
            id: `error-${Date.now()}`,
            booking_id: supportBookingId,
            sender_id: AI_SUPPORT_UUID,
            receiver_id: null,
            message_text: errorMessage,
            created_at: new Date().toISOString(),
            read_at: null,
            attachments: [],
          }
          setMessages(prev => [...prev, errorMsg])
          setIsAITyping(false)
          scrollToBottom()
        }
      } catch (aiError) {
        console.error("AI chat error:", aiError)
        setIsAITyping(false)
        // show helpful error message to user
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          booking_id: supportBookingId,
          sender_id: AI_SUPPORT_UUID,
          receiver_id: null,
          message_text: "I'm having trouble responding right now. Please try again in a moment.",
          created_at: new Date().toISOString(),
          read_at: null,
          attachments: [],
        }
        setMessages(prev => [...prev, errorMessage])
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

  // don't block rendering on loading - show messages as they load
  // if (loading) {
  //   return (
  //     <div className="min-h-screen bg-black text-white flex items-center justify-center">
  //       <div className="animate-pulse text-neutral-400">Loading...</div>
  //     </div>
  //   )
  // }

  return (
    <div className="flex flex-col h-screen bg-black text-white pb-24">
      {/* header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-lg">p</span>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">photka</h2>
            <p className="text-xs text-neutral-400">Support Team</p>
          </div>
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-neutral-400">Loading chat...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-4">
              <span className="text-blue-400 font-bold text-2xl">p</span>
            </div>
            <p className="text-sm text-neutral-400">Starting conversation...</p>
          </div>
        ) : (
          <AnimatePresence>
            {messages.filter(m => m && m.sender_id).map((message, index) => {
              const isOwn = message.sender_id === user?.id
              const isAI = message.sender_id === AI_SUPPORT_UUID
              const timestamp = formatMessageTime(message.created_at)
              
              // check if we need to show a date header
              const previousMessage = index > 0 ? messages.filter(m => m && m.sender_id)[index - 1] : null
              const showDateHeader = !previousMessage || isDifferentDay(
                new Date(message.created_at),
                new Date(previousMessage.created_at)
              )
              
              return (
                <div key={message.id}>
                  {/* date separator */}
                  {showDateHeader && (
                    <div className="flex items-center justify-center my-6">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08]">
                        <span className="text-xs text-neutral-400 font-medium">
                          {formatDateHeader(new Date(message.created_at))}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        isOwn
                          ? "bg-blue-500 text-white"
                          : isAI
                          ? "bg-white/[0.08] text-neutral-200 border border-blue-500/20"
                          : "bg-white/[0.06] text-neutral-200 border border-white/[0.1]"
                      }`}
                    >
                      {isAI && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <span className="text-white text-[10px] font-semibold">p</span>
                          </div>
                          <span className="text-[10px] text-blue-400 font-medium">photka AI</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.message_text}
                      </p>
                    </div>
                    
                    {/* booking buttons - show after user states session + timing */}
                    {isAI && (() => {
                      const messageIndex = messages.findIndex(m => m.id === message.id)
                      const messagesBefore = messages.slice(0, messageIndex)
                      
                      // check all user messages before this ai message for session and timing preferences
                      const userMessagesBefore = messagesBefore.filter(msg => msg.sender_id === user?.id)
                      const userSessionPreference = userMessagesBefore
                        .map(msg => detectUserSessionPreference(msg.message_text))
                        .find(pref => pref !== null)
                      
                      const userTimingPreference = userMessagesBefore
                        .map(msg => getUserTimingPreference(msg.message_text))
                        .find(pref => pref !== null)
                      
                      // also check ai's recommendation/acknowledgment in this message
                      const aiRecommendedSession = detectSessionRecommendation(message.message_text)
                      
                      // final session: user preference takes priority, then ai recommendation
                      const finalSession = userSessionPreference || aiRecommendedSession
                      
                      // show button if: user has stated both session and timing preferences
                      // this ensures button appears even if ai doesn't explicitly mention the session in this message
                      if (userSessionPreference && userTimingPreference) {
                        const sessionLabels: Record<string, string> = {
                          iphone: "iPhone Session",
                          raw_dslr: "RAW DSLR Session",
                          edited_dslr: "Edited DSLR Session"
                        }
                        
                        // use user's explicit preference, not ai's recommendation
                        const sessionToBook = userSessionPreference
                        
                        return (
                          <div className="mt-3 space-y-2">
                            {userTimingPreference === "now" ? (
                              <button
                                onClick={() => router.push(`/book?session_type=${sessionToBook}`)}
                                className="w-full px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition"
                              >
                                Book {sessionLabels[sessionToBook]} Now
                              </button>
                            ) : userTimingPreference === "later" ? (
                              <button
                                onClick={() => router.push(`/schedule?session_type=${sessionToBook}`)}
                                className="w-full px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition"
                              >
                                Schedule {sessionLabels[sessionToBook]}
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => router.push(`/book?session_type=${sessionToBook}`)}
                                  className="w-full px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition"
                                >
                                  Book {sessionLabels[sessionToBook]} Now
                                </button>
                                <button
                                  onClick={() => router.push(`/schedule?session_type=${sessionToBook}`)}
                                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.1] text-white text-sm font-medium hover:bg-white/[0.12] transition"
                                >
                                  Schedule {sessionLabels[sessionToBook]}
                                </button>
                              </>
                            )}
                          </div>
                        )
                      }
                      return null
                    })()}
                    
                    {/* timestamp under message - left aligned for ai, right aligned for user */}
                    <span className={`text-[10px] text-neutral-500 mt-1 ${isOwn ? "text-right" : "text-left"}`}>
                      {timestamp}
                    </span>
                  </motion.div>
                </div>
              )
            })}
            
            {/* typing indicator - iMessage style */}
            {isAITyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-start"
              >
                <div className="max-w-[75%] rounded-2xl px-4 py-2.5 bg-white/[0.08] text-neutral-200 border border-blue-500/20">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <span className="text-white text-[10px] font-semibold">p</span>
                    </div>
                    <span className="text-[10px] text-blue-400 font-medium">photka AI</span>
                  </div>
                  <div className="flex items-center py-1.5">
                    <div className="flex items-center gap-1.5">
                      <motion.div
                        className="w-2 h-2 rounded-full bg-neutral-400"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 h-2 rounded-full bg-neutral-400"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-2 h-2 rounded-full bg-neutral-400"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* input */}
      <div className="sticky bottom-0 z-10 bg-black/95 backdrop-blur-xl border-t border-white/10 p-4 pb-24 flex-shrink-0">
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
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

