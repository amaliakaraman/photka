// chat and messaging constants

// special uuid for ai support messages
export const AI_SUPPORT_UUID = '00000000-0000-0000-0000-000000000001'

// generate welcome messages for support chat
export function getWelcomeMessage(userName: string): string {
  const greetings = [
    `Hey ${userName}! What can I help you with today?`,
    `Hi ${userName}! Thanks for reaching out. I'm here to help with anything — bookings, questions about sessions, or just figuring out what works best for you. What's on your mind?`,
    `Hey ${userName}! Welcome to photka support. Whether you need help booking a shoot, have questions about pricing, or anything else — I've got you. What's up?`,
  ]
  return greetings[Math.floor(Math.random() * greetings.length)]
}

// format date header for chat messages (today, yesterday, or full date)
export function formatDateHeader(date: Date): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const messageDate = new Date(date)
  messageDate.setHours(0, 0, 0, 0)
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (messageDate.getTime() === today.getTime()) {
    return 'Today'
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  } else {
    return messageDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }
}

// check if two dates are on different days
export function isDifferentDay(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1)
  d1.setHours(0, 0, 0, 0)
  const d2 = new Date(date2)
  d2.setHours(0, 0, 0, 0)
  return d1.getTime() !== d2.getTime()
}

