import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api — public health check (used by uptime monitors / load balancers).
export async function GET() {
  let database: "up" | "down" = "down";
  try {
    await db.$queryRaw`SELECT 1`;
    database = "up";
  } catch {
    database = "down";
  }

  return NextResponse.json(
    {
      ok: database === "up",
      service: "socialpilot",
      database,
      timestamp: new Date().toISOString(),
    },
    { status: database === "up" ? 200 : 503 }
  );
}
