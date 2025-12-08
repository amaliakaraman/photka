// chat utility functions

import { formatDateHeader, isDifferentDay } from '@/constants/chat'

export { formatDateHeader, isDifferentDay }

// format timestamp for message display
export function formatMessageTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

// generate support booking id from user id
export function getSupportBookingId(userId: string): string {
  return `00000000-0000-0000-0000-${userId.slice(-12)}`
}

// detect if ai message recommends a specific session type
export function detectSessionRecommendation(messageText: string): string | null {
  const lower = messageText.toLowerCase()
  
  if (lower.includes("iphone session") || lower.includes("iphone")) {
    return "iphone"
  }
  if (lower.includes("raw dslr") || lower.includes("raw")) {
    return "raw_dslr"
  }
  if (lower.includes("edited dslr") || lower.includes("edited")) {
    return "edited_dslr"
  }
  
  return null
}

// detect if user message confirms they want to book
export function isUserConfirmation(messageText: string, recommendedSessionType: string | null): boolean {
  const lower = messageText.toLowerCase()
  
  // explicit confirmations
  if (lower.includes("yes") || lower.includes("yeah") || lower.includes("yep") || lower.includes("sure") || lower.includes("ok") || lower.includes("okay") || lower.includes("let's do it") || lower.includes("let's go")) {
    // if they mention a different session type, it's not a confirmation for the recommended one
    if (recommendedSessionType) {
      if (recommendedSessionType === "iphone" && (lower.includes("dslr") || lower.includes("edited") || lower.includes("raw"))) {
        return false
      }
      if (recommendedSessionType === "raw_dslr" && (lower.includes("iphone") || lower.includes("edited"))) {
        return false
      }
      if (recommendedSessionType === "edited_dslr" && (lower.includes("iphone") || lower.includes("raw"))) {
        return false
      }
    }
    return true
  }
  
  return false
}

// detect if ai message is asking about timing (now or later)
export function isTimingQuestion(messageText: string): boolean {
  const lower = messageText.toLowerCase()
  return lower.includes("when are you thinking") || lower.includes("now or later") || lower.includes("when do you want") || lower.includes("when would you like")
}

// extract timing preference from user message
export function getUserTimingPreference(messageText: string): "now" | "later" | null {
  const lower = messageText.toLowerCase()
  
  // handle typos like "late4", "latr", "lat", etc.
  if (lower.includes("now") || lower.includes("asap") || lower.includes("immediately") || lower.includes("right now") || lower.includes("today")) {
    return "now"
  }
  // match "lat" followed by any characters (handles "later", "late4", "latr", etc.)
  if (lower.match(/lat[er4]*/) || lower.includes("later") || lower.includes("schedule") || lower.includes("future") || lower.includes("tomorrow") || lower.includes("next week")) {
    return "later"
  }
  
  return null
}

// detect if user explicitly states a session type preference
export function detectUserSessionPreference(messageText: string): string | null {
  const lower = messageText.toLowerCase()
  
  // check for iphone (handle typos like "iphonw", "iphne", "iphon", etc.)
  // match "iph" followed by any characters that could be "one" or typos
  if (lower.match(/iph[o0nw]*/) || lower.includes("iphone") || lower.includes("iphon")) {
    return "iphone"
  }
  
  // check for raw dslr
  if (lower.includes("raw dslr") || (lower.includes("raw") && !lower.includes("edited"))) {
    return "raw_dslr"
  }
  
  // check for edited dslr
  if (lower.includes("edited dslr") || (lower.includes("edited") && !lower.includes("raw"))) {
    return "edited_dslr"
  }
  
  return null
}

