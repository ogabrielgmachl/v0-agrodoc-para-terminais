import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  // BYPASS AUTH IN DEVELOPMENT MODE (v0 environment)
  const isDevelopment = process.env.NODE_ENV === "development" || 
                        process.env.VERCEL_ENV === "preview" ||
                        request.headers.get("host")?.includes("v0.dev") ||
                        request.headers.get("host")?.includes("localhost")
  
  // In development, skip auth and allow direct access to dashboard
  if (isDevelopment && !request.nextUrl.pathname.startsWith("/auth/")) {
    return NextResponse.next({
      request,
    })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Define public routes that don't require authentication
  const publicRoutes = [
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/callback",
    "/auth/sign-up-success",
    "/auth/error",
  ]

  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  // If user is not logged in and trying to access protected route
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // If user is logged in but email not confirmed, force logout
  if (user && !user.email_confirmed_at && !isPublicRoute) {
    await supabase.auth.signOut()
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    url.searchParams.set("message", "Por favor, confirme seu email antes de fazer login")
    return NextResponse.redirect(url)
  }

  // If user is logged in and trying to access auth pages, redirect to dashboard
  if (user && request.nextUrl.pathname.startsWith("/auth/login")) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
