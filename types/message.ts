export interface Message {
  id: string
  booking_id: string
  sender_id: string
  receiver_id: string | null
  message_text: string
  created_at: string
  read_at: string | null
  attachments?: Array<{
    url: string
    type: string
    name?: string
  }>
}

export interface Conversation {
  booking_id: string
  booking: {
    id: string
    session_type: string
    location_text: string
    when_time: string
    status: string
  }
  other_user: {
    id: string
    email: string
    full_name?: string
    avatar_url?: string
  }
  last_message: Message | null
  unread_count: number
}

