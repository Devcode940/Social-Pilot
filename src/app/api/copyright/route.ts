import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import {
  tryCatch,
  errorResponse,
  rateLimitByUser,
  rateLimitExceededResponse,
} from "@/lib/api-helpers";

// Content-derived, STABLE fingerprint: identical content always yields the
// identical fingerprint, so re-registrations can actually be detected.
function generateFingerprint(name: string, type: string, sourceUrl?: string | null): string {
  return crypto
    .createHash("sha256")
    .update(`${type.trim().toLowerCase()}|${name.trim().toLowerCase()}|${(sourceUrl || "").trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 24);
}

// Calculate text similarity (basic word overlap)
function calculateSimilarity(textA: string, textB: string): number {
  if (!textA || !textB) return 0;
  const wordsA = new Set(textA.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  const wordsB = new Set(textB.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }
  return Math.round((intersection / Math.min(wordsA.size, wordsB.size)) * 100);
}

const scanSchema = z.object({
  action: z.literal("scan"),
  contentId: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().trim().min(1).max(300),
  type: z.string().trim().min(1).max(64),
  sourceUrl: z.string().trim().max(2048).optional().nullable(),
});

const patchSchema = z.object({
  contentId: z.string().min(1).optional(),
  matchId: z.string().min(1).optional(),
  status: z.enum([
    "registered",
    "scanning",
    "pending",
    "reviewed",
    "resolved",
    "ignored",
    "reported",
    "action_needed",
  ]),
});

// GET /api/copyright — list the caller's content with matches
export const GET = tryCatch(async () => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const content = await db.copyrightContent.findMany({
    where: { userId: user.id },
    include: { matches: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(content);
});

// POST /api/copyright — register new content OR scan for matches
export const POST = tryCatch(async (request: NextRequest) => {
    const user = await requireUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const limiter = rateLimitByUser(request, user.id, { maxRequests: 15, windowSeconds: 300 });
    if (!limiter.allowed) return rateLimitExceededResponse(limiter);

    const body = await request.json();
    const { action } = body as { action?: string };

    // ── Action: scan for matches via web search ──
    if (action === "scan") {
      const parsed = scanSchema.safeParse(body);
      if (!parsed.success) return errorResponse("Request validation failed", 400);
      const { contentId } = parsed.data;

      const content = await db.copyrightContent.findFirst({
        where: { id: contentId, userId: user.id },
      });
      if (!content) return errorResponse("Content not found", 404);

      // Mark as scanning
      await db.copyrightContent.update({
        where: { id: contentId },
        data: { status: "scanning", lastScanned: new Date() },
      });

      // Use web search to look for potential copies
      const zai = await ZAI.create();
      const searchQuery = `"${content.name}" ${content.type.toLowerCase()} copy unauthorized use`;

      let searchResults: any[] = [];
      try {
        const results = await zai.functions.invoke("web_search", {
          query: searchQuery,
          num: 10,
        });
        searchResults = Array.isArray(results) ? results as any[] : [];
      } catch {
        // Search failed, will return empty matches
      }

      // Also search for the content name specifically
      let searchResults2: any[] = [];
      try {
        const results2 = await zai.functions.invoke("web_search", {
          query: `${content.name} ${content.sourceUrl ? "site:" + new URL(content.sourceUrl).hostname : ""} similar content`,
          num: 8,
        });
        searchResults2 = Array.isArray(results2) ? results2 as any[] : [];
      } catch {
        // Skip secondary search
      }

      const allResults = [...searchResults, ...searchResults2];

      // Create match records for potential copies found
      const matches: any[] = [];
      const seenUrls = new Set<string>();

      for (const result of allResults) {
        const url = (result.url as string) || "";
        if (!url || seenUrls.has(url)) continue;
        seenUrls.add(url);

        const title = (result.name as string) || "";
        const snippet = (result.snippet as string) || "";

        // Calculate similarity based on text overlap
        const nameSimilarity = calculateSimilarity(content.name, title + " " + snippet);
        const similarity = Math.min(95, Math.max(5, nameSimilarity));

        // Determine platform from URL
        let platform = "Website";
        const urlLower = url.toLowerCase();
        if (urlLower.includes("instagram")) platform = "Instagram";
        else if (urlLower.includes("facebook") || urlLower.includes("fb.com")) platform = "Facebook";
        else if (urlLower.includes("youtube") || urlLower.includes("youtu.be")) platform = "YouTube";
        else if (urlLower.includes("tiktok")) platform = "TikTok";
        else if (urlLower.includes("twitter") || urlLower.includes("x.com")) platform = "Twitter";
        else {
          // No recognizable platform: report Unknown. Never guess — a guessed
          // platform persisted as fact is fabricated evidence.
          platform = "Unknown";
        }

        const match = await db.copyrightMatch.create({
          data: {
            contentId,
            matchedUrl: url,
            platform,
            similarity,
            status: similarity >= 80 ? "pending" : "reviewed",
          },
        });
        matches.push(match);
      }

      // Update content status
      await db.copyrightContent.update({
        where: { id: contentId },
        data: {
          status: "registered",
          lastScanned: new Date(),
        },
      });

      // Re-fetch with matches
      const updated = await db.copyrightContent.findUnique({
        where: { id: contentId },
        include: { matches: true },
      });

      return NextResponse.json(updated);
    }

    // ── Default action: register new content ──
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Request validation failed", 400);
    const { name, type, sourceUrl } = parsed.data;

    const fingerprint = generateFingerprint(name, type, sourceUrl);

    const duplicate = await db.copyrightContent.findFirst({
      where: { userId: user.id, fingerprint },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "This content is already registered" },
        { status: 409 }
      );
    }

    const newContent = await db.copyrightContent.create({
      data: {
        userId: user.id,
        name,
        type,
        sourceUrl: sourceUrl || null,
        fingerprint,
        status: "registered",
        lastScanned: new Date(),
      },
    });

    // Auto-scan via web search after registration
    const zai = await ZAI.create();
    const searchQuery = `"${name}" ${type.toLowerCase()} similar content copy`;
    let searchResults: any[] = [];

    try {
      const results = await zai.functions.invoke("web_search", {
        query: searchQuery,
        num: 8,
      });
      searchResults = Array.isArray(results) ? (results as any[]) : [];
    } catch {
      // Scan failed, continue
    }

    const seenUrls = new Set<string>();

    for (const result of searchResults) {
      const url = (result.url as string) || "";
      if (!url || seenUrls.has(url)) continue;
      seenUrls.add(url);

      const title = (result.name as string) || "";
      const snippet = (result.snippet as string) || "";
      const nameSim = calculateSimilarity(name, title + " " + snippet);
      const similarity = Math.min(90, Math.max(5, nameSim));

      let platform = "Website";
      const urlLower = url.toLowerCase();
      if (urlLower.includes("instagram")) platform = "Instagram";
      else if (urlLower.includes("facebook")) platform = "Facebook";
      else if (urlLower.includes("youtube")) platform = "YouTube";
      else if (urlLower.includes("tiktok")) platform = "TikTok";
      else if (urlLower.includes("twitter")) platform = "Twitter";
      else platform = "Unknown";

      await db.copyrightMatch.create({
        data: {
          contentId: newContent.id,
          matchedUrl: url,
          platform,
          similarity,
          status: similarity >= 75 ? "pending" : "reviewed",
        },
      });
    }

    // Re-fetch with matches
    const result = await db.copyrightContent.findUnique({
      where: { id: newContent.id },
      include: { matches: true },
    });

    return NextResponse.json(result);
})

// PATCH /api/copyright — update content or match status
export const PATCH = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Request validation failed", 400);
  const { contentId, matchId, status } = parsed.data;

  if (contentId) {
    const owned = await db.copyrightContent.findFirst({
      where: { id: contentId, userId: user.id },
      select: { id: true },
    });
    if (!owned) return errorResponse("Content not found", 404);
    const updated = await db.copyrightContent.update({
      where: { id: contentId },
      data: { status, lastScanned: new Date() },
      include: { matches: true },
    });
    return NextResponse.json(updated);
  }

  if (matchId) {
    const owned = await db.copyrightMatch.findFirst({
      where: { id: matchId, content: { userId: user.id } },
      select: { id: true },
    });
    if (!owned) return errorResponse("Match not found", 404);
    const updated = await db.copyrightMatch.update({
      where: { id: matchId },
      data: { status },
    });
    return NextResponse.json(updated);
  }

  return errorResponse("contentId or matchId is required", 400);
})

// DELETE /api/copyright?id=xxx — unregister the caller's content
export const DELETE = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return errorResponse("id query parameter is required", 400);

  const owned = await db.copyrightContent.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!owned) return errorResponse("Content not found", 404);

  await db.copyrightMatch.deleteMany({ where: { contentId: id } });
  await db.copyrightContent.delete({ where: { id } });
  return NextResponse.json({ success: true });
})
