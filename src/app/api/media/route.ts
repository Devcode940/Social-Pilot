import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { tryCatch, validateBody, errorResponse, rateLimitByUser, rateLimitExceededResponse } from "@/lib/api-helpers";

const mediaStatus = z.enum(["editing", "exported"]);

const createMediaSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.string().trim().min(1).max(64).optional(),
  sourceUrl: z.string().trim().max(2048).optional().nullable(),
  duration: z.coerce.number().min(0).max(86400).optional().nullable(),
  thumbnail: z.string().max(10_000_000).optional().nullable(),
});

const updateMediaSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(200).optional(),
  sourceUrl: z.string().trim().max(2048).optional().nullable(),
  duration: z.coerce.number().min(0).max(86400).optional().nullable(),
  status: mediaStatus.optional(),
  thumbnail: z.string().max(10_000_000).optional().nullable(),
});

// GET /api/media — list the caller's media projects
export const GET = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const limiter = rateLimitByUser(request, user.id, { maxRequests: 60, windowSeconds: 60 });
  if (!limiter.allowed) return rateLimitExceededResponse(limiter);

  const media = await db.mediaProject.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(media);
});

// POST /api/media — create a media project
export const POST = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const limiter = rateLimitByUser(request, user.id, { maxRequests: 60, windowSeconds: 60 });
  if (!limiter.allowed) return rateLimitExceededResponse(limiter);

  const validation = await validateBody(request, createMediaSchema);
  if (!validation.success) return validation.response;
  const { name, type, sourceUrl, duration, thumbnail } = validation.data;

  const project = await db.mediaProject.create({
    data: {
      userId: user.id,
      name,
      type: type || "video",
      sourceUrl: sourceUrl || null,
      duration: duration ?? null,
      status: "editing",
      thumbnail: thumbnail || null,
    },
  });
  return NextResponse.json(project, { status: 201 });
});

// PUT /api/media — update the caller's media project
export const PUT = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const limiter = rateLimitByUser(request, user.id, { maxRequests: 60, windowSeconds: 60 });
  if (!limiter.allowed) return rateLimitExceededResponse(limiter);

  const validation = await validateBody(request, updateMediaSchema);
  if (!validation.success) return validation.response;
  const { id, ...fields } = validation.data;

  const existing = await db.mediaProject.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return errorResponse("Media project not found", 404);

  const project = await db.mediaProject.update({
    where: { id },
    data: {
      ...(fields.name !== undefined && { name: fields.name }),
      ...(fields.sourceUrl !== undefined && { sourceUrl: fields.sourceUrl }),
      ...(fields.duration !== undefined && { duration: fields.duration }),
      ...(fields.status !== undefined && { status: fields.status }),
      ...(fields.thumbnail !== undefined && { thumbnail: fields.thumbnail }),
    },
  });
  return NextResponse.json(project);
});

// DELETE /api/media?id=xxx — delete the caller's media project
export const DELETE = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const limiter = rateLimitByUser(request, user.id, { maxRequests: 60, windowSeconds: 60 });
  if (!limiter.allowed) return rateLimitExceededResponse(limiter);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return errorResponse("Media id is required", 400);

  const existing = await db.mediaProject.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return errorResponse("Media project not found", 404);

  await db.mediaProject.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
