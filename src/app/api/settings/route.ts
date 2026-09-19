import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, maskSecret } from "@/lib/auth-helpers";
import { tryCatch, errorResponse, rateLimitByUser, rateLimitExceededResponse } from "@/lib/api-helpers";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(128).optional(),
  bio: z.string().trim().max(1000).optional().nullable(),
  timezone: z.string().trim().min(1).max(64).optional(),
});

const notificationsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  postPublishedNotify: z.boolean().optional(),
  commentAlerts: z.boolean().optional(),
  campaignCompletion: z.boolean().optional(),
  weeklyAnalyticsDigest: z.boolean().optional(),
  trendAlerts: z.boolean().optional(),
});

const appearanceSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  compactMode: z.boolean().optional(),
  sidebarDefaultExpanded: z.boolean().optional(),
});

const apiKeySchema = z.object({
  label: z.string().trim().min(1).max(128),
  key: z.string().trim().min(8).max(4096),
});

const deleteApiKeySchema = z.object({
  id: z.string().min(1),
});

const DEFAULT_SETTINGS = {
  emailNotifications: true,
  pushNotifications: true,
  postPublishedNotify: true,
  commentAlerts: true,
  campaignCompletion: true,
  weeklyAnalyticsDigest: true,
  trendAlerts: false,
  theme: "system",
  compactMode: false,
  sidebarDefaultExpanded: true,
};

function parseSection<T>(schema: z.ZodType<T>, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "Request validation failed",
          details: result.error.issues.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      ),
    };
  }
  return { ok: true as const, data: result.data };
}

export const GET = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const limiter = rateLimitByUser(request, user.id, { maxRequests: 60, windowSeconds: 60 });
  if (!limiter.allowed) return rateLimitExceededResponse(limiter);

  const [profile, settings, apiKeys] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        timezone: true,
      },
    }),
    db.userSettings.findUnique({ where: { userId: user.id } }),
    db.apiKey.findMany({
      where: { userId: user.id },
      select: { id: true, label: true, key: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!profile) return errorResponse("User not found", 404);

  return NextResponse.json({
    user: profile,
    settings: settings || DEFAULT_SETTINGS,
    // Stored keys are never returned in full — only a masked preview.
    // Copy the value when you create it; it can't be retrieved later.
    apiKeys: apiKeys.map((k) => ({
      id: k.id,
      label: k.label,
      keyPreview: maskSecret(k.key),
      createdAt: k.createdAt,
    })),
  });
});

