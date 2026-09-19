import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

// NOTE: login brute-force protection lives in the Credentials provider's
// authorize() (src/lib/auth.ts), not here — middleware matchers never execute
// for /api/auth/* paths, so a limiter here would be dead code.

function secretsMatch(provided: string | null, configured: string | undefined): boolean {
  if (!provided || !configured || provided.length !== configured.length) {
    return false
  }
  let diff = 0
  for (let i = 0; i < configured.length; i++) {
    diff |= configured.charCodeAt(i) ^ provided.charCodeAt(i)
  }
  return diff === 0
}

export default withAuth(
  function middleware(req) {
    const { pathname, searchParams } = req.nextUrl

    // Temporary demo mode (see src/lib/bypass.ts): skip all auth gates.
    // Env is checked inline — middleware-safe (no db imports allowed here).
    if (
      process.env.AUTH_BYPASS === 'true' &&
      process.env.NODE_ENV !== 'production'
    ) {
      return NextResponse.next()
    }

    // Public health check.
    if (pathname === '/api') {
      return NextResponse.next()
    }

    // Cron endpoint: allow external callers presenting the shared secret
    // (header `x-cron-secret` or `?secret=`), otherwise require a session.
    if (pathname === '/api/scheduler/cron') {
      const presented =
        req.headers.get('x-cron-secret') || searchParams.get('secret')
      if (secretsMatch(presented, process.env.CRON_SECRET)) {
        return NextResponse.next()
      }
      if (!req.nextauth?.token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.next()
    }

    // API routes: return machine-readable 401 JSON (never an HTML redirect).
    if (pathname.startsWith('/api/')) {
      if (!req.nextauth?.token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Demo mode: authorized() runs before the middleware function, so the
        // bypass must be checked here too (otherwise pages 307 to login).
        if (
          process.env.AUTH_BYPASS === 'true' &&
          process.env.NODE_ENV !== 'production'
        )
          return true
        const { pathname } = req.nextUrl
        // API auth is handled inside the middleware above (JSON 401s).
        // /api (health) and the auth callbacks are intentionally public.
        if (
          pathname === '/api' ||
          pathname.startsWith('/api/')
        )
          return true
        // Pages keep the classic behavior: redirect to sign-in.
        return !!token
      },
    },
    pages: {
      signIn: '/auth/login',
    },
  }
)

export const config = {
  // NOTE: /api/seed is intentionally excluded — it enforces its own rule
  // (public only for first-run bootstrap when zero users exist).
  // /api/auth/* is excluded (public login flow; brute-force protection is
  // enforced in the Credentials provider's authorize() instead).
  matcher: [
    '/((?!auth|api/auth|api/seed|_next/static|_next/image|favicon.ico|logo.svg).*)',
  ],
}
