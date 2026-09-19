import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export interface SessionUser {
  id: string
  email: string
  role: string
}

/**
 * Temporary demo mode: when AUTH_BYPASS=true (dev only — never honored in
 * production), auth is skipped app-wide and requests act as the demo user.
 * Remove the flag to restore normal logins. See src/lib/bypass.ts.
 */
export function isAuthBypassed(): boolean {
  return (
    process.env.AUTH_BYPASS === 'true' &&
    process.env.NODE_ENV !== 'production'
  )
}

/** Demo user for bypass mode (falls back to the oldest user). Null when the DB has no users (seed first). */
async function getBypassUser(): Promise<SessionUser | null> {
  const select = { id: true, email: true, role: true }
  const user =
    (await db.user.findUnique({
      where: { email: 'demo@socialtool.com' },
      select,
    })) ?? (await db.user.findFirst({ select, orderBy: { createdAt: 'asc' } }))
  if (!user) return null
  return { id: user.id, email: user.email, role: user.role }
}

/**
 * Returns the currently authenticated user (from the NextAuth session),
 * or null when there is no valid session / the user no longer exists.
 * Use this at the top of every protected API route — never `findFirst()`.
 */
export async function requireUser(): Promise<SessionUser | null> {
  if (isAuthBypassed()) return getBypassUser()

  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return null

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  })
  if (!user) return null

  return { id: user.id, email: user.email, role: user.role }
}

/**
 * Validates the shared cron secret (header `x-cron-secret` or `?secret=`).
 * Used by /api/scheduler/cron so external cron services can call it without
 * a user session. Returns false when CRON_SECRET is not configured.
 */
export function isValidCronSecret(request: Request): boolean {
  const configured = process.env.CRON_SECRET
  if (!configured) return false
  const url = new URL(request.url)
  const provided =
    request.headers.get('x-cron-secret') || url.searchParams.get('secret')
  if (!provided || provided.length !== configured.length) return false
  // Constant-time comparison to avoid timing attacks
  let diff = 0
  for (let i = 0; i < configured.length; i++) {
    diff |= configured.charCodeAt(i) ^ provided.charCodeAt(i)
  }
  return diff === 0
}

/** Mask a stored secret for display, e.g. "••••••••3f9a" (last 4 visible). */
export function maskSecret(value: string): string {
  const last4 = value.slice(-4)
  return `••••••••${last4}`
}
