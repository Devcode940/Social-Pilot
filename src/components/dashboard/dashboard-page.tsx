'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  TrendingUp,
  FileText,
  Globe,
  ArrowUpRight,
  Clock,
  MessageSquare,
  Send,
  AlertCircle,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StatsData = {
  totalFollowers: number
  totalPosts: number
  engagementRate: number
  totalReach: number
  platformBreakdown: { platform: string; followers: number; accountCount: number }[]
  recentPosts: {
    id: string
    content: string
    platforms: string
    status: string
    likes: number
    comments: number
    shares: number
    views: number
    createdAt: string
    publishedAt: string | null
    scheduledAt: string | null
    account: { platform: string; displayName: string | null; avatar: string | null } | null
    tags: { tag: string }[]
  }[]
  postStatusCounts: { draft: number; scheduled: number; published: number }
  unreadComments: number
  activeCampaigns: number
  changes: {
    followers: string | null
    posts: string
    engagement: string
    reach: string
  }
  periodLabel: string
}

type ActivityItem = {
  id: string
  icon: React.ReactNode
  description: string
  time: string
  platform: string
}

// ---------------------------------------------------------------------------
// Chart colors
// ---------------------------------------------------------------------------

const chartColors = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-1)',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return num.toLocaleString()
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
}

const platformLabelMap: Record<string, string> = {
  instagram: 'Instagram',
  twitter: 'Twitter/X',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
}

function getStatusIcon(status: string): React.ReactNode {
  switch (status) {
    case 'published':
      return <Send className="h-4 w-4 text-chart-1" />
    case 'scheduled':
      return <Clock className="h-4 w-4 text-chart-2" />
    case 'draft':
      return <FileText className="h-4 w-4 text-chart-3" />
    default:
      return <MessageSquare className="h-4 w-4 text-chart-4" />
  }
}

function getActivityDescription(post: StatsData['recentPosts'][0]): string {
  const platformName = post.account?.displayName || platformLabelMap[post.platforms.split(',')[0]] || post.platforms.split(',')[0]
  switch (post.status) {
    case 'published':
      if (post.likes >= 10_000) return `Post on ${platformName} reached ${formatNumber(post.likes)} likes`
      return `Post published on ${platformName}`
    case 'scheduled':
      return `Post scheduled on ${platformName}`
    case 'draft':
      return `Draft saved for ${platformName}`
    default:
      return `Activity on ${platformName}`
  }
}

// ---------------------------------------------------------------------------
// Derive posting times from real post data
// ---------------------------------------------------------------------------

function derivePostingHours(recentPosts: StatsData['recentPosts']): { hour: string; level: number }[] {
  const hourBuckets = new Map<number, number>()
  for (let h = 6; h <= 23; h++) hourBuckets.set(h, 0)

  for (const post of recentPosts) {
    const dateStr = post.publishedAt || post.scheduledAt || post.createdAt
    const hour = new Date(dateStr).getHours()
    if (hourBuckets.has(hour)) {
      hourBuckets.set(hour, (hourBuckets.get(hour) || 0) + 1)
    }
  }

  const maxCount = Math.max(...hourBuckets.values(), 1)

  const hours: { hour: string; level: number }[] = []
  for (let h = 6; h <= 23; h++) {
    const count = hourBuckets.get(h) || 0
    let level = 0
    if (count > 0 && maxCount > 0) {
      const ratio = count / maxCount
      if (ratio >= 0.75) level = 4
      else if (ratio >= 0.5) level = 3
      else if (ratio >= 0.25) level = 2
      else level = 1
    }
    const ampm = h < 12 ? 'AM' : 'PM'
    const display = h === 0 ? '12AM' : h > 12 ? `${h - 12}PM` : `${h}${ampm}`
    hours.push({ hour: display, level })
  }
  return hours
}

