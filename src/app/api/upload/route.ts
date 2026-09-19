import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import crypto from "crypto";
import { requireUser } from "@/lib/auth-helpers";
import {
  tryCatch,
  errorResponse,
  rateLimitByUser,
  rateLimitExceededResponse,
} from "@/lib/api-helpers";
import { UPLOAD_DIR } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/upload — multipart user-media upload for the poster.
// Extension is derived from the validated MIME type, never from the client
// filename. Filenames are timestamp + cryptographic random (unpredictable,
// collision-proof).

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

const MAX_FILE_BYTES = 50 * 1024 * 1024;

export const POST = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  if (!user) return errorResponse("Unauthorized", 401);

  const limiter = rateLimitByUser(request, user.id, {
    maxRequests: 20,
    windowSeconds: 60,
  });
  if (!limiter.allowed) return rateLimitExceededResponse(limiter);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse("Invalid multipart body", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return errorResponse("Field 'file' is required", 400);
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return errorResponse(
      `Unsupported file type: ${file.type || "unknown"}`,
      400
    );
  }
  if (file.size <= 0) return errorResponse("Empty file", 400);
  if (file.size > MAX_FILE_BYTES) {
    return errorResponse("File too large (max 50MB)", 400);
  }

  const filename = `upload-${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(UPLOAD_DIR, filename), buffer);

  const isVideo = file.type.startsWith("video/");
  const url = `/uploads/${filename}`;
  return NextResponse.json({
    url,
    thumbnail: isVideo ? "" : url,
    type: isVideo ? "video" : "image",
    size: file.size,
    name: file.name.slice(0, 128),
  });
});
