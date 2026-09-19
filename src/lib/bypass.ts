// ─── Auth bypass (temporary demo mode) ───────────────────────────────────────
// When NEXT_PUBLIC_AUTH_BYPASS=true (and never in production), the client
// skips all login gates and the server (see auth-helpers.ts requireUser())
// acts as the demo user. All auth code stays in place — to re-enable logins,
// remove the AUTH_BYPASS / NEXT_PUBLIC_AUTH_BYPASS flags and restart.
// This module is client-safe (no server-only imports).

export function isBypassMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true' &&
    process.env.NODE_ENV !== 'production'
  )
}
