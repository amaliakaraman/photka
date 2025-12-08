import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    throw new Error("supabase configuration missing")
  }
  
  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    const { bookingId, userEmail } = await request.json()

    if (!bookingId || !userEmail) {
      return NextResponse.json(
        { error: "booking id and user email are required" },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("id, status, email")
      .eq("id", bookingId)
      .eq("email", userEmail)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: "booking not found or access denied" },
        { status: 404 }
      )
    }

    if (booking.status === "requested") {
      const { error: deleteError } = await supabaseAdmin
        .from("bookings")
        .delete()
        .eq("id", bookingId)

      if (deleteError) {
        console.error("error deleting booking:", deleteError)
        return NextResponse.json(
          { error: "failed to delete booking" },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, deleted: true })
    } else {
      const { error: updateError } = await supabaseAdmin
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId)

      if (updateError) {
        console.error("error cancelling booking:", updateError)
        return NextResponse.json(
          { error: "failed to cancel booking" },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, deleted: false })
    }
  } catch (error) {
    console.error("cancel booking api error:", error)
    let errorMessage = "internal server error"
    
    if (error instanceof Error) {
      errorMessage = error.message || "internal server error"
      if (errorMessage.includes("supabase configuration missing")) {
        errorMessage = "database service not configured. please contact support."
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

