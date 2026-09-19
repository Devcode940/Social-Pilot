import { db } from '@/lib/db'

export type SchedulerJobType =
  | 'process_scheduled_posts'
  | 'process_campaigns'
  | 'check_trends'

export interface JobDetail {
  id: string
  message: string
}

export interface JobResult {
  processed: number
  details: JobDetail[]
}

/**
 * Publish due scheduled posts. Each notification goes to the post's OWNER
 * (not the first user in the database).
 */
// Bound every cron batch: without `take`, one tick could attempt to publish an
// unbounded backlog in a single request and blow past timeouts.
const MAX_POSTS_PER_RUN = 100
const MAX_CAMPAIGNS_PER_RUN = 100

export async function processScheduledPosts(now = new Date()): Promise<JobResult> {
  const postsToPublish = await db.post.findMany({
    where: { status: 'scheduled', scheduledAt: { lte: now } },
    select: { id: true, userId: true, platforms: true },
    orderBy: { scheduledAt: 'asc' },
    take: MAX_POSTS_PER_RUN,
  })

  if (postsToPublish.length === 0) {
    return { processed: 0, details: [] }
  }

  // Set-based writes: 2 round-trips total instead of 2N sequential ones.
  const ids = postsToPublish.map((p) => p.id)
  await db.post.updateMany({
    where: { id: { in: ids } },
    data: { status: 'published', publishedAt: now },
  })
  await db.notification.createMany({
    data: postsToPublish.map((post) => ({
      userId: post.userId,
      type: 'post',
      title: 'Post Published',
      message: 'Your scheduled post was published',
    })),
  })

  return {
    processed: postsToPublish.length,
    details: postsToPublish.map((post) => ({
      id: post.id,
      message: `Published scheduled post (platforms: ${post.platforms})`,
    })),
  }
}

/**
 * Advance active campaigns toward their targets. Progress comes from
 * recorded engagement only — when a campaign has no owner-tracked source
 * of truth it is left untouched (no simulated increments).
 */
export async function processCampaigns(): Promise<JobResult> {
  const details: JobDetail[] = []

  const activeCampaigns = await db.campaign.findMany({
    where: { status: 'active' },
    select: { id: true, userId: true, name: true, targetCount: true, currentCount: true },
    orderBy: { createdAt: 'asc' },
    take: MAX_CAMPAIGNS_PER_RUN,
  })

  const completed = activeCampaigns.filter((c) => c.currentCount >= c.targetCount)
  if (completed.length > 0) {
    const endedAt = new Date()
    await db.campaign.updateMany({
      where: { id: { in: completed.map((c) => c.id) } },
      data: { status: 'completed', endedAt },
    })
    const notifiable = completed.filter((c): c is typeof c & { userId: string } => c.userId !== null)
    if (notifiable.length > 0) {
      await db.notification.createMany({
        data: notifiable.map((campaign) => ({
          userId: campaign.userId,
          type: 'campaign',
          title: 'Campaign Completed',
          message: `"${campaign.name}" has reached its target of ${campaign.targetCount}!`,
        })),
      })
    }
  }

  for (const campaign of activeCampaigns) {
    const isCompleted = campaign.currentCount >= campaign.targetCount
    details.push({
      id: campaign.id,
      message: isCompleted
        ? `Campaign "${campaign.name}" completed (${campaign.targetCount}/${campaign.targetCount})`
        : `Campaign "${campaign.name}" progress: ${Math.min(campaign.currentCount, campaign.targetCount)}/${campaign.targetCount}`,
    })
  }

  return { processed: activeCampaigns.length, details }
}

/**
 * Flag trend queries that have gone stale (>24h) so owners can refresh them.
 */
export async function checkTrends(): Promise<JobResult> {
  const details: JobDetail[] = []

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentTrends = await db.trendResult.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    orderBy: { createdAt: 'desc' },
    take: 25,
  })

  for (const trend of recentTrends) {
    const hoursSinceQuery =
      (Date.now() - trend.createdAt.getTime()) / (1000 * 60 * 60)

    if (hoursSinceQuery > 24 && trend.results.length > 0 && trend.userId) {
      await db.notification.create({
        data: {
          userId: trend.userId,
          type: 'trend',
          title: 'Trend Update Available',
          message: `New data may be available for trend: "${trend.query}"`,
        },
      })
      details.push({
        id: trend.id,
        message: `Trend "${trend.query}" hasn't been refreshed in ${Math.round(hoursSinceQuery)} hours — update recommended`,
      })
    } else {
      details.push({
        id: trend.id,
        message: `Trend "${trend.query}" is recent (${Math.round(hoursSinceQuery)}h ago)`,
      })
    }
  }

  return { processed: recentTrends.length, details }
}

const runners: Record<SchedulerJobType, () => Promise<JobResult>> = {
  process_scheduled_posts: () => processScheduledPosts(),
  process_campaigns: () => processCampaigns(),
  check_trends: () => checkTrends(),
}

/**
 * Run one scheduler job type and audit the outcome to ScheduledJob.
 * Shared by POST /api/scheduler and GET /api/scheduler/cron.
 */
export async function runSchedulerJob(
  type: SchedulerJobType,
  triggeredBy: string
): Promise<JobResult> {
  const result = await runners[type]()

  await db.scheduledJob.create({
    data: {
      type,
      payload: JSON.stringify({ triggeredBy }),
      runAt: new Date(),
      status: 'completed',
      result: JSON.stringify({
        processed: result.processed,
        details: result.details,
      }),
    },
  })

  return result
}
