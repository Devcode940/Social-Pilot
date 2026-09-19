import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";

// ─── tryCatch Wrapper ─────────────────────────────────────────────────────────
// Wraps an async handler to standardize error responses.
// All errors use the shape: { error: string } (+ optional details).

type ApiHandler = (
  request: NextRequest
) => Promise<NextResponse> | NextResponse;

export function tryCatch(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest) => {
    try {
      return await handler(request);
    } catch (error) {
      console.error("[API Error]", error);

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: "Validation error",
            details: error.issues.map((e) => ({
              path: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }

      if (error instanceof SyntaxError) {
        return NextResponse.json(
          { error: "Invalid JSON in request body" },
          { status: 400 }
        );
      }

      const message =
        error instanceof Error ? error.message : "Internal server error";

      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

// ─── validateBody ─────────────────────────────────────────────────────────────
// Validates request body against a Zod schema

export async function validateBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
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

    return { success: true, data: result.data };
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid or missing JSON body" },
        { status: 400 }
      ),
    };
  }
}

// ─── withAuth ─────────────────────────────────────────────────────────────────
// Higher-order function that requires a valid NextAuth session before
// proceeding. The authenticated user's id/email are passed to the handler.
// NOTE: sessions are the accepted credential, except in temporary demo mode
// (AUTH_BYPASS=true, dev only) where requireUser() returns the demo user.

type ProtectedHandler = (
  request: NextRequest,
  session: { userId: string; email: string }
) => Promise<NextResponse> | NextResponse;

export function withAuth(handler: ProtectedHandler): ApiHandler {
  return async (request: NextRequest) => {
    try {
      const user = await requireUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      return await handler(request, { userId: user.id, email: user.email });
    } catch (error) {
      console.error("[Auth Error]", error);
      return NextResponse.json(
        { error: "Authentication check failed" },
        { status: 500 }
      );
    }
  };
}

// ─── rateLimit ────────────────────────────────────────────────────────────────
// Simple in-memory rate limiter (map of key -> count).
// NOTE: per-process state; use Redis/Upstash for multi-instance deployments.
// Stale entries are cleaned lazily (no module-scope timers, serverless-safe).

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
let lastCleanupAt = 0;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function cleanupRateLimitStore(now: number): void {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitOptions {
  /** Maximum number of requests in the window (default: 60) */
  maxRequests?: number;
  /** Window duration in seconds (default: 60) */
  windowSeconds?: number;
  /** Custom identifier (defaults to IP address) */
  identifier?: string;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of remaining requests in the current window */
  remaining: number;
  /** Unix timestamp when the rate limit resets */
  resetAt: number;
  /** Total limit for the window */
  limit: number;
}

export function rateLimit(
  request: NextRequest,
  options: RateLimitOptions = {}
): RateLimitResult {
  const {
    maxRequests = 60,
    windowSeconds = 60,
    identifier,
  } = options;

  const now = Date.now();
  cleanupRateLimitStore(now);

  // Determine identifier: custom or IP-based
  let key: string;
  if (identifier) {
    key = identifier;
  } else {
    // Try to get real IP from headers (reverse proxy friendly)
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";
    key = ip;
  }

  const windowMs = windowSeconds * 1000;

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    // Create new window
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, newEntry);

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: newEntry.resetAt,
      limit: maxRequests,
    };
  }

  // Increment count in existing window
  entry.count += 1;

  if (entry.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      limit: maxRequests,
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
    limit: maxRequests,
  };
}

/** Convenience: rate-limit by authenticated user id (or IP when logged out). */
export function rateLimitByUser(
  request: NextRequest,
  userId: string | null,
  options: RateLimitOptions = {}
): RateLimitResult {
  if (userId) {
    return rateLimit(request, { ...options, identifier: `user:${userId}` });
  }
  return rateLimit(request, options);
}

/** Build a standard 429 response from a denied RateLimitResult. */
export function rateLimitExceededResponse(limiter: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: "Rate limit exceeded. Please try again later.",
      resetAt: limiter.resetAt,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((limiter.resetAt - Date.now()) / 1000)),
      },
    }
  );
}

// ─── successResponse / errorResponse Helpers ──────────────────────────────────
// Standard envelope: { success: true, data } / { error }.

export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(
  message: string,
  status: number = 500,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

// ─── Common Schemas ───────────────────────────────────────────────────────────

export const schedulerBodySchema = z.object({
  type: z.enum(["process_scheduled_posts", "process_campaigns", "check_trends"]),
});

export const paginationSchema = z.object({
  take: z.coerce.number().int().min(1).max(100).optional(),
});
