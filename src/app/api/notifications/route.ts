import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { tryCatch, validateBody, errorResponse, rateLimitByUser, rateLimitExceededResponse } from "@/lib/api-helpers";

const createNotificationSchema = z.object({
  type: z.string().trim().min(1).max(64).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  message: z.string().trim().max(2000).optional(),
  link: z.string().trim().max(2048).optional(),
});

const markReadSchema = z.object({
  ids: z.array(z.string().min(1)).max(100).optional(),
  all: z.boolean().optional(),
});

export const GET = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const limiter = rateLimitByUser(request, user.id, { maxRequests: 60, windowSeconds: 60 });
  if (!limiter.allowed) return rateLimitExceededResponse(limiter);

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  const notifications = await db.notification.findMany({
    where: {
      userId: user.id,
      ...(unreadOnly && { read: false }),
    },
    orderBy: { createdAt: "desc" },
    take: unreadOnly ? 50 : 20,
  });

  const unreadCount = await db.notification.count({
    where: { userId: user.id, read: false },
  });

  return NextResponse.json({ notifications, unreadCount });
});

export const POST = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const limiter = rateLimitByUser(request, user.id, { maxRequests: 60, windowSeconds: 60 });
  if (!limiter.allowed) return rateLimitExceededResponse(limiter);

  const validation = await validateBody(request, createNotificationSchema);
  if (!validation.success) return validation.response;
  const { type, title, message, link } = validation.data;

  const notification = await db.notification.create({
    data: {
      userId: user.id,
      type: type || "system",
      title: title || "Notification",
      message: message || "",
      link: link || null,
    },
  });

  return NextResponse.json({ notification }, { status: 201 });
});

export const PATCH = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const limiter = rateLimitByUser(request, user.id, { maxRequests: 60, windowSeconds: 60 });
  if (!limiter.allowed) return rateLimitExceededResponse(limiter);

  const validation = await validateBody(request, markReadSchema);
  if (!validation.success) return validation.response;
  const { ids, all } = validation.data;

  if (all) {
    await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return NextResponse.json({
      success: true,
      message: "All notifications marked as read",
    });
  }

  if (ids && ids.length > 0) {
    // Scoped to the caller's own notifications (no cross-user writes).
    await db.notification.updateMany({
      where: { id: { in: ids }, userId: user.id },
      data: { read: true },
    });
    return NextResponse.json({
      success: true,
      message: `${ids.length} notifications marked as read`,
    });
  }

  return errorResponse("Provide ids or all", 400);
});
