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
export async function processScheduledPosts(now = new Date()): Promise<JobResult> {
  const details: JobDetail[] = []

  const postsToPublish = await db.post.findMany({
    where: { status: 'scheduled', scheduledAt: { lte: now } },
  })

  for (const post of postsToPublish) {
    await db.post.update({
      where: { id: post.id },
      data: { status: 'published', publishedAt: now },
    })

    await db.notification.create({
      data: {
        userId: post.userId,
        type: 'post',
        title: 'Post Published',
        message: 'Your scheduled post was published',
      },
    })

    details.push({
      id: post.id,
      message: `Published scheduled post (platforms: ${post.platforms})`,
    })
  }

  return { processed: postsToPublish.length, details }
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
  })

  for (const campaign of activeCampaigns) {
    const isCompleted = campaign.currentCount >= campaign.targetCount

    if (isCompleted) {
      await db.campaign.update({
        where: { id: campaign.id },
        data: { status: 'completed', endedAt: new Date() },
      })

      if (campaign.userId) {
        await db.notification.create({
          data: {
            userId: campaign.userId,
            type: 'campaign',
            title: 'Campaign Completed',
            message: `"${campaign.name}" has reached its target of ${campaign.targetCount}!`,
          },
        })
      }
    }

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