const intensityColor: Record<number, string> = {
  0: 'bg-muted',
  1: 'bg-chart-1/15',
  2: 'bg-chart-1/30',
  3: 'bg-chart-1/50',
  4: 'bg-chart-1/80',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  title,
  value,
  change,
  icon,
  periodLabel = 'from last month',
}: {
  title: string
  value: string
  change: string | null
  icon: React.ReactNode
  periodLabel?: string
}) {
  const isNegative = !!change && change.startsWith('-')
  const isZero = change === '0%' || change === null
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-sm font-medium text-muted-foreground">
          {title}
        </CardDescription>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="mt-1 flex items-center gap-1">
          <Badge
            variant="secondary"
            className={`gap-1 ${
              isNegative
                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                : isZero
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {change === null ? (
              'n/a'
            ) : (
              <>
            {change === null ? (
              'n/a'
            ) : (
              <>
                {!isZero && <ArrowUpRight className={`h-3 w-3 ${isNegative ? 'rotate-90' : ''}`} />}
                {change}
              </>
            )}
              </>
            )}
          </Badge>
          <span className="text-xs text-muted-foreground">{periodLabel}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-24 mb-2" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [period, setPeriod] = useState('7d')
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadStats() {
      setLoading(true)
      try {
        const res = await fetch(`/api/stats?period=${period}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setStats(data)
      } catch {
        setError('Failed to load stats')
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [period])

  // Derive chart data from real API data
  const engagementChartData = stats
    ? stats.recentPosts.slice(0, 5).map((post, i) => ({
        day: post.account?.displayName?.split(' ')[1] || platformLabelMap[post.platforms.split(',')[0]] || `Post ${i + 1}`,
        Likes: post.likes || 0,
        Comments: post.comments || 0,
      }))
    : []

  const platformChartData = stats
    ? stats.platformBreakdown.map((p) => ({
        name: platformLabelMap[p.platform] || p.platform,
        followers: Math.round(p.followers / 1000),
      }))
    : []

  const recentActivities: ActivityItem[] = stats
    ? stats.recentPosts.map((post) => ({
        id: post.id,
        icon: getStatusIcon(post.status),
        description: getActivityDescription(post),
        time: timeAgo(post.createdAt),
        platform: platformLabelMap[post.platforms.split(',')[0]] || post.platforms.split(',')[0],
      }))
    : []

  const postingHours = stats ? derivePostingHours(stats.recentPosts) : []

  // Stats card values
  const followerValue = stats ? formatNumber(stats.totalFollowers) : '—'
  const postsValue = stats ? stats.totalPosts.toString() : '—'
  const engagementValue = stats ? `${stats.engagementRate}%` : '—'
  const reachValue = stats ? formatNumber(stats.totalReach) : '—'
  const periodLabel = stats?.periodLabel || 'from last month'
  const changes = stats?.changes || { followers: '0%', posts: '0%', engagement: '0%', reach: '0%' }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Social media performance overview
            </p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Error State */}
        {error && (
          <section className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => {
                setError('')
                setLoading(true)
                fetch(`/api/stats?period=${period}`)
                  .then((r) => r.json())
                  .then((d) => setStats(d))
                  .catch(() => setError('Failed to load stats'))
                  .finally(() => setLoading(false))
              }}
            >
              Retry
            </Button>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* 1. Top Stats Row                                                  */}
        {/* ---------------------------------------------------------------- */}
        <section
          aria-label="Key metrics"
          className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            : (
              <>
                <StatCard
                  title="Total Followers"
                  value={followerValue}
                  change={changes.followers}
                  icon={<Users className="h-4 w-4 text-primary" />}
                  periodLabel={periodLabel}
                />
                <StatCard
                  title="Total Engagement"
                  value={engagementValue}
                  change={changes.engagement}
                  icon={<TrendingUp className="h-4 w-4 text-primary" />}
                  periodLabel={periodLabel}
                />
                <StatCard
                  title="Posts Published"
                  value={postsValue}
                  change={changes.posts}
                  icon={<FileText className="h-4 w-4 text-primary" />}
                  periodLabel={periodLabel}
                />
                <StatCard
                  title="Total Reach"
                  value={reachValue}
                  change={changes.reach}
                  icon={<Globe className="h-4 w-4 text-primary" />}
                  periodLabel={periodLabel}
                />
              </>
            )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 2. Engagement Overview Chart                                      */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Engagement overview">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Engagement Overview</CardTitle>
                <CardDescription className="mt-1">
                  Likes and comments across recent posts
                </CardDescription>
              </div>
              <div className="flex gap-1 rounded-lg border bg-muted p-1">
                <Button
                  size="sm"
                  variant={period === '7d' ? 'default' : 'ghost'}
                  onClick={() => setPeriod('7d')}
                  className="h-7 text-xs"
                >
                  7D
                </Button>
                <Button
                  size="sm"
                  variant={period === '30d' ? 'default' : 'ghost'}
                  onClick={() => setPeriod('30d')}
                  className="h-7 text-xs"
                >
                  30D
                </Button>
                <Button
                  size="sm"
                  variant={period === '90d' ? 'default' : 'ghost'}
                  onClick={() => setPeriod('90d')}
                  className="h-7 text-xs"
                >
                  90D
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[320px] w-full flex items-center justify-center">
                  <Skeleton className="h-full w-full rounded-lg" />
                </div>
              ) : engagementChartData.length === 0 ? (
                <div className="h-[320px] w-full flex items-center justify-center text-muted-foreground text-sm">
                  No engagement data yet
                </div>
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={engagementChartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="fillLikes"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--chart-1)"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--chart-1)"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                        <linearGradient
                          id="fillComments"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--chart-2)"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--chart-2)"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--popover)',
                          borderColor: 'var(--border)',
                          borderRadius: 'var(--radius)',
                          color: 'var(--popover-foreground)',
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="Likes"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        fill="url(#fillLikes)"
                      />
                      <Area
                        type="monotone"
                        dataKey="Comments"
                        stroke="var(--chart-2)"
                        strokeWidth={2}
                        fill="url(#fillComments)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 3. Platform Performance + 4. Recent Activity                      */}
        {/* ---------------------------------------------------------------- */}
        <section
          aria-label="Platform performance and activity"
          className="grid gap-6 lg:grid-cols-7"
        >
          {/* Platform Performance */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Platform Performance</CardTitle>
              <CardDescription>Followers by platform (in thousands)</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[320px] w-full">
                  <Skeleton className="h-full w-full rounded-lg" />
                </div>
              ) : platformChartData.length === 0 ? (
                <div className="h-[320px] w-full flex items-center justify-center text-muted-foreground text-sm">
                  No platform data yet
                </div>
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={platformChartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--popover)',
                          borderColor: 'var(--border)',
                          borderRadius: 'var(--radius)',
                          color: 'var(--popover-foreground)',
                          fontSize: 12,
                        }}
                        formatter={(value: number) => [`${value}K`, 'Followers']}
                      />
                      <Bar dataKey="followers" radius={[6, 6, 0, 0]} maxBarSize={48}>
                        {platformChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Feed */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest social media events</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[320px] px-6">
                <div className="space-y-1 pb-4">
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-lg p-3">
                          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                      ))
                    : recentActivities.length === 0
                      ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <FileText className="h-8 w-8 mb-2 opacity-40" />
                          <p className="text-sm">No recent activity</p>
                        </div>
                      )
                      : recentActivities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
                        >
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                            {activity.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-snug">{activity.description}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {activity.time}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] font-normal"
                              >
                                {activity.platform}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 5. Best Posting Times                                             */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Best posting times">
          <Card>
            <CardHeader>
              <CardTitle>Best Posting Times</CardTitle>
              <CardDescription>
                Optimal hours for maximum engagement &mdash; darker bars indicate
                higher activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-16 w-full flex items-end gap-0">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <Skeleton key={i} className="flex-1 h-16 rounded-t-md" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-0">
                    {postingHours.map((item) => (
                      <div
                        key={item.hour}
                        className="flex flex-1 flex-col items-center gap-1"
                      >
                        <div
                          className={`w-full rounded-t-md transition-colors ${
                            item.level === 0 ? 'bg-muted' : ''
                          }`}
                          style={{
                            height: `${Math.max(item.level * 16, 8)}px`,
                          }}
                        >
                          <div
                            className={`h-full w-full rounded-t-md ${
                              intensityColor[item.level]
                            }`}
                            style={{ minHeight: '8px' }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground sm:text-xs">
                          {item.hour}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-sm bg-chart-1/15" />
                      Low
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-sm bg-chart-1/30" />
                      Moderate
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-sm bg-chart-1/50" />
                      Good
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-sm bg-chart-1/80" />
                      Peak
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
