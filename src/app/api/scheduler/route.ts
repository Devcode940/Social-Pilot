import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  withAuth,
  validateBody,
  rateLimitByUser,
  rateLimitExceededResponse,
  schedulerBodySchema,
} from "@/lib/api-helpers";
import { runSchedulerJob } from "@/lib/scheduler";

// ─── POST Handler (run one job type, authenticated) ───────────────────────────

export const POST = withAuth(async (request: NextRequest, session) => {
  // Rate limiting (per user)
  const limiter = rateLimitByUser(request, session.userId, {
    maxRequests: 30,
    windowSeconds: 60,
  });
  if (!limiter.allowed) return rateLimitExceededResponse(limiter);

  // Validate request body
  const validation = await validateBody(request, schedulerBodySchema);
  if (!validation.success) return validation.response;

  const { type } = validation.data;

  const result = await runSchedulerJob(type, `api:${session.email}`);

  return NextResponse.json({
    success: true,
    type,
    ...result,
    timestamp: new Date().toISOString(),
  });
});

// ─── GET Handler (status / info, authenticated) ───────────────────────────────
// NOTE: intentionally wrapped in withAuth rather than relying on middleware
// alone, so the job log stays protected even if the matcher ever changes.

export const GET = withAuth(async (request: NextRequest, session) => {
  const limiter = rateLimitByUser(request, session.userId, {
    maxRequests: 60,
    windowSeconds: 60,
  });
  if (!limiter.allowed) return rateLimitExceededResponse(limiter);

  const recentJobs = await db.scheduledJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const jobCounts = await db.scheduledJob.groupBy({
    by: ["type"],
    _count: { id: true },
  });

  const statusCounts = await db.scheduledJob.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  return NextResponse.json({
    scheduler: "active",
    availableJobs: ["process_scheduled_posts", "process_campaigns", "check_trends"],
    recentJobs: recentJobs.map((j) => ({
      id: j.id,
      type: j.type,
      status: j.status,
      runAt: j.runAt,
      createdAt: j.createdAt,
    })),
    stats: {
      totalByType: jobCounts.map((j) => ({ type: j.type, count: j._count.id })),
      totalByStatus: statusCounts.map((j) => ({
        status: j.status,
        count: j._count.id,
      })),
    },
    timestamp: new Date().toISOString(),
  });
});
