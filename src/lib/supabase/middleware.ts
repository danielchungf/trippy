import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

  // Refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes - redirect to login if not authenticated
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/signup') ||
                     request.nextUrl.pathname.startsWith('/forgot-password')

  // Auth callbacks must always be accessible (they handle OAuth/magic links/password reset)
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth/')

  // Password reset page needs special handling - users must be able to access it
  // both before session is established (redirect from callback) and after
  const isPasswordResetPage = request.nextUrl.pathname === '/reset-password'

  if (!user && !isAuthPage && !isAuthCallback && !isPasswordResetPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages (but not callbacks or reset-password)
  // Callbacks need to run to handle tokens even if user is logged in
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
