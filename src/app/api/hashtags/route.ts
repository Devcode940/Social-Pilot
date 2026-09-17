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

// ── GET: fetch saved hashtag sets ──
export const GET = tryCatch(async () => {
  const user = await requireUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const hashtagSets = await db.hashtagSet.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(hashtagSets)
})

// ── POST: save a hashtag set OR search/generate via web search ──
// body.action === 'search' → web search for trending hashtags
// body.action === 'check'  → check if hashtags are banned
// (no action)             → save a new hashtag set
const searchSchema = z.object({
  action: z.literal('search'),
  query: z.string().trim().min(1).max(200),
  platform: z.string().trim().max(64).optional(),
})

const checkSchema = z.object({
  action: z.literal('check'),
  tags: z.array(z.string().trim().min(1).max(100)).min(1).max(20),
})

const saveSchema = z.object({
  name: z.string().trim().min(1).max(200),
  hashtags: z.union([z.string().trim().min(1).max(10000), z.array(z.string().max(100)).max(100)]),
  reach: z.coerce.number().int().min(0).max(1_000_000_000).optional().nullable(),
  platform: z.string().trim().max(64).optional().nullable(),
})

export const POST = tryCatch(async (request: NextRequest) => {
    const user = await requireUser()
    if (!user) return errorResponse('Unauthorized', 401)

    const body = await request.json()
    const { action } = body as { action?: string }

    // ── Action: search trending hashtags via web search ──
    if (action === 'search') {
      const parsed = searchSchema.safeParse(body)
      if (!parsed.success) return errorResponse('Request validation failed', 400)
      const { query, platform } = parsed.data

      const limiter = rateLimitByUser(request, user.id, { maxRequests: 15, windowSeconds: 300 })
      if (!limiter.allowed) return rateLimitExceededResponse(limiter)

      const zai = await ZAI.create()
      const year = new Date().getFullYear()
      const platformSuffix = platform && platform !== 'all' ? ` ${platform}` : ''

      // 1. Search for trending hashtags
      const trendingResults = await zai.functions.invoke('web_search', {
        query: `${query.trim()} trending hashtags ${year}${platformSuffix}`,
        num: 10,
      })
      const trendingData = Array.isArray(trendingResults) ? trendingResults : []

      // 2. Search for banned/restricted hashtags
      const bannedResults = await zai.functions.invoke('web_search', {
        query: `${query.trim()} banned hashtags instagram tiktok restricted`,
        num: 8,
      })
      const bannedData = Array.isArray(bannedResults) ? bannedResults : []

      // Extract hashtags from search results
      const allText = [
        ...trendingData.map((r: any) => `${(r.name as string) || ''} ${(r.snippet as string) || ''}`).join(' '),
        ...bannedData.map((r: any) => `${(r.name as string) || ''} ${(r.snippet as string) || ''}`).join(' '),
      ].join(' ')

      // Extract hashtag-like words
      const hashtagMatches = allText.match(/(?:^|\s)[##]([a-zA-Z0-9_]{2,30})/g) || []
      const rawHashtags = hashtagMatches.map((h: string) => h.replace(/^#+/, '').toLowerCase())
      const uniqueHashtags = [...new Set(rawHashtags)]

      // Extract banned words from banned results
      const bannedText = bannedData.map((r: any) => `${(r.name as string) || ''} ${(r.snippet as string) || ''}`).join(' ').toLowerCase()
      const knownBannedPatterns = [
        'followme', 'follow4follow', 'followforfollow', 'like4like', 'likeforlike',
        'likeforlikes', 'like4likes', 'l4l', 'f4f', 'followback',
        'tagsforlikes', 'tagforlikes', 'photooftheday', 'picoftheday',
        'instagood', 'instalike', 'webstagram', 'repost', 'regrann',
        'comment4comment', 'c4c', 'recent4recent', 'r4r', 'shoutoutforshoutout',
        's4s', 'spam', 'spambot', 'ilike', 'ilikeit', 'instamood',
      ]

      // Check which extracted words appear in banned context
      const bannedFromSearch: string[] = []
      for (const tag of uniqueHashtags) {
        if (knownBannedPatterns.includes(tag) || bannedText.includes(`#${tag}`)) {
          bannedFromSearch.push(tag)
        }
      }

      // Build result list
      const categories = ['Trending', 'Niche', 'Popular', 'Industry', 'Viral']
      // NOTE: reach is unknown from web search alone — report null (the UI
      // renders "—") rather than a fabricated number.
      const hashtags = uniqueHashtags.slice(0, 30).map((tag, i) => ({
        tag,
        reach: null as number | null,
        isTrending: i < Math.ceil(uniqueHashtags.length * 0.4),
        isBanned: bannedFromSearch.includes(tag),
        category: categories[i % categories.length],
      }))

      return NextResponse.json({
        hashtags,
        searchQuery: query,
        platform: platform || 'all',
        searchResults: trendingData.length + bannedData.length,
      })
    }

    // ── Action: check banned hashtags ──
    if (action === 'check') {
      const parsed = checkSchema.safeParse(body)
      if (!parsed.success) return errorResponse('Request validation failed', 400)
      const { tags } = parsed.data

      const limiter = rateLimitByUser(request, user.id, { maxRequests: 15, windowSeconds: 300 })
      if (!limiter.allowed) return rateLimitExceededResponse(limiter)

      const zai = await ZAI.create()

      // Search for banned hashtags related to the provided tags
      const tagStr = tags.slice(0, 5).join(' ')
      const results = await zai.functions.invoke('web_search', {
        query: `${tagStr} banned hashtags instagram tiktok shadowbanned restricted ${new Date().getFullYear()}`,
        num: 8,
      })
      const searchData = Array.isArray(results) ? results : []
      const bannedContext = searchData.map((r: any) => `${(r.name as string) || ''} ${(r.snippet as string) || ''}`).join(' ').toLowerCase()

      const knownBanned = [
        'followme', 'follow4follow', 'followforfollow', 'like4like', 'likeforlike',
        'likeforlikes', 'like4likes', 'l4l', 'f4f', 'followback', 'followforfollowback',
        'instagood', 'instalike', 'tagsforlikes', 'tagforlikes', 'tagsforfollow',
        'photooftheday', 'picoftheday', 'instadaily', 'webstagram',
        'repost', 'regrann', 'followall', 'comment4comment', 'c4c',
        'recent4recent', 'r4r', 'shoutout', 'shoutoutforshoutout', 's4s',
        'spam', 'spambot', 'ilike', 'ilikeit', 'instamood',
      ]

      const checkResults = (tags as string[]).map((tag: string) => {
        const normalized = tag.replace(/^#/, '').trim().toLowerCase()
        const isKnownBanned = knownBanned.includes(normalized)
        const isInSearchContext = bannedContext.includes(`#${normalized}`) || bannedContext.includes(normalized)
        const isBanned = isKnownBanned || isInSearchContext

        return {
          tag: `#${normalized}`,
          safe: !isBanned,
          reason: isBanned
            ? isInSearchContext
              ? 'Flagged — found in restricted hashtag search results'
              : 'Banned — known to be restricted by Instagram/TikTok'
            : undefined,
        }
      })

      return NextResponse.json({ results: checkResults, searched: true })
    }

    // ── Default action: save a hashtag set ──
    const parsed = saveSchema.safeParse(body)
    if (!parsed.success) return errorResponse('Request validation failed', 400)
    const { name, hashtags, reach, platform } = parsed.data

    const hashtagsStr = typeof hashtags === 'string' ? hashtags : JSON.stringify(hashtags)

    const hashtagSet = await db.hashtagSet.create({
      data: {
        userId: user.id,
        name,
        hashtags: hashtagsStr,
        reach: reach ?? null,
        platform: platform || null,
      },
    })

    return NextResponse.json(hashtagSet, { status: 201 })
})

// ── DELETE: remove a hashtag set ──
export const DELETE = tryCatch(async (request: NextRequest) => {
  const user = await requireUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return errorResponse('id query parameter is required', 400)

  const existing = await db.hashtagSet.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  })
  if (!existing) return errorResponse('Hashtag set not found', 404)

  await db.hashtagSet.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
