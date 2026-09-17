import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import {
  tryCatch,
  validateBody,
  rateLimit,
  rateLimitExceededResponse,
} from '@/lib/api-helpers'

const registerSchema = z.object({
  name: z.string().trim().min(1).max(128),
  email: z.string().trim().email().max(254),
  password: z.string().min(6).max(128),
})

export const POST = tryCatch(async (request: NextRequest) => {
  // Public endpoint — strict IP-based rate limit against mass signups.
  const limiter = rateLimit(request, { maxRequests: 10, windowSeconds: 600 })
  if (!limiter.allowed) return rateLimitExceededResponse(limiter)

  const validation = await validateBody(request, registerSchema)
  if (!validation.success) return validation.response
  const { name, email, password } = validation.data

  const normalizedEmail = email.toLowerCase()

  const existingUser = await db.user.findUnique({
    where: { email: normalizedEmail },
  })
  if (existingUser) {
    return NextResponse.json(
      { error: 'An account with this email already exists' },
      { status: 409 }
    )
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await db.user.create({
    data: { name, email: normalizedEmail, password: hashedPassword },
  })

  return NextResponse.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email },
  })
})
