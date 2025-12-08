import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return response
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response = NextResponse.next({
                request: {
                  headers: request.headers,
                },
              })
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    if (pathname.startsWith("/photographer")) {
      if (!user) {
        return NextResponse.redirect(new URL("/login", request.url))
      }
      const role = user?.user_metadata?.role || "client"
      if (role !== "photographer" && role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url))
      }
    }

    // Admin routes protection
    if (pathname.startsWith("/admin")) {
      if (!user) {
        return NextResponse.redirect(new URL("/login", request.url))
      }
      const role = user?.user_metadata?.role || "client"
      if (role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url))
      }
    }
  } catch (error) {
    console.error("middleware error:", error)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
