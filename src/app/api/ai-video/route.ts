import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import ZAI from "z-ai-web-dev-sdk";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import crypto from "crypto";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import {
  tryCatch,
  validateBody,
  errorResponse,
  rateLimitByUser,
  rateLimitExceededResponse,
} from "@/lib/api-helpers";
import { UPLOAD_DIR } from "@/lib/uploads";

const aiVideoSchema = z.object({
  prompt: z.string().trim().min(1).max(1000),
  style: z.string().trim().max(100).optional(),
  format: z.string().trim().max(16).optional(),
  duration: z.coerce.number().int().min(1).max(600).optional(),
  settings: z
    .object({
      resolution: z.string().trim().max(32).optional(),
      model: z.string().trim().max(64).optional(),
      music: z.boolean().optional(),
      voiceover: z.boolean().optional(),
      watermark: z.boolean().optional(),
    })
    .optional(),
});

export const POST = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const validation = await validateBody(request, aiVideoSchema);
  if (!validation.success) return validation.response;
  const { prompt, style, format, duration = 30 } = validation.data;

  const limiter = rateLimitByUser(request, user.id, {
    maxRequests: 10,
    windowSeconds: 3600,
  });
  if (!limiter.allowed) return rateLimitExceededResponse(limiter);

  // NOTE: this endpoint generates a concept-art thumbnail (still image), not
  // a rendered video. It is labeled and stored as such.
  const imagePrompt = [
    prompt,
    style ? `in ${style} style` : "",
    "professional video thumbnail concept art",
    "cinematic lighting",
    "high quality",
    "detailed",
  ]
    .filter(Boolean)
    .join(", ");

  const zai = await ZAI.create();
  const response = await zai.images.generations.create({
    prompt: imagePrompt,
    size: "1024x1024",
  });

  const base64Image = response.data?.[0]?.base64;
  if (!base64Image) {
    return errorResponse("AI image generation returned no image data.", 500);
  }

  // Persist the file to disk (never store multi-MB base64 blobs in the DB).
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `concept-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.png`;
  await writeFile(join(UPLOAD_DIR, filename), Buffer.from(base64Image, "base64"));
  const thumbnailUrl = `/uploads/${filename}`;

  const name = `AI Concept: ${prompt.slice(0, 50)}${prompt.length > 50 ? "..." : ""}`;

  const mediaProject = await db.mediaProject.create({
    data: {
      userId: user.id,
      name,
      type: "video",
      status: "concept",
      duration,
      thumbnail: thumbnailUrl,
    },
  });

  return NextResponse.json({
    id: mediaProject.id,
    name: mediaProject.name,
    thumbnail: mediaProject.thumbnail,
    status: mediaProject.status,
    format: format || "mp4",
    duration,
  });
});
