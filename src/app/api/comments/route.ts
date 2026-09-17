import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import {
  tryCatch,
  validateBody,
  errorResponse,
  rateLimitByUser,
  rateLimitExceededResponse,
} from "@/lib/api-helpers";
import ZAI from "z-ai-web-dev-sdk";

// Bounded in-memory cache for sentiment results (content-keyed).
const sentimentCache = new Map<string, string>();
const SENTIMENT_CACHE_MAX = 1000;

function cacheSentiment(key: string, value: string): void {
  if (sentimentCache.size >= SENTIMENT_CACHE_MAX) {
    const oldest = sentimentCache.keys().next().value;
    if (oldest !== undefined) sentimentCache.delete(oldest);
  }
  sentimentCache.set(key, value);
}

const createCommentSchema = z.object({
  postId: z.string().min(1).max(64).optional(),
  author: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(5000),
  platform: z.string().trim().min(1).max(64),
});

const updateCommentSchema = z.object({
  id: z.string().min(1),
  isRead: z.boolean().optional(),
  isReplied: z.boolean().optional(),
  reply: z.string().trim().max(5000).optional().nullable(),
  sentiment: z.string().trim().max(32).optional().nullable(),
  archived: z.boolean().optional(),
});

const analyzeSchema = z.object({
  action: z.literal("analyze"),
  // Optional explicit list; defaults to the caller's un-analyzed comments.
  commentIds: z.array(z.string().min(1)).max(25).optional(),
});

const commentInclude = {
  post: { select: { id: true, content: true, platforms: true } },
} as const;

export const GET = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const isRead = searchParams.get("isRead");

  // Pure read: only comments on the caller's own posts. (Sentiment analysis
  // is a paid write operation — see POST { action: "analyze" }.)
  const comments = await db.comment.findMany({
    where: {
      post: { userId: user.id },
      ...(isRead !== null ? { isRead: isRead === "true" } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: commentInclude,
  });

  return NextResponse.json(comments);
});

export const POST = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const rawBody: unknown = await request.json();

  // ── Action: batch sentiment analysis (paid AI — explicit POST only) ──
  if (
    typeof rawBody === "object" &&
    rawBody !== null &&
    (rawBody as Record<string, unknown>).action === "analyze"
  ) {
    const parsed = analyzeSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Request validation failed" },
        { status: 400 }
      );
    }

    const limiter = rateLimitByUser(request, user.id, {
      maxRequests: 10,
      windowSeconds: 300,
    });
    if (!limiter.allowed) return rateLimitExceededResponse(limiter);

    const pending = await db.comment.findMany({
      where: {
        post: { userId: user.id },
        sentiment: null,
        archived: false,
        ...(parsed.data.commentIds
          ? { id: { in: parsed.data.commentIds } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    let analyzed = 0;
    for (const comment of pending) {
      try {
        const sentiment = await analyzeCommentSentiment(comment.content);
        await db.comment.update({
          where: { id: comment.id },
          data: { sentiment },
        });
        analyzed += 1;
      } catch (err) {
        console.error(
          `Failed to analyze sentiment for comment ${comment.id}:`,
          err
        );
      }
    }

    const updated = await db.comment.findMany({
      where: { post: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      include: commentInclude,
    });
    return NextResponse.json({ analyzed, comments: updated });
  }

  // ── Default: create a comment on one of the caller's posts ──
  const parsed = createCommentSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Request validation failed",
        details: parsed.error.issues.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
      { status: 400 }
    );
  }
  const { postId, author, content, platform } = parsed.data;

  let targetPostId = postId;
  if (!targetPostId) {
    const latestPost = await db.post.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    targetPostId = latestPost?.id;
  } else {
    const owned = await db.post.findFirst({
      where: { id: targetPostId, userId: user.id },
      select: { id: true },
    });
    if (!owned) return errorResponse("Post not found", 404);
  }

  if (!targetPostId) {
    return errorResponse("No post found to attach comment to", 400);
  }

  const comment = await db.comment.create({
    data: { postId: targetPostId, author, content, platform },
  });

  return NextResponse.json(comment, { status: 201 });
});

export const PATCH = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const validation = await validateBody(request, updateCommentSchema);
  if (!validation.success) return validation.response;
  const { id, ...fields } = validation.data;

  const existing = await db.comment.findFirst({
    where: { id, post: { userId: user.id } },
    select: { id: true },
  });
  if (!existing) return errorResponse("Comment not found", 404);

  const comment = await db.comment.update({
    where: { id },
    data: {
      ...(fields.isRead !== undefined && { isRead: fields.isRead }),
      ...(fields.isReplied !== undefined && { isReplied: fields.isReplied }),
      ...(fields.reply !== undefined && { reply: fields.reply }),
      ...(fields.sentiment !== undefined && { sentiment: fields.sentiment }),
      ...(fields.archived !== undefined && { archived: fields.archived }),
    },
  });

  return NextResponse.json(comment);
});

export const DELETE = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return errorResponse("Comment id is required", 400);

  const existing = await db.comment.findFirst({
    where: { id, post: { userId: user.id } },
    select: { id: true },
  });
  if (!existing) return errorResponse("Comment not found", 404);

  await db.comment.delete({ where: { id } });

  return NextResponse.json({ success: true });
});

// ── Helper: AI Sentiment Analysis ──

type Sentiment = "positive" | "negative" | "neutral" | "question";

async function analyzeCommentSentiment(content: string): Promise<Sentiment> {
  const cacheKey = `sentiment:${content.slice(0, 200)}`;
  const cached = sentimentCache.get(cacheKey);
  if (cached) return cached as Sentiment;

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a sentiment analysis engine for social media comments. Classify each comment into exactly ONE of these categories:
- "positive": praise, compliments, gratitude, excitement, love, support
- "negative": complaints, criticism, frustration, anger, disappointment
- "neutral": statements of fact with no clear emotion
- "question": the comment asks a question or seeks information (even if the tone is positive or negative)

Respond with ONLY ONE word: positive, negative, neutral, or question. Nothing else.`,
        },
        {
          role: "user",
          content: `Classify this comment: "${content.slice(0, 2000)}"`,
        },
      ],
    });

    const result =
      completion.choices?.[0]?.message?.content?.trim().toLowerCase() ?? "neutral";

    let sentiment: Sentiment = "neutral";
    if (result.includes("positive")) sentiment = "positive";
    else if (result.includes("negative")) sentiment = "negative";
    else if (result.includes("question")) sentiment = "question";

    cacheSentiment(cacheKey, sentiment);
    return sentiment;
  } catch (error) {
    console.error("Sentiment analysis failed:", error);
    return "neutral";
  }
}
