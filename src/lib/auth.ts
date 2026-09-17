import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

// ─── Login brute-force protection ────────────────────────────────────────────
// In-memory buckets (single-instance; use Redis/Upstash for multi-instance
// production). Two layers: a generous per-IP flood cap plus a strict
// per-IP+email cap that stops targeted password guessing.
const loginBuckets = new Map<string, { count: number; resetAt: number }>()
const LOGIN_WINDOW_MS = 60 * 1000
const LOGIN_MAX_PER_IP = 60
const LOGIN_MAX_PER_IP_EMAIL = 10

function loginAllowed(key: string, max: number): boolean {
  const now = Date.now()
  const entry = loginBuckets.get(key)
  if (!entry || entry.resetAt <= now) {
    loginBuckets.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
    return true
  }
  entry.count += 1
  return entry.count <= max
}

function requestIp(req: { headers?: Record<string, string | string[] | undefined> }): string {
  const forwarded = req.headers?.['x-forwarded-for']
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]
  return first?.trim() || 'direct'
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        // Normalize exactly like registration (lowercase) so mixed-case
        // logins match, then enforce brute-force limits BEFORE bcrypt.
        const email = credentials.email.trim().toLowerCase()
        const ip = requestIp(req ?? {})
        if (
          !loginAllowed(`ip:${ip}`, LOGIN_MAX_PER_IP) ||
          !loginAllowed(`ip-email:${ip}:${email}`, LOGIN_MAX_PER_IP_EMAIL)
        ) {
          throw new Error('Too many login attempts. Please try again in a minute.')
        }

        const user = await db.user.findUnique({
          where: { email },
        })

        if (!user || !user.password) {
          throw new Error('Invalid email or password')
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error('Invalid email or password')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar,
          role: user.role,
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string
        ;(session.user as { role?: string }).role = token.role as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
