import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { tryCatch, validateBody, errorResponse } from "@/lib/api-helpers";

const createAccountSchema = z.object({
  platform: z.string().trim().min(1).max(64),
  username: z.string().trim().min(1).max(128),
  displayName: z.string().trim().max(128).optional().nullable(),
  avatar: z.string().trim().max(2048).optional().nullable(),
});

const updateAccountSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
  autoPost: z.boolean().optional(),
  displayName: z.string().trim().max(128).optional().nullable(),
  avatar: z.string().trim().max(2048).optional().nullable(),
});

export const GET = tryCatch(async () => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const accounts = await db.socialAccount.findMany({
    where: { userId: user.id },
    // NOTE: never include the full user row here — it contains the
    // password hash and API keys. Ownership is implied by the filter.
    orderBy: { connectedAt: "desc" },
  });

  return NextResponse.json(accounts);
});

export const POST = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const validation = await validateBody(request, createAccountSchema);
  if (!validation.success) return validation.response;
  const { platform, username, displayName, avatar } = validation.data;

  const duplicate = await db.socialAccount.findFirst({
    where: { userId: user.id, platform, username },
    select: { id: true },
  });
  if (duplicate) {
    return errorResponse("This account is already connected", 409);
  }

  const account = await db.socialAccount.create({
    data: {
      userId: user.id,
      platform,
      username,
      displayName: displayName || null,
      avatar: avatar || null,
    },
  });

  return NextResponse.json(account, { status: 201 });
});

export const PUT = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const validation = await validateBody(request, updateAccountSchema);
  if (!validation.success) return validation.response;
  const { id, ...data } = validation.data;

  const existing = await db.socialAccount.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return errorResponse("Account not found", 404);

  const account = await db.socialAccount.update({
    where: { id },
    data: {
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.autoPost !== undefined && { autoPost: data.autoPost }),
      ...(data.displayName !== undefined && { displayName: data.displayName }),
      ...(data.avatar !== undefined && { avatar: data.avatar }),
    },
  });

  return NextResponse.json(account);
});

export const DELETE = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  let id = searchParams.get("id");

  if (!id) {
    try {
      const body = await request.json();
      id = body.id;
    } catch {
      // no body, that's fine
    }
  }

  if (!id) return errorResponse("Account id is required", 400);

  const existing = await db.socialAccount.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) return errorResponse("Account not found", 404);

  // Detach posts from the disconnected account instead of deleting them.
  await db.post.updateMany({
    where: { accountId: id, userId: user.id },
    data: { accountId: null },
  });
  await db.socialAccount.delete({ where: { id } });

  return NextResponse.json({ success: true });
});
