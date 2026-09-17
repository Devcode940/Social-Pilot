import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import {
  tryCatch,
  validateBody,
  errorResponse,
  rateLimitByUser,
  rateLimitExceededResponse,
} from "@/lib/api-helpers";

const trendsSchema = z.object({
  query: z.string().trim().min(1).max(200),
  platform: z.string().trim().max(64).optional(),
  timeRange: z.string().trim().max(64).optional(),
});

interface TrendItem {
  title: string;
  snippet: string;
  source: string;
  url: string;
  category: string;
}

function deduceCategory(snippet: string): string {
  const lower = snippet.toLowerCase();
  if (
    lower.includes("ai") ||
    lower.includes("artificial intelligence") ||
    lower.includes("machine learning")
  )
    return "AI & Technology";
  if (lower.includes("marketing") || lower.includes("brand") || lower.includes("advertis"))
    return "Marketing";
  if (lower.includes("video") || lower.includes("reel") || lower.includes("short"))
    return "Video Content";
  if (lower.includes("hashtag") || lower.includes("trending"))
    return "Trending";
  if (
    lower.includes("instagram") ||
    lower.includes("tiktok") ||
    lower.includes("youtube")
  )
    return "Social Platforms";
  if (lower.includes("engagement") || lower.includes("growth") || lower.includes("follower"))
    return "Growth & Engagement";
  if (lower.includes("influencer") || lower.includes("creator"))
    return "Creator Economy";
  return "General";
}

function processSearchResults(results: unknown[]): TrendItem[] {
  if (!Array.isArray(results)) return [];

  return results
    .map((item: unknown) => {
      const r = item as Record<string, unknown>;
      return {
        title: (r.name as string) || "",
        snippet: (r.snippet as string) || "",
        source: (r.host_name as string) || "",
        url: (r.url as string) || "",
        category: deduceCategory((r.snippet as string) || ""),
      };
    })
    .filter((r) => r.title && r.snippet);
}

const CACHE_TTL_HOURS = 24;

export const POST = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const validation = await validateBody(request, trendsSchema);
  if (!validation.success) return validation.response;
  const { query, platform, timeRange } = validation.data;

  // Serve fresh cached results when available (saves paid searches).
  const cacheCutoff = new Date(Date.now() - CACHE_TTL_HOURS * 3_600_000);
  const cached = await db.trendResult.findFirst({
    where: {
      userId: user.id,
      query,
      platform: platform || null,
      createdAt: { gte: cacheCutoff },
    },
    orderBy: { createdAt: "desc" },
  });
  if (cached) {
    try {
      const parsed = JSON.parse(cached.results) as {
        trends: TrendItem[];
        viralContent: TrendItem[];
        hashtags: TrendItem[];
      };
      return NextResponse.json({ ...parsed, saved: true, cached: true });
    } catch {
      // Corrupt cache row — fall through to a live search.
    }
  }

  const limiter = rateLimitByUser(request, user.id, {
    maxRequests: 15,
    windowSeconds: 300,
  });
  if (!limiter.allowed) return rateLimitExceededResponse(limiter);

  const zai = await ZAI.create();
  const year = new Date().getFullYear();
  const timeSuffix = timeRange ? ` ${timeRange}` : "";
  const platformLower = (platform || "").toLowerCase();

  const searches: Promise<unknown>[] = [
    // 1. General social media trends
    zai.functions.invoke("web_search", {
      query: `${query} social media trends ${year}${timeSuffix}`,
      num: 10,
    }),
    // 2. Viral content
    zai.functions.invoke("web_search", {
      query: platform
        ? `${query} viral content ${platform}${timeSuffix}`
        : `${query} viral content social media${timeSuffix}`,
      num: 10,
    }),
  ];

  // 3. Trending hashtags (Instagram/TikTok only) — run in parallel too.
  const wantsHashtags =
    platformLower.includes("instagram") || platformLower.includes("tiktok");
  if (wantsHashtags) {
    searches.push(
      zai.functions.invoke("web_search", {
        query: `${query} trending hashtags ${year}${timeSuffix}`,
        num: 10,
      })
    );
  }

  const [trendsSearch, viralSearch, hashtagSearch] =
    await Promise.all(searches);

  const trends = processSearchResults(
    Array.isArray(trendsSearch) ? trendsSearch : []
  );
  const viralContent = processSearchResults(
    Array.isArray(viralSearch) ? viralSearch : []
  );
  const hashtags =
    wantsHashtags && Array.isArray(hashtagSearch)
      ? processSearchResults(hashtagSearch)
      : [];

  await db.trendResult.create({
    data: {
      userId: user.id,
      query,
      platform: platform || null,
      results: JSON.stringify({
        trends,
        viralContent,
        hashtags,
        searchedAt: new Date().toISOString(),
      }),
    },
  });

  return NextResponse.json({ trends, viralContent, hashtags, saved: true });
});
