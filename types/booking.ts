// shared booking types used across the application

export interface Booking {
  id: string
  full_name?: string
  email?: string
  phone?: string
  session_type: string
  duration_min?: number
  when_time: string
  location_text: string
  status: BookingStatus
  created_at: string
  // photo data - in production this would come from storage
  photos?: string[]
}

export type BookingStatus = 
  | "requested" 
  | "scheduled" 
  | "confirmed" 
  | "completed" 
  | "cancelled"

export const SESSION_TYPE_LABELS: Record<string, string> = {
  iphone: "iPhone Session",
  raw_dslr: "RAW DSLR Session",
  edited_dslr: "Edited DSLR Session",
}

export const STATUS_STYLES: Record<string, string> = {
  requested: "bg-amber-500/15 text-amber-300",
  scheduled: "bg-amber-500/15 text-amber-300",
  confirmed: "bg-emerald-500/15 text-emerald-300",
  completed: "bg-blue-500/15 text-blue-300",
  cancelled: "bg-red-500/15 text-red-300",
}

// display status label - show "pending" for requested/scheduled
export function getStatusLabel(status: string): string {
  if (status === "requested" || status === "scheduled") {
    return "pending"
  }
  return status
}

