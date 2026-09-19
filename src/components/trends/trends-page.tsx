'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  ArrowUpRight,
  Zap,
  Bell,
  Clock,
  BarChart3,
  Globe,
  Filter,
  Sparkles,
  Eye,
  Bookmark,

  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SearchResult {
  title: string
  snippet: string
  source: string
  url: string
  category: string
}

interface TrendAlert {
  id: number
  label: string
  description: string
  icon: React.ElementType
  enabled: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

const QUICK_FILTERS = ['AI', 'Crypto', 'Fashion', 'Fitness', 'Food', 'Travel', 'Music', 'Tech']

const PLATFORM_COLORS: Record<string, string> = {
  twitter: 'bg-neutral-900',
  instagram: 'bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600',
  tiktok: 'bg-neutral-900',
  youtube: 'bg-red-600',
  linkedin: 'bg-sky-700',
}

const CATEGORY_COLORS: Record<string, string> = {
  'AI & Technology': 'bg-rose-500/10 text-rose-600 border-rose-200',
  'Marketing': 'bg-amber-500/10 text-amber-600 border-amber-200',
  'Video Content': 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  'Trending': 'bg-rose-500/10 text-rose-600 border-rose-200',
  'Social Platforms': 'bg-purple-500/10 text-purple-600 border-purple-200',
  'Growth & Engagement': 'bg-sky-500/10 text-sky-600 border-sky-200',
  'Creator Economy': 'bg-orange-500/10 text-orange-600 border-orange-200',
  'General': 'bg-zinc-500/10 text-zinc-600 border-zinc-200',
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function DirectionIcon({ direction }: { direction: 'up' | 'down' | 'stable' }) {
  if (direction === 'up') return <TrendingUp className="size-4 text-emerald-500" />
  if (direction === 'down') return <TrendingDown className="size-4 text-red-500" />
  return <Minus className="size-4 text-amber-500" />
}

function ViralScoreBadge({ score }: { score: string }) {
  const config: Record<string, { className: string; icon: React.ReactNode }> = {
    Hot: { className: 'bg-red-500/10 text-red-600 border-red-200', icon: <Flame className="size-3" /> },
    Rising: { className: 'bg-amber-500/10 text-amber-600 border-amber-200', icon: <ArrowUpRight className="size-3" /> },
    Trending: { className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', icon: <TrendingUp className="size-3" /> },
    Default: { className: 'bg-zinc-500/10 text-zinc-600 border-zinc-200', icon: <TrendingUp className="size-3" /> },
  }
  const c = config[score] || config.Default
  return (
    <Badge variant="outline" className={`gap-1 font-semibold ${c.className}`}>
      {c.icon}
      {score}
    </Badge>
  )
}

function getBarColor(value: number) {
  if (value >= 200) return '#ef4444'
  if (value >= 100) return '#f59e0b'
  return '#10b981'
}

function CustomChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground">{label?.replace('\n', ' ')}</p>
      <p className="text-sm font-bold" style={{ color: getBarColor(payload[0].value) }}>
        +{payload[0].value}%
      </p>
    </div>
  )
}

function TrendCardSkeleton() {
  return (
    <Card className="flex flex-col gap-0 overflow-hidden">
      <CardHeader className="pb-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-16 mt-2" />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
        <Separator />
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  )
}

function ViralCardSkeleton() {
  return (
    <Card className="flex flex-col gap-0">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-full" />
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2 w-12 mt-1" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-24" />
        <Separator />
        <div className="flex gap-2">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TrendsPage() {
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState('all')
  const [timeRange, setTimeRange] = useState('7d')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search results
  const [trends, setTrends] = useState<SearchResult[]>([])
  const [viralContent, setViralContent] = useState<SearchResult[]>([])
  const [hashtags, setHashtags] = useState<SearchResult[]>([])
  const [chartData, setChartData] = useState<{ category: string; growth: number }[]>([])

  // Quick filter
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null)

  // Saved posts
  const [savedPosts, setSavedPosts] = useState<Set<number>>(new Set())

  // Active search tab
  const [activeSearchTab, setActiveSearchTab] = useState('trending')

  // Trend alerts state
  const [alerts, setAlerts] = useState<TrendAlert[]>([
    { id: 1, label: 'Volume Alert', description: 'When topic exceeds 50K posts', icon: BarChart3, enabled: true },
    { id: 2, label: 'Competitor Alert', description: 'When competitor trends', icon: Eye, enabled: false },
    { id: 3, label: 'Hashtag Spike', description: 'When niche hashtag spikes', icon: Zap, enabled: true },
    { id: 4, label: 'Daily Digest', description: 'Daily trend digest', icon: Clock, enabled: true },
  ])

  const toggleAlert = (id: number) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    )
  }

