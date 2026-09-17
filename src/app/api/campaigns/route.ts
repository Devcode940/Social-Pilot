import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { tryCatch, validateBody, errorResponse } from "@/lib/api-helpers";

const campaignType = z.enum(["like", "follow", "comment", "view"]);
const campaignStatus = z.enum(["active", "paused", "completed"]);

const createCampaignSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: campaignType,
  platforms: z.string().trim().min(1).max(500),
  targetCount: z.coerce.number().int().min(1).max(10_000_000).optional(),
  rules: z.unknown().optional(),
});

const updateCampaignSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(200).optional(),
  status: campaignStatus.optional(),
  currentCount: z.coerce.number().int().min(0).max(10_000_000).optional(),
  targetCount: z.coerce.number().int().min(1).max(10_000_000).optional(),
});

export const GET = tryCatch(async () => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const campaigns = await db.campaign.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(campaigns);
});

export const POST = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const validation = await validateBody(request, createCampaignSchema);
  if (!validation.success) return validation.response;
  const { name, type, platforms, targetCount, rules } = validation.data;

  const campaign = await db.campaign.create({
    data: {
      userId: user.id,
      name,
      type,
      platforms,
      targetCount: targetCount || 100,
      rules: rules !== undefined ? JSON.stringify(rules).slice(0, 10000) : null,
    },
  });

  return NextResponse.json(campaign, { status: 201 });
});

export const PATCH = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const validation = await validateBody(request, updateCampaignSchema);
  if (!validation.success) return validation.response;
  const { id, ...fields } = validation.data;

  const existing = await db.campaign.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return errorResponse("Campaign not found", 404);

  const campaign = await db.campaign.update({
    where: { id },
    data: {
      ...(fields.name !== undefined && { name: fields.name }),
      ...(fields.status !== undefined && { status: fields.status }),
      ...(fields.currentCount !== undefined && {
        currentCount: fields.currentCount,
      }),
      ...(fields.targetCount !== undefined && {
        targetCount: fields.targetCount,
      }),
    },
  });

  return NextResponse.json(campaign);
});

export const DELETE = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return errorResponse("Campaign id is required", 400);

  const existing = await db.campaign.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return errorResponse("Campaign not found", 404);

  await db.campaign.delete({ where: { id } });

  return NextResponse.json({ success: true });
});
