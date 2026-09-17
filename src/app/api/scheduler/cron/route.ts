import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, isValidCronSecret } from "@/lib/auth-helpers";
import { tryCatch, errorResponse } from "@/lib/api-helpers";
import {
  runSchedulerJob,
  type SchedulerJobType,
} from "@/lib/scheduler";

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

  const totalProcessed = details.reduce((sum, d) => sum + d.processed, 0);

  return NextResponse.json({
    success: true,
    message: "Scheduler cron completed successfully",
    timestamp: now.toISOString(),
    totalProcessed,
    details,
  });
});
