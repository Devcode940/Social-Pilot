import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { tryCatch, validateBody, errorResponse } from "@/lib/api-helpers";

const postStatus = z.enum(["draft", "scheduled", "published", "failed"]);

const createPostSchema = z.object({
  platforms: z.string().trim().min(1).max(500),
  content: z.string().trim().min(1).max(10000),
  accountId: z.string().min(1).max(64).optional(),
  mediaUrl: z.string().trim().max(2048).optional(),
  mediaType: z.string().trim().max(64).optional(),
  status: postStatus.optional(),
  scheduledAt: z.string().datetime({ offset: true }).optional().nullable(),
});

const updatePostSchema = z.object({
  id: z.string().min(1),
  platforms: z.string().trim().min(1).max(500).optional(),
  content: z.string().trim().min(1).max(10000).optional(),
  accountId: z.string().min(1).max(64).optional().nullable(),
  status: postStatus.optional(),
  scheduledAt: z.string().datetime({ offset: true }).optional().nullable(),
});

const postInclude = {
  account: {
    select: {
      id: true,
      platform: true,
      username: true,
      displayName: true,
      avatar: true,
    },
  },
  tags: true,
} as const;

export const GET = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const posts = await db.post.findMany({
    where: { userId: user.id, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    include: postInclude,
  });

  return NextResponse.json(posts);
});

export const POST = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const validation = await validateBody(request, createPostSchema);
  if (!validation.success) return validation.response;
  const { platforms, content, accountId, mediaUrl, mediaType, status, scheduledAt } =
    validation.data;

  // The target account (if any) must belong to the caller.
  if (accountId) {
    const account = await db.socialAccount.findFirst({
      where: { id: accountId, userId: user.id },
      select: { id: true },
    });
    if (!account) return errorResponse("Account not found", 404);
  }

  const post = await db.post.create({
    data: {
      userId: user.id,
      accountId: accountId ?? null,
      platforms,
      content,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      status: status || "draft",
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    },
    include: postInclude,
  });

  return NextResponse.json(post, { status: 201 });
});

export const PUT = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const validation = await validateBody(request, updatePostSchema);
  if (!validation.success) return validation.response;
  const { id, content, platforms, accountId, status, scheduledAt } = validation.data;

  const existing = await db.post.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return errorResponse("Post not found", 404);

  if (accountId) {
    const account = await db.socialAccount.findFirst({
      where: { id: accountId, userId: user.id },
      select: { id: true },
    });
    if (!account) return errorResponse("Account not found", 404);
  }

  const post = await db.post.update({
    where: { id },
    data: {
      ...(content !== undefined && { content }),
      ...(platforms !== undefined && { platforms }),
      ...(accountId !== undefined && { accountId }),
      ...(status !== undefined && { status }),
      ...(scheduledAt !== undefined && {
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      }),
    },
    include: postInclude,
  });

  return NextResponse.json(post);
});

export const DELETE = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return errorResponse("Post id is required", 400);

  const existing = await db.post.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return errorResponse("Post not found", 404);

  // Delete dependents explicitly (PostTag has no DB-level cascade guarantee).
  await db.postTag.deleteMany({ where: { postId: id } });
  await db.comment.deleteMany({ where: { postId: id } });
  await db.post.delete({ where: { id } });

  return NextResponse.json({ success: true });
});
