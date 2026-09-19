import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { tryCatch, errorResponse, rateLimitByUser, rateLimitExceededResponse } from "@/lib/api-helpers";

// GET /api/search?q=... — server-side search across the caller's content.
// Returns grouped results for the global (⌘K) search dialog. Pure read:
// no AI calls, no side effects, bounded result sets.

const MAX_RESULTS_PER_GROUP = 5;

export const GET = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const limiter = rateLimitByUser(request, user.id, { maxRequests: 60, windowSeconds: 60 });
  if (!limiter.allowed) return rateLimitExceededResponse(limiter);

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 100);
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const userId = user.id;

  const [posts, campaigns, competitors, hashtagSets] = await Promise.all([
    db.post.findMany({
      where: { userId, content: { contains: q } },
      select: { id: true, content: true, status: true },
      orderBy: { createdAt: "desc" },
      take: MAX_RESULTS_PER_GROUP,
    }),
    db.campaign.findMany({
      where: { userId, name: { contains: q } },
      select: { id: true, name: true, type: true, status: true },
      orderBy: { createdAt: "desc" },
      take: MAX_RESULTS_PER_GROUP,
    }),
    db.competitor.findMany({
      where: {
        userId,
        OR: [{ name: { contains: q } }, { handle: { contains: q } }],
      },
      select: { id: true, name: true, platform: true },
      orderBy: { createdAt: "desc" },
      take: MAX_RESULTS_PER_GROUP,
    }),
    db.hashtagSet.findMany({
      where: {
        userId,
        OR: [{ name: { contains: q } }, { hashtags: { contains: q } }],
      },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
      take: MAX_RESULTS_PER_GROUP,
    }),
  ]);

  return NextResponse.json({
    results: [
      ...posts.map((p) => ({
        id: `post-${p.id}`,
        title:
          p.content.slice(0, 60) + (p.content.length > 60 ? "..." : ""),
        description: `Post · ${p.status}`,
        category: "Posts",
        page: "poster",
      })),
      ...campaigns.map((c) => ({
        id: `campaign-${c.id}`,
        title: c.name,
        description: `Campaign · ${c.type} · ${c.status}`,
        category: "Campaigns",
        page: "liker",
      })),
      ...competitors.map((c) => ({
        id: `competitor-${c.id}`,
        title: c.name,
        description: `Competitor · ${c.platform}`,
        category: "Competitors",
        page: "competitor",
      })),
      ...hashtagSets.map((h) => ({
        id: `hashtag-${h.id}`,
        title: h.name,
        description: "Hashtag Set",
        category: "Hashtags",
        page: "hashtags",
      })),
    ],
  });
});