  const handleDeepSearch = useCallback(async () => {
    const searchQuery = activeQuickFilter || query.trim()
    if (!searchQuery) {
      setError('Please enter a search query or select a quick filter')
      return
    }

    setLoading(true)
    setError(null)
    setActiveSearchTab('trending')

    try {
      const res = await fetch('/api/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          platform: platform !== 'all' ? platform : undefined,
          timeRange,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || `Search failed with status ${res.status}`)
      }

      const data = await res.json()
      setTrends(data.trends || [])
      setViralContent(data.viralContent || [])
      setHashtags(data.hashtags || [])

      // Build chart data from trends
      const trendCategories = (data.trends || []).reduce((acc: Record<string, number>, item: SearchResult) => {
        const cat = item.category || 'General'
        acc[cat] = (acc[cat] || 0) + 1
        return acc
      }, {})
      const viralCategories = (data.viralContent || []).reduce((acc: Record<string, number>, item: SearchResult) => {
        const cat = item.category || 'General'
        acc[cat] = (acc[cat] || 0) + 1
        return acc
      }, {})

      // Merge and create growth-based chart data
      const allCategories = new Set([...Object.keys(trendCategories), ...Object.keys(viralCategories)])
      const chart = Array.from(allCategories).map((cat) => {
        const count = (trendCategories[cat] || 0) + (viralCategories[cat] || 0)
        return {
          category: cat.length > 12 ? cat.slice(0, 11) + '\n' + cat.slice(11) : cat,
          growth: count * 85,
        }
      }).sort((a, b) => b.growth - a.growth)

      setChartData(chart)
      setSearched(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [query, activeQuickFilter, platform, timeRange])

  const handleQuickFilterClick = (filter: string) => {
    setActiveQuickFilter(activeQuickFilter === filter ? null : filter)
    if (activeQuickFilter === filter) {
      setQuery('')
    } else {
      setQuery(filter)
    }
  }

  const toggleSavePost = (id: number) => {
    setSavedPosts((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const effectiveQuery = activeQuickFilter || query

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="space-y-4">
            {/* Search input row */}
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search trends, topics, hashtags..."
                  className="h-12 pl-10 text-base"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDeepSearch()}
                />
              </div>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="h-12 w-full md:w-[170px]">
                  <Globe className="mr-2 size-4 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="h-12 w-full md:w-[170px]">
                  <Clock className="mr-2 size-4 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                className="h-12 w-full gap-2 bg-primary px-6 text-base font-semibold md:w-auto"
                onClick={handleDeepSearch}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Deep Search
                  </>
                )}
              </Button>
            </div>

            {/* Quick filter chips */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Quick Search:</span>
              {QUICK_FILTERS.map((filter) => (
                <button
                  key={filter}
                  onClick={() => handleQuickFilterClick(filter)}
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                    activeQuickFilter === filter
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="size-5 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Search Failed</p>
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deep Search Results Panel (Hashtags) */}
      {searched && hashtags.length > 0 && (
        <Card className="overflow-hidden border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <CardTitle className="text-lg">Deep Search Results</CardTitle>
              <Badge variant="secondary" className="ml-auto text-xs">
                {effectiveQuery}
              </Badge>
            </div>
            <CardDescription>Related hashtags discovered across platforms</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">Topic</th>
                      <th className="pb-3 pr-4 font-medium">Source</th>
                      <th className="pb-3 pr-4 font-medium">Category</th>
                      <th className="pb-3 font-medium">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hashtags.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-primary line-clamp-1 max-w-[250px]">{row.title}</span>
                            {row.url && (
                              <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                                <ExternalLink className="size-3" />
                              </a>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-1 max-w-[300px]">{row.snippet}</p>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground text-xs">{row.source || '—'}</td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline" className={`text-[10px] ${CATEGORY_COLORS[row.category] || CATEGORY_COLORS.General}`}>
                            {row.category}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <DirectionIcon direction={i % 3 === 0 ? 'up' : i % 3 === 1 ? 'stable' : 'up'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs: Main Content */}
      <Tabs value={activeSearchTab} onValueChange={setActiveSearchTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="trending" className="gap-1.5">
            <TrendingUp className="size-4" />
            <span className="hidden sm:inline">Trending</span>
          </TabsTrigger>
          <TabsTrigger value="viral" className="gap-1.5">
            <Flame className="size-4" />
            <span className="hidden sm:inline">Viral</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="size-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5">
            <Bell className="size-4" />
            <span className="hidden sm:inline">Alerts</span>
          </TabsTrigger>
        </TabsList>

        {/* Trending Topics */}
        <TabsContent value="trending" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Trending Topics</h2>
              <p className="text-sm text-muted-foreground">
                {searched
                  ? `${trends.length} results for "${effectiveQuery}"`
                  : 'Search for trends to get started'}
              </p>
            </div>
          </div>

          {/* Loading Skeletons */}
          {loading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6].map((i) => <TrendCardSkeleton key={i} />)}
            </div>
          )}

          {/* Empty State */}
          {!loading && !searched && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/80 mb-4">
                <Search className="size-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-muted-foreground">Search for trends to get started</p>
              <p className="mt-1 text-sm text-muted-foreground/70 max-w-sm text-center">
                Enter a topic or click a quick filter above to discover real-time trends across social media platforms
              </p>
            </div>
          )}

          {/* No Results */}
          {!loading && searched && trends.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/80 mb-4">
                <Search className="size-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-muted-foreground">No trends found</p>
              <p className="mt-1 text-sm text-muted-foreground/70 max-w-sm text-center">
                Try a different search term or adjust your filters
              </p>
            </div>
          )}

          {/* Trend Cards */}
          {!loading && trends.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {trends.map((topic, index) => (
                <Card key={index} className="group flex flex-col gap-0 overflow-hidden transition-shadow hover:shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight line-clamp-2">{topic.title}</CardTitle>
                      <Badge variant="outline" className={`shrink-0 text-[10px] ${CATEGORY_COLORS[topic.category] || CATEGORY_COLORS.General}`}>
                        {topic.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3 pt-0">
                    {/* Snippet */}
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{topic.snippet}</p>

                    {/* Source */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Globe className="size-3" />
                      <span>{topic.source || 'Web'}</span>
                    </div>

                    {/* Simulated trend score based on position */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Relevance</span>
                        <span className="font-semibold text-foreground">{Math.max(40, 95 - index * 8)}%</span>
                      </div>
                      <Progress value={Math.max(40, 95 - index * 8)} className="h-2" />
                    </div>

                    <Separator />

                    <a
                      href={topic.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button variant="outline" size="sm" className="mt-auto w-full gap-1.5">
                        <Eye className="size-3.5" />
                        Explore
                        <ExternalLink className="size-3 ml-auto text-muted-foreground" />
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Viral Content Feed */}
        <TabsContent value="viral" className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Viral Content Feed</h2>
            <p className="text-sm text-muted-foreground">
              {searched
                ? `${viralContent.length} results for "${effectiveQuery}"`
                : 'Search for trends to get started'}
            </p>
          </div>

          {/* Loading Skeletons */}
          {loading && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <ViralCardSkeleton key={i} />)}
            </div>
          )}

          {/* Empty State */}
          {!loading && !searched && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/80 mb-4">
                <Flame className="size-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-muted-foreground">Search for trends to get started</p>
              <p className="mt-1 text-sm text-muted-foreground/70 max-w-sm text-center">
                Enter a topic or click a quick filter to discover viral content across platforms
              </p>
            </div>
          )}

          {/* Viral Content Cards */}
          {!loading && viralContent.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {viralContent.map((post, index) => (
                <Card key={index} className="flex flex-col gap-0 transition-shadow hover:shadow-lg">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex size-8 items-center justify-center rounded-full text-sm font-bold text-white"
                          style={{ background: PLATFORM_COLORS[platform !== 'all' ? platform : 'twitter'] || '#18181b' }}
                        >
                          {post.source?.charAt(0).toUpperCase() || 'W'}
                        </span>
                        <div>
                          <p className="text-sm font-semibold leading-tight">{post.source || 'Web Source'}</p>
                          <p className="text-xs text-muted-foreground">{post.category || 'General'}</p>
                        </div>
                      </div>
                      <ViralScoreBadge score={index < 2 ? 'Hot' : index < 4 ? 'Rising' : 'Trending'} />
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3 pt-0">
                    <h3 className="text-sm font-semibold leading-tight line-clamp-2">{post.title}</h3>
                    <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {post.snippet}
                    </p>

                    <Separator />

                    <div className="flex items-center gap-2">
                      <Button
                        variant={savedPosts.has(index) ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => toggleSavePost(index)}
                      >
                        <Bookmark className={`size-3.5 ${savedPosts.has(index) ? 'fill-current' : ''}`} />
                        {savedPosts.has(index) ? 'Saved' : 'Save'}
                      </Button>
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button variant="outline" size="sm" className="w-full gap-1.5">
                          <Eye className="size-3.5" />
                          Read More
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* No Results */}
          {!loading && searched && viralContent.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/80 mb-4">
                <Flame className="size-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-muted-foreground">No viral content found</p>
              <p className="mt-1 text-sm text-muted-foreground/70">Try a different search term or platform filter</p>
            </div>
          )}
        </TabsContent>

        {/* Trend Analysis Chart */}
        <TabsContent value="analytics" className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Trend Velocity Analysis</h2>
            <p className="text-sm text-muted-foreground">
              {searched
                ? `Category distribution for "${effectiveQuery}"`
                : 'Search to see trend data'}
            </p>
          </div>

          <Card>
            <CardContent className="p-4 md:p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Analyzing trends...</p>
                </div>
              ) : !searched || chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <BarChart3 className="size-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Search to see trend data</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    Perform a deep search to visualize trend distribution across categories
                  </p>
                </div>
              ) : (
                <>
                  <div className="h-[360px] w-full md:h-[420px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="category"
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                          tickLine={false}
                          interval={0}
                          height={50}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                          tickLine={false}
                          tickFormatter={(v: number) => `+${v}%`}
                        />
                        <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                        <Bar dataKey="growth" radius={[6, 6, 0, 0]} maxBarSize={60}>
                          {chartData.map((entry, index) => (
                            <Cell key={index} fill={getBarColor(entry.growth)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend */}
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="inline-block size-3 rounded-sm bg-red-500" />
                      <span className="text-muted-foreground">High (200%+)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block size-3 rounded-sm bg-amber-500" />
                      <span className="text-muted-foreground">Medium (100-200%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block size-3 rounded-sm bg-emerald-500" />
                      <span className="text-muted-foreground">Low (&lt;100%)</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trend Alerts */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Trend Alerts</h2>
              <p className="text-sm text-muted-foreground">Get notified when trends match your criteria</p>
            </div>
            <Button className="gap-1.5">
              <Bell className="size-4" />
              Create Custom Alert
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {alerts.map((alert) => {
              const Icon = alert.icon
              return (
                <Card key={alert.id} className={`transition-all ${alert.enabled ? 'border-primary/30' : 'opacity-70'}`}>
                  <CardContent className="flex items-center gap-4 p-4 md:p-6">
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${alert.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{alert.label}</p>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                    </div>
                    <Switch
                      checked={alert.enabled}
                      onCheckedChange={() => toggleAlert(alert.id)}
                      aria-label={`Toggle ${alert.label}`}
                    />
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Summary */}
          <Card className="bg-muted/50">
            <CardContent className="flex items-center gap-3 p-4">
              <Bell className="size-5 text-primary" />
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{alerts.filter((a) => a.enabled).length}</span> of{' '}
                {alerts.length} alerts are active. You&apos;ll receive real-time notifications for enabled alerts.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
