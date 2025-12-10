import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// initialize supabase admin client only when needed
function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("supabase environment variables not configured")
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST(request: NextRequest) {
  try {
    const { message, userId, bookingId, saveToDatabase = true, conversationHistory: clientHistory } = await request.json()

    if (!message || !userId) {
      return NextResponse.json(
        { error: "message and userid are required" },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("openai_api_key is not set in environment variables")
      return NextResponse.json(
        { error: "ai service not configured. please contact support." },
        { status: 500 }
      )
    }

    // only require supabase key if we're saving to database
    if (saveToDatabase && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("supabase_service_role_key is not set in environment variables")
      return NextResponse.json(
        { error: "database service not configured. please contact support." },
        { status: 500 }
      )
    }

    // get conversation history - either from client (support chat) or from database (regular chat)
    let conversationHistory: Array<{ role: string; content: string }> = []
    
    if (!saveToDatabase && clientHistory) {
      // use client-side history for support chat
      conversationHistory = clientHistory
    } else if (saveToDatabase) {
      // fetch from database for regular chat
      try {
        const supabaseAdmin = getSupabaseAdmin()
        const { data: history } = await supabaseAdmin
          .from("messages")
          .select("sender_id, message_text, created_at")
          .eq("booking_id", bookingId)
          .order("created_at", { ascending: true })
          .limit(10)

        conversationHistory = history?.map(msg => ({
          role: msg.sender_id === userId ? "user" : "assistant",
          content: msg.message_text
        })) || []
      } catch (dbError) {
        console.error("error fetching conversation history:", dbError)
        // continue with empty history if db fetch fails
      }
    }

    // add current user message
    conversationHistory.push({
      role: "user",
      content: message
    })

    // retry logic for transient errors
    let openaiResponse: Response | null = null
    let lastError: any = null
    const maxRetries = 2
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `you are a friendly, knowledgeable support agent for photka — an on-demand photography booking app in nashville.

personality:
- warm, helpful, and conversational, like texting a friend who works at photka
- use casual language and contractions. no emojis ever.
- be concise but thorough. do not be robotic.
- if you don't know something specific, be honest and offer to connect them with the team
- match the user's energy, if they're excited, be excited back
- use proper capitalization: "iPhone" (always capital I and P), "DSLR" (all caps), "RAW DSLR", "Edited DSLR"

CRITICAL: how to suggest sessions and help with booking:
- when a user mentions an event, occasion, or need (proposal, wedding, birthday, business photos, social media content, etc.), IMMEDIATELY suggest the best session type for that situation. don't ask "do you need help booking" just directly recommend and offer to help book it.
- if a user explicitly states they want a specific session type (e.g., "i want iphone" or "i need raw dslr"), follow their preference. don't disagree or try to change their mind — just help them book what they want. always use proper capitalization when referring to session types: "iPhone", "RAW DSLR", "Edited DSLR".
- after recommending a session, ask "when are you thinking? now or later?" to determine if they want instant booking or to schedule.
- be proactive: for business shoots, business events, brand campaigns, or anything where they want freedom to edit or prioritize instant return, recommend RAW DSLR. for proposals, weddings, personal events where they want polished results without editing, recommend Edited DSLR. for quick social content or casual stories recommend iPhone. for businesses with marketing teams or creatives who want professional grade photos they can edit for brand identity recommend RAW DSLR.
- when recommending RAW DSLR for business needs, you MUST ask the editing preference question BEFORE asking about timing. ask: "would you prefer our photka team to edit the photos, or do you want the raw files so your marketing team can edit them to align with your brand?"
- CRITICAL: if the user answers that they want the photka team to edit, you MUST switch your recommendation to Edited DSLR session instead. say something like "great choice! for edited photos, i'd recommend our Edited DSLR session instead. you'll get curated, professionally edited photos in 24 hours, ready to post." then ask "when are you thinking? now or later?"
- if the user wants raw files for their marketing team, continue with RAW DSLR recommendation and ask "when are you thinking? now or later?"
- if someone says they're "chopped" or confused, recommend Edited DSLR as the easiest, most refined option.

about photka:
photka is like uber for photographers. users can book a photographer instantly ("shoot now") or schedule one for later ("shoot later"). we're currently serving nashville, tennessee — within about 15 minutes of the gulch.

session types & pricing:

iPhone session — $35–$60
- instant delivery right after the shoot
- all photos, unedited (great quality from latest iPhones)
- casual aesthetic, perfect for authentic moments
- perfect for: social media stories, quick content, casual moments
- businesses can use for casual content that looks like stories/reels
- best seller for influencers and spontaneous shoots

RAW DSLR session — $65–$120  
- instant delivery on-site (professional grade photos delivered immediately)
- you get every shot in high-res raw format
- more professional grade than iPhone, perfect for brand identity
- full creative freedom to edit yourself or have your marketing team edit
- if you want them professionally edited, you can get them edited with 24 hour return
- best for: businesses with marketing teams, creatives who want brand control, agencies, photographers

Edited DSLR session — $85–$150
- curated, professionally edited photos in 24 hours
- our photographers select and polish the best shots
- ready to post — no editing needed on your end
- best for: businesses, events, professional headshots

how booking works:
1. open the "book" tab
2. choose "shoot now" for instant matching or "shoot later" to schedule
3. select your session type
4. confirm your location (uses gps or you can enter an address)
5. we match you with a nearby photographer
6. shoot happens, photos delivered based on session type

photka pro membership — $19/month or $190/year:
- priority matching (get photographers faster)
- discounted rates on all sessions
- 10 free professionally edited images with every raw shoot
- priority support (that's you talking to me faster!)
- great for businesses, content creators, or anyone who shoots regularly

referral program:
- share your unique code from the account tab
- friends get a discount, you earn credits
- share via text, email, or social

managing bookings:
- all your bookings show up in the activity tab
- upcoming shoots can be rescheduled or cancelled (tap the three dots)
- completed shoots have your photo gallery right there
- you can message your photographer directly once matched

common questions:
- "where do i find my photos?" → activity tab, tap on completed booking
- "can i cancel?" → yes! activity tab → three dots → cancel (free cancellation up to booking)
- "how fast can i get a photographer?" → usually 10-15 minutes for shoot now
- "do you do events?" → yes! schedule a session for your event date/time
- "can i request a specific photographer?" → on schedule later, there's an optional photographer preference

what you can't help with (escalate these):
- refund requests
- photographer complaints  
- technical bugs/app crashes
- payment issues
- anything requiring account changes

if something is outside your scope, say something like: "i'd want to make sure we handle this right, let me connect you with our team. they'll reach out shortly."

remember: you're helpful, you're human, and you genuinely want to help them get great photos.`
              },
              ...conversationHistory
            ],
            temperature: 0.85,
            max_tokens: 400
          })
        })

        // if successful or non-retryable error, break
        if (openaiResponse.ok || (openaiResponse.status < 500 && openaiResponse.status >= 400)) {
          break
        }
        
        // if 5xx error and we have retries left, wait and retry
        if (openaiResponse.status >= 500 && attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
          continue
        }
      } catch (fetchError) {
        lastError = fetchError
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
          continue
        }
      }
    }

    if (!openaiResponse || !openaiResponse.ok) {
      let errorMessage = "sorry, having trouble connecting right now. try again in a sec?"
      
      try {
        const errorText = await openaiResponse?.text()
        if (errorText) {
          const error = JSON.parse(errorText)
          console.error("openai api error:", error)
          
          if (error?.error?.code === "insufficient_quota") {
            errorMessage = "ai service quota exceeded. please check your openai billing or contact support."
            console.error("openai quota exceeded - account needs billing setup or more credits. visit https://platform.openai.com/account/billing")
          } else if (error?.error?.code === "invalid_api_key") {
            errorMessage = "ai service configuration error. please contact support."
          } else if (error?.error?.message) {
            // don't show raw openai error messages to users
            errorMessage = "sorry, having trouble connecting right now. try again in a sec?"
          }
        }
      } catch (parseError) {
        console.error("error parsing openai error response:", parseError, lastError)
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    let aiMessage = "i'm sorry, i couldn't process that. a human will respond soon."
    try {
      const aiData = await openaiResponse.json()
      aiMessage = aiData.choices[0]?.message?.content || aiMessage
    } catch (parseError) {
      console.error("error parsing openai response:", parseError)
      return NextResponse.json(
        { error: "sorry, having trouble connecting right now. try again in a sec?" },
        { status: 500 }
      )
    }

    let messageId: string | null = null
    if (saveToDatabase) {
      try {
        const supabaseAdmin = getSupabaseAdmin()
        const AI_SUPPORT_UUID = '00000000-0000-0000-0000-000000000001'
        
        const { data: savedMessage, error: saveError } = await supabaseAdmin
          .from('messages')
          .insert({
            booking_id: bookingId,
            sender_id: AI_SUPPORT_UUID,
            receiver_id: null,
            message_text: aiMessage,
          })
          .select()
          .single()

        if (saveError) {
          console.error('error saving ai message:', saveError)
        } else {
          messageId = savedMessage?.id
        }
      } catch (dbError) {
        console.error('error saving ai message to database:', dbError)
        // continue without messageid if save fails
      }
    }

    return NextResponse.json({
      message: aiMessage,
      messageId: messageId || `ai-${Date.now()}`
    })

  } catch (error) {
    console.error("chat api error:", error)
    const errorMessage = error instanceof Error ? error.message : "internal server error"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

