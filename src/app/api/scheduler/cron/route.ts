import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isValidCronSecret } from "@/lib/auth-helpers";
import {
  tryCatch,
  errorResponse,
  rateLimit,
  rateLimitExceededResponse,
} from "@/lib/api-helpers";
import {
  runSchedulerJob,
  type SchedulerJobType,
} from "@/lib/scheduler";
import { pruneUploads } from "@/lib/uploads";

// ─── Cron Endpoint ───────────────────────────────────────────────────────────
// Callable by external cron services (e.g. cron-job.org) presenting the shared
// CRON_SECRET via header `x-cron-secret` or `?secret=`, or by a logged-in user
// (dashboard "run now" buttons). Runs all job types and audits each outcome.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALL_JOBS: SchedulerJobType[] = [
  "process_scheduled_posts",
  "process_campaigns",
  "check_trends",
];

export const GET = tryCatch(async (request: NextRequest) => {
  const user = await requireUser();
  const viaSecret = isValidCronSecret(request);

  if (!user && !viaSecret) {
    return errorResponse("Unauthorized", 401);
  }
  // IP cap (generous: external cron polls every 1–15 min; floods abort here).
  const limiter = rateLimit(request, { maxRequests: 30, windowSeconds: 60 });
  if (!limiter.allowed) return rateLimitExceededResponse(limiter);

  const triggeredBy = user ? `cron:session:${user.email}` : "cron:secret";

  const now = new Date();
  const details: Array<{ type: string; processed: number; message: string }> =
    [];

  for (const type of ALL_JOBS) {
    try {
      const result = await runSchedulerJob(type, triggeredBy);
      details.push({
        type,
        processed: result.processed,
        message: `${type}: ${result.processed} item(s) processed`,
      });
    } catch (jobError) {
      console.error(`[Scheduler Cron] job ${type} failed:`, jobError);
      await db.scheduledJob.create({
        data: {
          type,
          payload: JSON.stringify({ triggeredBy }),
          runAt: now,
          status: "failed",
          result: JSON.stringify({
            error:
              jobError instanceof Error ? jobError.message : "Unknown error",
          }),
        },
      });
      details.push({
        type,
        processed: 0,
        message: `${type}: failed`,
      });
    }
  }

  // Retention sweep for generated/uploaded files. Throttled to at most once
  // per 24h via the audit log — cheap check, runs inside the normal tick.
  const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;
  const retentionDays = Math.max(
    1,
    Number(process.env.UPLOAD_RETENTION_DAYS ?? 30) || 30
  );
  try {
    const lastPrune = await db.scheduledJob.findFirst({
      where: { type: "prune_uploads", status: "completed" },
      orderBy: { runAt: "desc" },
      select: { runAt: true },
    });
    if (
      !lastPrune ||
      now.getTime() - lastPrune.runAt.getTime() > PRUNE_INTERVAL_MS
    ) {
      const prune = await pruneUploads(retentionDays);
      await db.scheduledJob.create({
        data: {
          type: "prune_uploads",
          payload: JSON.stringify({ triggeredBy, retentionDays }),
          runAt: now,
          status: "completed",
          result: JSON.stringify(prune),
        },
      });
      details.push({
        type: "prune_uploads",
        processed: prune.deleted,
        message: `prune_uploads: ${prune.deleted} file(s) deleted, ${prune.freedBytes} bytes freed`,
      });
    }
  } catch (pruneError) {
    console.error("[Scheduler Cron] prune_uploads failed:", pruneError);
    details.push({
      type: "prune_uploads",
      processed: 0,
      message: "prune_uploads: failed",
    });
  }

  const totalProcessed = details.reduce((sum, d) => sum + d.processed, 0);

  return NextResponse.json({
    success: true,
    message: "Scheduler cron completed successfully",
    timestamp: now.toISOString(),
    totalProcessed,
    details,
  });
});
