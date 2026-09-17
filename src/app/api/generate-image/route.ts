import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import ZAI from "z-ai-web-dev-sdk";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import crypto from "crypto";
import sharp from "sharp";
import { requireUser } from "@/lib/auth-helpers";
import {
  tryCatch,
  validateBody,
  errorResponse,
  rateLimitByUser,
  rateLimitExceededResponse,
} from "@/lib/api-helpers";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

const VALID_SIZES = [
  "1024x1024",
  "768x1344",
  "864x1152",
  "1344x768",
  "1152x864",
  "1440x720",
  "720x1440",
] as const;

const generateImageSchema = z.object({
  prompt: z.string().trim().min(1).max(1000),
  size: z.enum(VALID_SIZES).optional(),
});

export const POST = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const validation = await validateBody(request, generateImageSchema);
  if (!validation.success) return validation.response;
  const { prompt, size } = validation.data;

  // Image generation is expensive — strict per-user budget.
  const limiter = rateLimitByUser(request, user.id, {
    maxRequests: 10,
    windowSeconds: 3600,
  });
  if (!limiter.allowed) return rateLimitExceededResponse(limiter);

  await mkdir(UPLOAD_DIR, { recursive: true });

  const zai = await ZAI.create();
  const response = await zai.images.generations.create({
    prompt: prompt.trim(),
    size: size || "1024x1024",
  });

  const base64Image = response.data?.[0]?.base64;
  if (!base64Image) {
    return errorResponse("AI image generation returned no image data.", 500);
  }

  // Unpredictable filename (timestamp + cryptographic random).
  const filename = `ai-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.png`;
  const filePath = join(UPLOAD_DIR, filename);

  const buffer = Buffer.from(base64Image, "base64");
  await writeFile(filePath, buffer);

  // Create thumbnail (best effort)
  const thumbFilename = `thumb-${filename}`;
  const thumbPath = join(UPLOAD_DIR, thumbFilename);
  try {
    await sharp(buffer).resize(300, 300, { fit: "cover" }).toFile(thumbPath);
  } catch (err) {
    console.error("Thumbnail creation failed for AI image:", err);
  }

  return NextResponse.json({
    url: `/uploads/${filename}`,
    thumbnail: `/uploads/${thumbFilename}`,
    name: `AI: ${prompt.slice(0, 50)}${prompt.length > 50 ? "..." : ""}`,
    size: buffer.length,
    type: "image",
  });
});