export const POST = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const limiter = rateLimitByUser(request, user.id, { maxRequests: 60, windowSeconds: 60 });
  if (!limiter.allowed) return rateLimitExceededResponse(limiter);

  const body = await request.json();
  const { section, ...data } = body as { section?: string } & Record<
    string,
    unknown
  >;

  // Update profile
  if (section === "profile") {
    const parsed = parseSection(profileSchema, data);
    if (!parsed.ok) return parsed.response;

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.bio !== undefined && { bio: parsed.data.bio }),
        ...(parsed.data.timezone !== undefined && {
          timezone: parsed.data.timezone,
        }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        timezone: true,
      },
    });
    return NextResponse.json({ user: updatedUser });
  }

  // Update notification preferences
  if (section === "notifications") {
    const parsed = parseSection(notificationsSchema, data);
    if (!parsed.ok) return parsed.response;
    const d = parsed.data;

    const settings = await db.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        emailNotifications: d.emailNotifications ?? true,
        pushNotifications: d.pushNotifications ?? true,
        postPublishedNotify: d.postPublishedNotify ?? true,
        commentAlerts: d.commentAlerts ?? true,
        campaignCompletion: d.campaignCompletion ?? true,
        weeklyAnalyticsDigest: d.weeklyAnalyticsDigest ?? true,
        trendAlerts: d.trendAlerts ?? false,
      },
      update: {
        ...(d.emailNotifications !== undefined && {
          emailNotifications: d.emailNotifications,
        }),
        ...(d.pushNotifications !== undefined && {
          pushNotifications: d.pushNotifications,
        }),
        ...(d.postPublishedNotify !== undefined && {
          postPublishedNotify: d.postPublishedNotify,
        }),
        ...(d.commentAlerts !== undefined && { commentAlerts: d.commentAlerts }),
        ...(d.campaignCompletion !== undefined && {
          campaignCompletion: d.campaignCompletion,
        }),
        ...(d.weeklyAnalyticsDigest !== undefined && {
          weeklyAnalyticsDigest: d.weeklyAnalyticsDigest,
        }),
        ...(d.trendAlerts !== undefined && { trendAlerts: d.trendAlerts }),
      },
    });
    return NextResponse.json({ settings });
  }

  // Update appearance settings
  if (section === "appearance") {
    const parsed = parseSection(appearanceSchema, data);
    if (!parsed.ok) return parsed.response;
    const d = parsed.data;

    const settings = await db.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        theme: d.theme ?? "system",
        compactMode: d.compactMode ?? false,
        sidebarDefaultExpanded: d.sidebarDefaultExpanded ?? true,
      },
      update: {
        ...(d.theme !== undefined && { theme: d.theme }),
        ...(d.compactMode !== undefined && { compactMode: d.compactMode }),
        ...(d.sidebarDefaultExpanded !== undefined && {
          sidebarDefaultExpanded: d.sidebarDefaultExpanded,
        }),
      },
    });
    return NextResponse.json({ settings });
  }

  // Add API key (stored value is only ever shown masked afterwards)
  if (section === "apiKey") {
    const parsed = parseSection(apiKeySchema, data);
    if (!parsed.ok) return parsed.response;

    const apiKey = await db.apiKey.create({
      data: { userId: user.id, label: parsed.data.label, key: parsed.data.key },
    });
    return NextResponse.json(
      {
        apiKey: {
          id: apiKey.id,
          label: apiKey.label,
          keyPreview: maskSecret(apiKey.key),
          createdAt: apiKey.createdAt,
        },
      },
      { status: 201 }
    );
  }

  // Delete API key (ownership enforced)
  if (section === "deleteApiKey") {
    const parsed = parseSection(deleteApiKeySchema, data);
    if (!parsed.ok) return parsed.response;

    const deleted = await db.apiKey.deleteMany({
      where: { id: parsed.data.id, userId: user.id },
    });
    if (deleted.count === 0) return errorResponse("API key not found", 404);
    return NextResponse.json({ success: true });
  }

  return errorResponse("Invalid section", 400);
});

export const DELETE = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const limiter = rateLimitByUser(request, user.id, { maxRequests: 60, windowSeconds: 60 });
  if (!limiter.allowed) return rateLimitExceededResponse(limiter);

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "deleteAccount") {
    // Permanently delete the caller's account and ALL of their data.
    const userId = user.id;
    await db.$transaction([
      db.notification.deleteMany({ where: { userId } }),
      db.apiKey.deleteMany({ where: { userId } }),
      db.userSettings.deleteMany({ where: { userId } }),
      db.comment.deleteMany({ where: { post: { userId } } }),
      db.postTag.deleteMany({ where: { post: { userId } } }),
      db.post.deleteMany({ where: { userId } }),
      db.socialAccount.deleteMany({ where: { userId } }),
      db.campaign.deleteMany({ where: { userId } }),
      db.competitor.deleteMany({ where: { userId } }),
      db.hashtagSet.deleteMany({ where: { userId } }),
      db.trendResult.deleteMany({ where: { userId } }),
      db.copyrightMatch.deleteMany({ where: { content: { userId } } }),
      db.copyrightContent.deleteMany({ where: { userId } }),
      db.mediaProject.deleteMany({ where: { userId } }),
      db.user.delete({ where: { id: userId } }),
    ]);
    return NextResponse.json({
      success: true,
      message: "Account and all associated data deleted",
    });
  }

  if (action === "clearData") {
    // Delete the caller's content (posts, comments, campaigns, notifications).
    // Connected accounts and settings are kept.
    const userId = user.id;
    await db.$transaction([
      db.comment.deleteMany({ where: { post: { userId } } }),
      db.postTag.deleteMany({ where: { post: { userId } } }),
      db.post.deleteMany({ where: { userId } }),
      db.campaign.deleteMany({ where: { userId } }),
      db.notification.deleteMany({ where: { userId } }),
    ]);
    return NextResponse.json({ success: true, message: "All data cleared" });
  }

  return errorResponse("Invalid action", 400);
});
