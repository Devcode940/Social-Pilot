import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth-helpers'
import {
  tryCatch,
  errorResponse,
  rateLimitByUser,
  rateLimitExceededResponse,
} from '@/lib/api-helpers'

// Parse numbers from text (handles K/M/B suffixes)
function parseNumber(text: string): number {
  const match = text.match(/[\d,.]+/)
  if (!match) return 0
  const cleaned = match[0].replace(/,/g, '')
  const num = parseFloat(cleaned)
  if (isNaN(num)) return 0
  const upper = text.toUpperCase()
  if (upper.includes('B') && num < 1000) return Math.round(num * 1_000_000_000)
  if (upper.includes('M') && num < 1000) return Math.round(num * 1_000_000)
  if (upper.includes('K') && num < 1000) return Math.round(num * 1_000)
  return Math.round(num)
}

interface ScrapedMetrics {
  followers: number
  engagementRate: number
  postsWeek: number
  growthRate: number
  foundAny: boolean
}

/** Best-effort metric extraction from web search. Never fabricates data:
 *  fields stay 0 when nothing is found, and `foundAny` reports that. */
async function scrapeMetrics(handle: string, platform: string): Promise<ScrapedMetrics> {
  const empty: ScrapedMetrics = {
    followers: 0,
    engagementRate: 0,
    postsWeek: 0,
    growthRate: 0,
    foundAny: false,
  }
  try {
    const zai = await ZAI.create()
    const year = new Date().getFullYear()
    const results = await zai.functions.invoke('web_search', {
      query: `${handle} ${platform} followers engagement rate ${year}`,
      num: 8,
    })
    const searchData = Array.isArray(results) ? results : []
    const allText = (searchData as unknown as Array<Record<string, unknown>>)
      .map((r) => `${(r.name as string) || ''} ${(r.snippet as string) || ''}`)
      .join(' ')

    const metrics = { ...empty }

    const followerMatch = allText.match(
      /([\d,.]+)\s*(million|m|M|billion|b|B|thousand|k|K)\s*followers/i
    )
    if (followerMatch) {
      metrics.followers = parseNumber(followerMatch[0])
      if (metrics.followers > 0) metrics.foundAny = true
    }

    const engagementMatch = allText.match(/([\d.]+)\s*%\s*(engagement|eng)/i)
    if (engagementMatch) {
      metrics.engagementRate = parseFloat(engagementMatch[1]) || 0
      if (metrics.engagementRate > 0) metrics.foundAny = true
    }

    const postsMatch = allText.match(/([\d]+)\s*(posts?|per week|weekly)/i)
    if (postsMatch) {
      metrics.postsWeek = parseInt(postsMatch[1], 10) || 0
      if (metrics.postsWeek > 0) metrics.foundAny = true
    }

    const growthMatch = allText.match(/([+\-]?[\d.]+)\s*%\s*(growth|growing|month|year)/i)
    if (growthMatch) {
      metrics.growthRate = Math.abs(parseFloat(growthMatch[1])) || 0
      if (metrics.growthRate > 0) metrics.foundAny = true
    }

    return metrics
  } catch {
    return empty
  }
}

const createCompetitorSchema = z.object({
  name: z.string().trim().min(1).max(200),
  platform: z.string().trim().min(1).max(64),
  handle: z.string().trim().min(1).max(128),
})

const refreshCompetitorSchema = z.object({
  action: z.literal('refresh'),
  id: z.string().min(1),
})

// ── GET: list the caller's competitors (pure read, no side effects) ──
export const GET = tryCatch(async () => {
  const user = await requireUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const competitors = await db.competitor.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(competitors)
})

// ── POST: add a competitor, or refresh one ──
export const POST = tryCatch(async (request: NextRequest) => {
  const user = await requireUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const rawBody: unknown = await request.json()

  // ── Action: manually refresh one competitor's metrics ──
  if (
    typeof rawBody === 'object' &&
    rawBody !== null &&
    (rawBody as Record<string, unknown>).action === 'refresh'
  ) {
    const parsed = refreshCompetitorSchema.safeParse(rawBody)
    if (!parsed.success) return errorResponse('Request validation failed', 400)

    const limiter = rateLimitByUser(request, user.id, {
      maxRequests: 10,
      windowSeconds: 300,
    })
    if (!limiter.allowed) return rateLimitExceededResponse(limiter)

    const existing = await db.competitor.findFirst({
      where: { id: parsed.data.id, userId: user.id },
    })
    if (!existing) return errorResponse('Competitor not found', 404)

    const metrics = await scrapeMetrics(existing.handle, existing.platform)
    const updated = await db.competitor.update({
      where: { id: existing.id },
      data: {
        ...(metrics.followers > 0 && { followers: metrics.followers }),
        ...(metrics.engagementRate > 0 && {
          engagementRate: metrics.engagementRate,
        }),
        ...(metrics.postsWeek > 0 && { postsWeek: metrics.postsWeek }),
        ...(metrics.growthRate > 0 && { growthRate: metrics.growthRate }),
        isEstimated: !metrics.foundAny,
      },
    })
    return NextResponse.json(updated)
  }

  // ── Default: create a competitor with best-effort real data ──
  const parsed = createCompetitorSchema.safeParse(rawBody)
  if (!parsed.success) return errorResponse('Request validation failed', 400)
  const { name, platform, handle } = parsed.data

  const limiter = rateLimitByUser(request, user.id, {
    maxRequests: 20,
    windowSeconds: 300,
  })
  if (!limiter.allowed) return rateLimitExceededResponse(limiter)

  const metrics = await scrapeMetrics(handle, platform)

  const competitor = await db.competitor.create({
    data: {
      userId: user.id,
      name,
      platform,
      handle,
      followers: metrics.followers,
      following: 0,
      postsWeek: metrics.postsWeek,
      engagementRate: metrics.engagementRate,
      growthRate: metrics.growthRate,
      avgLikes: 0,
      bestTime: null,
      isTracking: true,
      // Honest flag: true when web search produced no usable figures.
      isEstimated: !metrics.foundAny,
    },
  })

  return NextResponse.json(competitor, { status: 201 })
})

// ── DELETE: remove the caller's competitor ──
export const DELETE = tryCatch(async (request: NextRequest) => {
  const user = await requireUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return errorResponse('id query parameter is required', 400)

  const existing = await db.competitor.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  })
  if (!existing) return errorResponse('Competitor not found', 404)

  await db.competitor.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
