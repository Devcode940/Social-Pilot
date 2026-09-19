import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { tryCatch, errorResponse, rateLimitByUser, rateLimitExceededResponse } from "@/lib/api-helpers";

const PERIOD_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export const GET = tryCatch(async (request: NextRequest) => {
    const user = await requireUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const limiter = rateLimitByUser(request, user.id, { maxRequests: 60, windowSeconds: 60 });
    if (!limiter.allowed) return rateLimitExceededResponse(limiter);

    const { searchParams } = new URL(request.url);
    const period = ["7d", "30d", "90d"].includes(searchParams.get("period") || "")
      ? (searchParams.get("period") as string)
      : "7d";
    const days = PERIOD_DAYS[period] || 7;

    const now = new Date();
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const prevPeriodStart = new Date(
      periodStart.getTime() - days * 24 * 60 * 60 * 1000
    );

    // --- Current period data ---

    // Posts in current period
    const currentPeriodPosts = await db.post.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: periodStart, lte: now },
      },
      select: {
        likes: true,
        comments: true,
        shares: true,
        views: true,
        status: true,
        createdAt: true,
        publishedAt: true,
        scheduledAt: true,
      },
    });

    const currentPublishedPosts = currentPeriodPosts.filter(
      (p) => p.status === "published"
    );
    const totalPosts = currentPublishedPosts.length;


    // Total reach (sum of views across current period)
    const totalReach = currentPeriodPosts.reduce((sum, p) => sum + p.views, 0);

    // Engagement rate (total engagements / total views * 100)
    const totalEngagements = currentPublishedPosts.reduce(
      (sum, p) => sum + p.likes + p.comments + p.shares,
      0
    );
    const engagementRate =
      totalReach > 0
        ? Math.round((totalEngagements / totalReach) * 10000) / 100
        : 0;

    // --- Previous period data (for growth calculations) ---

    const prevPeriodPosts = await db.post.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: prevPeriodStart, lt: periodStart },
      },
      select: {
        likes: true,
        comments: true,
        shares: true,
        views: true,
        status: true,
      },
    });

    const prevPublishedPosts = prevPeriodPosts.filter(
      (p) => p.status === "published"
    );

    const prevTotalPosts = prevPublishedPosts.length;
    const prevTotalReach = prevPeriodPosts.reduce(
      (sum, p) => sum + p.views,
      0
    );
    const prevTotalEngagements = prevPublishedPosts.reduce(
      (sum, p) => sum + p.likes + p.comments + p.shares,
      0
    );

    // --- Followers (all accounts, always current) ---
    const totalFollowersResult = await db.socialAccount.aggregate({
      where: { userId: user.id },
      _sum: { followers: true },
    });
    const totalFollowers = totalFollowersResult._sum.followers ?? 0;

    // --- Growth calculations ---

    // Follower history isn't tracked, so no truthful change % exists.
    // The dashboard renders this as "—" until history is recorded.
    const followerChange: string | null = null;

    const postGrowth =
      prevTotalPosts > 0
        ? ((totalPosts - prevTotalPosts) / prevTotalPosts) * 100
        : totalPosts > 0
          ? 100
          : 0;

    const engagementGrowth =
      prevTotalEngagements > 0
        ? ((totalEngagements - prevTotalEngagements) / prevTotalEngagements) *
          100
        : totalEngagements > 0
          ? 100
          : 0;

    const reachGrowth =
      prevTotalReach > 0
        ? ((totalReach - prevTotalReach) / prevTotalReach) * 100
        : totalReach > 0
          ? 100
          : 0;

    function formatGrowth(value: number): string {
      if (value === 0) return "0%";
      const sign = value > 0 ? "+" : "";
      return `${sign}${value.toFixed(1)}%`;
    }

    // --- Platform breakdown ---
    const accounts = await db.socialAccount.groupBy({
      by: ["platform"],
      where: { userId: user.id },
      _sum: { followers: true },
      _count: { id: true },
    });
    const platformBreakdown = accounts.map((a) => ({
      platform: a.platform,
      followers: a._sum.followers ?? 0,
      accountCount: a._count.id,
    }));

    // --- Recent posts (latest 5 within current period, or latest 5 overall) ---
    const recentPosts = await db.post.findMany({
      where: { userId: user.id, createdAt: { gte: periodStart, lte: now } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        account: {
          select: { platform: true, displayName: true, avatar: true },
        },
        tags: { select: { tag: true } },
      },
    });

    // If fewer than 5 posts in period, fill with earlier posts
    let allRecentPosts = recentPosts;
    if (recentPosts.length < 5) {
      const earlierPosts = await db.post.findMany({
        where: { userId: user.id, createdAt: { lt: periodStart } },
        orderBy: { createdAt: "desc" },
        take: 5 - recentPosts.length,
        include: {
          account: {
            select: { platform: true, displayName: true, avatar: true },
          },
          tags: { select: { tag: true } },
        },
      });
      allRecentPosts = [...recentPosts, ...earlierPosts];
    }

    // --- Post status counts (all time) ---
    const draftCount = await db.post.count({ where: { userId: user.id, status: "draft" } });
    const scheduledCount = await db.post.count({
      where: { userId: user.id, status: "scheduled" },
    });
    const publishedCount = await db.post.count({
      where: { userId: user.id, status: "published" },
    });
    const postStatusCounts = {
      draft: draftCount,
      scheduled: scheduledCount,
      published: publishedCount,
    };

    // --- Unread comments & active campaigns ---
    const unreadComments = await db.comment.count({
      where: { isRead: false, post: { userId: user.id } },
    });

    const activeCampaigns = await db.campaign.count({
      where: { userId: user.id, status: "active" },
    });

    // --- Period label ---
    const periodLabel =
      period === "7d"
        ? "from last week"
        : period === "30d"
          ? "from last month"
          : "from last quarter";

    return NextResponse.json({
      totalFollowers,
      totalPosts,
      engagementRate,
      totalReach,
      platformBreakdown,
      recentPosts: allRecentPosts,
      postStatusCounts,
      unreadComments,
      activeCampaigns,
      // Growth data
      changes: {
        followers: followerChange,
        posts: formatGrowth(postGrowth),
        engagement: formatGrowth(engagementGrowth),
        reach: formatGrowth(reachGrowth),
      },
      periodLabel,
    });
});
