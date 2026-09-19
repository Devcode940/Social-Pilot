'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, TrendingUp, PieChart, Lightbulb, Plus, AlertCircle, Zap, ArrowRight, Eye, Target, BarChart3, Trophy, ChevronUp, ChevronDown, Minus, Search, Trash2, RefreshCw, Clock, Loader2, CheckCircle2, X } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc' | null
interface SortState { col: string; dir: SortDir }
const initialSort: SortState = { col: '', dir: null }

interface Competitor {
  id: string
  handle: string
  name: string
  platform: string
  followers: number
  following: number
  postsWeek: number
  engagementRate: number
  growthRate: number
  avgLikes: number
  bestTime: string | null
  isTracking: boolean
  isEstimated: boolean
  createdAt: string
  updatedAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return n.toLocaleString()
}

function priorityColor(p: 'High' | 'Medium' | 'Low') {
  switch (p) {
    case 'High': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'Medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    case 'Low': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  }
}

function platformColor(p: string) {
  switch (p.toLowerCase()) {
    case 'instagram': return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
    case 'twitter': return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
    case 'youtube': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'tiktok': return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
    case 'linkedin': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'all': return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
    default: return 'bg-gray-100 text-gray-700'
  }
}

function getBestInColumn(list: Competitor[], col: keyof Competitor): string | null {
  const numericCols: (keyof Competitor)[] = ['followers', 'engagementRate', 'growthRate', 'avgLikes', 'postsWeek']
  if (!numericCols.includes(col) || list.length === 0) return null
  let best = ''
  let bestVal = -Infinity
  for (const c of list) {
    const v = c[col] as number
    if (v > bestVal) { bestVal = v; best = c.id }
  }
  return best
}

function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === 'asc') return <ChevronUp className="ml-1 inline size-3.5" />
  if (dir === 'desc') return <ChevronDown className="ml-1 inline size-3.5" />
  return <Minus className="ml-1 inline size-3.5 text-muted-foreground/40" />
}

// Generate pseudo-random but deterministic growth chart data
function generateGrowthData(comp: Competitor) {
  const seed = comp.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const base = comp.followers
  const growthFactor = comp.growthRate / 100
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months.map((month, i) => {
    const pseudoRandom = Math.sin(seed + i * 2.5) * 0.5 + 0.5
    const trend = base * (1 + growthFactor * (i / 12))
    const noise = trend * (pseudoRandom * 0.08 - 0.04)
    return { month, followers: Math.max(0, Math.round(trend + noise)) }
  })
}

// Generate radar chart data for comparison
function generateRadarData(comps: Competitor[]) {
  const maxFollowers = Math.max(...comps.map((c) => c.followers), 1)
  const maxEngagement = Math.max(...comps.map((c) => c.engagementRate), 1)
  const maxGrowth = Math.max(...comps.map((c) => c.growthRate), 1)
  const maxPosts = Math.max(...comps.map((c) => c.postsWeek), 1)
  const maxLikes = Math.max(...comps.map((c) => c.avgLikes), 1)

  return [
    { metric: 'Followers', ...Object.fromEntries(comps.map((c) => [c.name, Math.round((c.followers / maxFollowers) * 100)])) },
    { metric: 'Engagement', ...Object.fromEntries(comps.map((c) => [c.name, Math.round((c.engagementRate / maxEngagement) * 100)])) },
    { metric: 'Growth', ...Object.fromEntries(comps.map((c) => [c.name, Math.round((c.growthRate / maxGrowth) * 100)])) },
    { metric: 'Activity', ...Object.fromEntries(comps.map((c) => [c.name, Math.round((c.postsWeek / maxPosts) * 100)])) },
    { metric: 'Avg Likes', ...Object.fromEntries(comps.map((c) => [c.name, Math.round((c.avgLikes / maxLikes) * 100)])) },
  ]
}

const CHART_COLORS = [
  'hsl(160, 84%, 39%)',
  'hsl(346, 77%, 50%)',
  'hsl(38, 92%, 50%)',
  'hsl(271, 91%, 65%)',
  'hsl(25, 95%, 53%)',
  'hsl(200, 18%, 46%)',
  'hsl(142, 71%, 45%)',
  'hsl(215, 14%, 34%)',
]

// ─── Component ───────────────────────────────────────────────────────────────────

export default function CompetitorPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<SortState>(initialSort)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', platform: '', handle: '' })
  const [tracking, setTracking] = useState(false)
  const [appliedSet, setAppliedSet] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('overview')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)

  // Comparison mode
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set())

  // Handle search hint
  const [searchHint, setSearchHint] = useState<string | null>(null)
  const [searchingHint, setSearchingHint] = useState(false)

  // ── Fetch ──
  // Pure data loader: no state writes, safe to drive from effects or handlers.
  const loadCompetitors = useCallback(async (): Promise<Competitor[]> => {
    const res = await fetch('/api/competitors')
    if (!res.ok) throw new Error('Failed to fetch')
    return (await res.json()) as Competitor[]
  }, [])

  // Handler entry point (refresh buttons etc.): sets state from an event.
  const fetchCompetitors = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCompetitors(await loadCompetitors())
    } catch {
      setError('Failed to load competitors. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [loadCompetitors])

  // Mount-only load: every setState below runs in a promise continuation
  // (post-await), never synchronously in the effect body.
  useEffect(() => {
    let cancelled = false
    loadCompetitors()
      .then((data) => {
        if (cancelled) return
        setCompetitors(data)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError('Failed to load competitors. Please try again.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadCompetitors])

  // ── Real-time handle search ──
  useEffect(() => {
    if (!addForm.handle.trim() || addForm.handle.length < 3) {
      return
    }
    const timer = setTimeout(() => {
      setSearchingHint(true)
      // Simulate a quick hint based on platform
      const handle = addForm.handle.replace('@', '').trim()
      const hints: Record<string, string> = {
        instagram: `@${handle} on Instagram — will fetch follower count and engagement data`,
        twitter: `@${handle} on X/Twitter — will fetch profile metrics`,
        youtube: `${handle} on YouTube — will fetch subscriber count and video stats`,
        tiktok: `@${handle} on TikTok — will fetch follower and engagement data`,
        linkedin: `${handle} on LinkedIn — will fetch company page metrics`,
      }
      setSearchHint(hints[addForm.platform] || `Searching for ${handle}...`)
      setSearchingHint(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [addForm.handle, addForm.platform])

  // ── Add ──
  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.platform || !addForm.handle.trim()) return
    setTracking(true)
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name.trim(),
          platform: addForm.platform,
          handle: addForm.handle.trim(),
        }),
      })
      if (!res.ok) throw new Error('Failed to add')
      setShowAddDialog(false)
      setAddForm({ name: '', platform: '', handle: '' })
      setSearchHint(null)
      fetchCompetitors()
    } catch {
      setError('Failed to add competitor.')
    } finally {
      setTracking(false)
    }
  }

  // ── Refresh (re-scrape metrics for one competitor) ──
  const handleRefresh = async (id: string) => {
    setRefreshingId(id)
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh', id }),
      })
      if (!res.ok) throw new Error('Failed to refresh')
      const updated = await res.json()
      setCompetitors((prev) => prev.map((c) => (c.id === id ? updated : c)))
    } catch {
      setError('Failed to refresh competitor metrics.')
    } finally {
      setRefreshingId(null)
    }
  }

  // ── Delete ──
  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await fetch(`/api/competitors?id=${id}`, { method: 'DELETE' })
      setCompetitors((prev) => prev.filter((c) => c.id !== id))
      setCompareIds((prev) => { const next = new Set(prev); next.delete(id); return next })
    } catch {
      setError('Failed to remove competitor.')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Sort ──
  const toggleSort = (col: string) => {
    setSort((prev) => {
      if (prev.col === col) {
        if (prev.dir === 'asc') return { col, dir: 'desc' }
        if (prev.dir === 'desc') return initialSort
      }
      return { col, dir: 'asc' }
    })
  }

  const sorted = useMemo(() => {
    return [...competitors].sort((a, b) => {
      if (!sort.dir) return 0
      const key = sort.col as keyof Competitor
      const aVal = a[key]
      const bVal = b[key]
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sort.dir === 'asc' ? aVal - bVal : bVal - aVal
      }
      return sort.dir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal))
    })
  }, [competitors, sort])

  // ── Toggle compare ──
  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 3) next.add(id)
      return next
    })
  }

  // ── Strategy ──
  const applyStrategy = (id: string) => {
    setAppliedSet((s) => new Set(s).add(id))
  }

  // ── Derived ──
  const bestFollowers = getBestInColumn(competitors, 'followers')
  const bestEngagement = getBestInColumn(competitors, 'engagementRate')
  const bestGrowth = getBestInColumn(competitors, 'growthRate')
  const bestLikes = getBestInColumn(competitors, 'avgLikes')
  const bestPosts = getBestInColumn(competitors, 'postsWeek')

  const avgGrowth = useMemo(() => {
    if (competitors.length === 0) return 0
    return (competitors.reduce((sum, c) => sum + c.growthRate, 0) / competitors.length).toFixed(1)
  }, [competitors])

  const marketShare = useMemo(() => {
    if (competitors.length === 0) return 0
    const totalFollowers = competitors.reduce((sum, c) => sum + c.followers, 0)
    if (totalFollowers === 0) return 0
    const maxFollower = Math.max(...competitors.map((c) => c.followers))
    return ((maxFollower / totalFollowers) * 100).toFixed(1)
  }, [competitors])

  const engagementChartData = useMemo(() => {
    return competitors.map((c, i) => ({ name: c.name, rate: c.engagementRate, fill: CHART_COLORS[i % CHART_COLORS.length] }))
  }, [competitors])

  const followerChartData = useMemo(() => {
    const top = [...competitors].sort((a, b) => b.followers - a.followers).slice(0, 5)
    return top.map((c) => ({ name: c.name, followers: c.followers }))
  }, [competitors])

  // Compared competitors for side-by-side
  const comparedCompetitors = useMemo(() => {
    return competitors.filter((c) => compareIds.has(c.id))
  }, [competitors, compareIds])

  // Growth chart data for compared competitors
  const growthChartData = useMemo(() => {
    if (comparedCompetitors.length === 0) return []
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return months.map((month, i) => {
      const entry: Record<string, string | number> = { month }
      comparedCompetitors.forEach((c) => {
        const data = generateGrowthData(c)
        entry[c.name] = data[i].followers
      })
      return entry
    })
  }, [comparedCompetitors])

  // Radar data for compared competitors
  const radarData = useMemo(() => {
    if (comparedCompetitors.length < 2) return []
    return generateRadarData(comparedCompetitors)
  }, [comparedCompetitors])

  // Insights
  const insights = useMemo(() => {
    if (competitors.length === 0) return []
    const result: { id: string; icon: string; text: string; tag: string }[] = []
    const byEng = [...competitors].sort((a, b) => b.engagementRate - a.engagementRate)
    const best = byEng[0]
    if (best) result.push({ id: 'eng-highest', icon: '🎯', text: `${best.name} has the highest engagement rate at ${best.engagementRate}%, consider analyzing their content approach.`, tag: 'Engagement' })

    const byPosts = [...competitors].sort((a, b) => b.postsWeek - a.postsWeek)
    const most = byPosts[0]
    if (most) result.push({ id: 'post-freq', icon: '📊', text: `${most.name} posts most frequently at ${most.postsWeek} posts per week — evaluate if higher volume drives their growth.`, tag: 'Frequency' })

    const byGrowth = [...competitors].sort((a, b) => b.growthRate - a.growthRate)
    const fastest = byGrowth[0]
    if (fastest) result.push({ id: 'growth-fast', icon: '🚀', text: `${fastest.name} is the fastest growing competitor at +${fastest.growthRate}% growth rate.`, tag: 'Growth' })

    const avgPosts = competitors.reduce((s, c) => s + c.postsWeek, 0) / competitors.length
    const low = competitors.filter((c) => c.postsWeek < avgPosts)
    if (low.length > 0) result.push({ id: 'post-gap', icon: '⏰', text: `${low.map((c) => c.name).join(', ')} post${low.length === 1 ? 's' : ''} below average of ${avgPosts.toFixed(1)}/week — potential content gap.`, tag: 'Timing' })

    // Best time recommendation
    const timeMap: Record<string, number> = {}
    competitors.forEach((c) => { const t = c.bestTime || ''; if (t) timeMap[t] = (timeMap[t] || 0) + 1 })
    const bestTimes = Object.entries(timeMap).sort((a, b) => b[1] - a[1])
    if (bestTimes.length > 0) result.push({ id: 'best-time', icon: '🕐', text: `Recommended posting time: ${bestTimes[0][0]} — when most competitors are active. Consider posting 30min before.`, tag: 'Timing' })

    const avgEng = competitors.reduce((s, c) => s + c.engagementRate, 0) / competitors.length
    const under = competitors.filter((c) => c.engagementRate < avgEng)
    if (under.length > 0) result.push({ id: 'eng-low', icon: '📈', text: `${under.map((c) => c.name).join(', ')} ${under.length === 1 ? 'has' : 'have'} below-average engagement (${avgEng.toFixed(1)}%) — opportunity to differentiate.`, tag: 'Strategy' })

    return result
  }, [competitors])

  // Opportunities
  const opportunities = useMemo(() => {
    if (competitors.length === 0) return []
    const result: { id: string; text: string; priority: 'High' | 'Medium' | 'Low' }[] = []
    const byEng = [...competitors].sort((a, b) => a.engagementRate - b.engagementRate)
    const low = byEng[0]
    if (low && low.engagementRate < 3) result.push({ id: 'opp-low-eng', text: `${low.name}'s engagement is only ${low.engagementRate}% — their audience may be underserved.`, priority: 'High' })
    const byPosts = [...competitors].sort((a, b) => a.postsWeek - b.postsWeek)
    const least = byPosts[0]
    if (least && least.postsWeek <= 3) result.push({ id: 'opp-low-posts', text: `${least.name} posts only ${least.postsWeek}x per week — increase posting during their quiet periods.`, priority: 'Medium' })
    const platforms = [...new Set(competitors.map((c) => c.platform.toLowerCase()))]
    const allPlatforms = ['instagram', 'twitter', 'youtube', 'tiktok', 'linkedin']
    const missing = allPlatforms.filter((p) => !platforms.includes(p))
    if (missing.length > 0) result.push({ id: 'opp-platform', text: `No competitors on ${missing.join(', ')} — first-mover advantage.`, priority: 'High' })
    if (competitors.length >= 3) result.push({ id: 'opp-content', text: `With ${competitors.length} competitors, diversifying formats (Reels, carousels, stories) could differentiate.`, priority: 'Medium' })
    return result
  }, [competitors])

  // ── Stats ──
  const stats = [
    { label: 'Tracked Competitors', value: String(competitors.length), change: competitors.length > 0 ? 'Active tracking' : 'None tracked', icon: Users, accent: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Avg Growth Rate', value: `+${avgGrowth}%`, change: competitors.length > 1 ? 'Across all tracked' : '', icon: TrendingUp, accent: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Top Market Share', value: `${marketShare}%`, change: competitors.length > 0 ? 'By follower count' : '', icon: PieChart, accent: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30' },
    { label: 'Opportunities', value: String(opportunities.length), change: `${opportunities.filter((o) => o.priority === 'High').length} high priority`, icon: Lightbulb, accent: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30' },
  ]

  // ── Loading ──
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-56" /><Skeleton className="mt-2 h-4 w-80" /></div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (<Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
        </div>
      </div>
    )
  }

  if (error && competitors.length === 0) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold tracking-tight">Competitor Analysis</h1><p className="text-sm text-muted-foreground">Track and compare competitor social media performance.</p></div>
        <Card className="border-red-200"><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-3 size-10 text-red-500" /><p className="font-medium text-red-600">{error}</p>
          <Button variant="outline" className="mt-4 gap-2" onClick={fetchCompetitors}><RefreshCw className="size-4" /> Try Again</Button>
        </CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Competitor Analysis</h1>
          <p className="text-sm text-muted-foreground">Track and compare competitor social media performance across platforms.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchCompetitors}><RefreshCw className="size-4" /><span className="hidden sm:inline">Refresh</span></Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="size-4" /><span>Add Competitor</span></Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Track a New Competitor</DialogTitle>
                <DialogDescription>Enter the competitor&apos;s details. We&apos;ll search for real public data about them.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="comp-name" className="text-sm font-medium">Name</label>
                  <Input id="comp-name" placeholder="e.g. Nike" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="comp-handle" className="text-sm font-medium">Username / Handle</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input id="comp-handle" placeholder="@competitor" className="pl-9" value={addForm.handle} onChange={(e) => {
                      const handle = e.target.value
                      setAddForm((f) => ({ ...f, handle }))
                      if (handle.trim().length < 3) setSearchHint(null)
                    }} />
                    {searchingHint && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />}
                  </div>
                  {searchHint && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Search className="size-3" /> {searchHint}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Platform</label>
                  <Select value={addForm.platform} onValueChange={(v) => setAddForm((f) => ({ ...f, platform: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="twitter">Twitter / X</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowAddDialog(false); setSearchHint(null) }}>Cancel</Button>
                <Button onClick={handleAdd} disabled={!addForm.name.trim() || !addForm.platform || !addForm.handle.trim() || tracking}>
                  {tracking ? (<><span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Searching…</>) : (<><Target className="mr-2 size-4" /> Track</>)}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error */}
      {error && competitors.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="size-4 shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="size-4" /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label}><CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${s.accent}`}><Icon className="size-5" /></div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                  {s.change && <p className="text-xs text-muted-foreground">{s.change}</p>}
                </div>
              </div>
            </CardContent></Card>
          )
        })}
      </div>

      {/* Empty */}
      {competitors.length === 0 && (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="mb-3 size-12 text-muted-foreground/40" /><h3 className="text-lg font-semibold">No competitors tracked yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md">Add competitors to start tracking their social media performance.</p>
          <Button className="mt-4 gap-2" onClick={() => setShowAddDialog(true)}><Plus className="size-4" /> Add Your First Competitor</Button>
        </CardContent></Card>
      )}

      {/* Tabs */}
      {competitors.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 sm:w-auto sm:inline-grid">
            <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="size-3.5 hidden sm:block" /> Overview</TabsTrigger>
            <TabsTrigger value="comparison" className="gap-1.5"><Trophy className="size-3.5 hidden sm:block" /> Compare</TabsTrigger>
            <TabsTrigger value="growth" className="gap-1.5"><TrendingUp className="size-3.5 hidden sm:block" /> Growth</TabsTrigger>
            <TabsTrigger value="insights" className="gap-1.5"><Lightbulb className="size-3.5 hidden sm:block" /> Insights</TabsTrigger>
            <TabsTrigger value="opportunities" className="gap-1.5"><Zap className="size-3.5 hidden sm:block" /> Gaps</TabsTrigger>
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Follower Comparison</CardTitle><CardDescription>Top competitors by follower count</CardDescription></CardHeader>
                <CardContent>
                  <div className="h-72 w-full">{followerChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%"><BarChart data={followerChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(v: number) => fmt(v)} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => [fmt(value), 'Followers']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="followers" fill="hsl(160, 84%, 39%)" radius={[6, 6, 0, 0]} />
                    </BarChart></ResponsiveContainer>
                  ) : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data</div>}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Engagement Rate</CardTitle><CardDescription>Comparing engagement across competitors (%)</CardDescription></CardHeader>
                <CardContent>
                  <div className="h-72 w-full">{engagementChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%"><BarChart data={engagementChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} unit="%" />
                      <Tooltip formatter={(value: number) => [`${value}%`, 'Engagement']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="rate" radius={[6, 6, 0, 0]}>{engagementChartData.map((entry, idx) => <rect key={idx} fill={entry.fill} />)}</Bar>
                    </BarChart></ResponsiveContainer>
                  ) : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data</div>}</div>
                </CardContent>
              </Card>
            </div>

            {/* Best Posting Time Recommendation */}
            {competitors.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-500" />
                    <div><CardTitle className="text-base">Best Posting Times</CardTitle><CardDescription>Optimal times based on competitor activity patterns</CardDescription></div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {competitors.slice(0, 8).map((c) => (
                      <div key={c.id} className="rounded-lg border p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{c.handle}</span>
                          <Badge variant="secondary" className={`text-[10px] ${platformColor(c.platform)}`}>{c.platform}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{c.postsWeek} posts/week</p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-medium text-emerald-600">{c.bestTime || 'Not set'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Snapshot table */}
            <Card>
              <CardHeader className="pb-3"><div className="flex items-center justify-between"><div><CardTitle className="text-base">Competitor Snapshot</CardTitle><CardDescription>Select competitors to compare in the Compare tab</CardDescription></div></div></CardHeader>
              <CardContent>
                <ScrollArea className="max-h-80"><Table>
                  <TableHeader><TableRow>
                    <TableHead className="w-8"></TableHead><TableHead>Account</TableHead><TableHead>Platform</TableHead><TableHead className="text-right">Followers</TableHead><TableHead className="text-right hidden sm:table-cell">Engagement</TableHead><TableHead className="text-right hidden md:table-cell">Growth</TableHead><TableHead className="w-10"></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>{competitors.map((c) => (
                    <TableRow key={c.id} className={compareIds.has(c.id) ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <button onClick={() => toggleCompare(c.id)} className="flex items-center justify-center" title="Toggle comparison">
                          <div className={`h-4 w-4 rounded border-2 transition-colors flex items-center justify-center ${compareIds.has(c.id) ? 'border-primary bg-primary' : 'border-muted-foreground/30 hover:border-primary/50'}`}>
                            {compareIds.has(c.id) && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                          </div>
                        </button>
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          {c.handle}
                          {c.isEstimated && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground" title="Web search found no verifiable figures for this competitor yet">
                              Estimated
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className={`text-[11px] ${platformColor(c.platform)}`}>{c.platform}</Badge></TableCell>
                      <TableCell className="text-right">{fmt(c.followers)}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">{c.engagementRate}%</TableCell>
                      <TableCell className="text-right hidden md:table-cell text-emerald-600 dark:text-emerald-400">+{c.growthRate}%</TableCell>
                      <TableCell><span className="flex items-center gap-1"><Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground" title="Refresh metrics" onClick={() => handleRefresh(c.id)} disabled={refreshingId === c.id}>
                        {refreshingId === c.id ? <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <RefreshCw className="size-3.5" />}
                      </Button><Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-red-600" onClick={() => handleDelete(c.id)} disabled={deletingId === c.id}>
                        {deletingId === c.id ? <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Trash2 className="size-3.5" />}
                      </Button></span></TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table></ScrollArea>
                {compareIds.size > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">{compareIds.size} selected</Badge>
                    <Button size="sm" variant="outline" onClick={() => setActiveTab('comparison')}>Compare Selected <ArrowRight className="ml-1 size-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setCompareIds(new Set())}>Clear</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Comparison Tab ── */}
          <TabsContent value="comparison" className="mt-6 space-y-6">
            {comparedCompetitors.length < 2 ? (
              <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Trophy className="mb-3 size-10 text-muted-foreground/40" /><h3 className="text-lg font-semibold">Select 2-3 Competitors to Compare</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-md">Go to the Overview tab and check the boxes next to competitors you want to compare side by side.</p>
              </CardContent></Card>
            ) : (
              <>
                {/* Side-by-side cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {comparedCompetitors.map((c, i) => (
                    <Card key={c.id} className="relative overflow-hidden">
                      <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: CHART_COLORS[i] }} />
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{c.name}</CardTitle>
                            <CardDescription className="text-xs">@{c.handle} · {c.platform}</CardDescription>
                          </div>
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => toggleCompare(c.id)}><X className="size-3.5" /></Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div><p className="text-xs text-muted-foreground">Followers</p><p className="text-lg font-bold">{fmt(c.followers)}</p></div>
                          <div><p className="text-xs text-muted-foreground">Engagement</p><p className="text-lg font-bold">{c.engagementRate}%</p></div>
                          <div><p className="text-xs text-muted-foreground">Growth</p><p className="text-lg font-bold text-emerald-600">+{c.growthRate}%</p></div>
                          <div><p className="text-xs text-muted-foreground">Posts/Week</p><p className="text-lg font-bold">{c.postsWeek}</p></div>
                        </div>
                        <Separator />
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="size-3.5" /> Best time: <span className="font-medium text-foreground">{c.bestTime || '—'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Radar chart */}
                {radarData.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-base">Metrics Comparison Radar</CardTitle><CardDescription>Normalized comparison across key metrics</CardDescription></CardHeader>
                    <CardContent>
                      <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData}>
                            <PolarGrid /><PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} /><PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                            {comparedCompetitors.map((c, i) => (
                              <Radar key={c.id} name={c.name} dataKey={c.name} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.15} />
                            ))}
                            <Legend /><Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Benchmark table */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Benchmark Comparison</CardTitle><CardDescription>Side-by-side metrics comparison</CardDescription></CardHeader>
                  <CardContent><div className="overflow-x-auto"><Table>
                    <TableHeader><TableRow>
                      <TableHead>Metric</TableHead>{comparedCompetitors.map((c) => <TableHead key={c.id} className="text-right">{c.name}</TableHead>)}
                    </TableRow></TableHeader>
                    <TableBody>
                      {[
                        { label: 'Followers', fn: (c: Competitor) => fmt(c.followers), best: bestFollowers },
                        { label: 'Engagement Rate', fn: (c: Competitor) => `${c.engagementRate}%`, best: bestEngagement },
                        { label: 'Growth Rate', fn: (c: Competitor) => `+${c.growthRate}%`, best: bestGrowth },
                        { label: 'Posts/Week', fn: (c: Competitor) => String(c.postsWeek), best: bestPosts },
                        { label: 'Avg Likes', fn: (c: Competitor) => fmt(c.avgLikes), best: bestLikes },
                        { label: 'Best Time', fn: (c: Competitor) => c.bestTime || '—' },
                        { label: 'Platform', fn: (c: Competitor) => c.platform },
                      ].map((row) => (
                        <TableRow key={row.label}>
                          <TableCell className="font-medium">{row.label}</TableCell>
                          {comparedCompetitors.map((c) => (
                            <TableCell key={c.id} className={`text-right tabular-nums ${row.best && c.id === row.best ? 'bg-emerald-50 dark:bg-emerald-950/30 font-semibold' : ''}`}>{row.fn(c)}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table></div></CardContent>
                </Card>
              </>
            )}

            {/* Full comparison table */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">All Competitors Table</CardTitle><CardDescription>Click headers to sort · Check boxes for comparison</CardDescription></CardHeader>
              <CardContent><ScrollArea className="max-h-[540px]"><Table>
                <TableHeader><TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="min-w-[140px]"><button onClick={() => toggleSort('handle')} className="inline-flex items-center gap-0 hover:text-foreground transition-colors font-semibold text-muted-foreground text-xs uppercase">Account <SortIcon dir={sort.col === 'handle' ? sort.dir : null} /></button></TableHead>
                  <TableHead className="text-right min-w-[90px]"><button onClick={() => toggleSort('followers')} className="inline-flex items-center gap-0 hover:text-foreground transition-colors font-semibold text-muted-foreground text-xs uppercase">Followers <SortIcon dir={sort.col === 'followers' ? sort.dir : null} /></button></TableHead>
                  <TableHead className="text-right min-w-[90px]"><button onClick={() => toggleSort('engagementRate')} className="inline-flex items-center gap-0 hover:text-foreground transition-colors font-semibold text-muted-foreground text-xs uppercase">Engagement <SortIcon dir={sort.col === 'engagementRate' ? sort.dir : null} /></button></TableHead>
                  <TableHead className="text-right min-w-[90px]"><button onClick={() => toggleSort('growthRate')} className="inline-flex items-center gap-0 hover:text-foreground transition-colors font-semibold text-muted-foreground text-xs uppercase">Growth <SortIcon dir={sort.col === 'growthRate' ? sort.dir : null} /></button></TableHead>
                  <TableHead className="text-right min-w-[90px] hidden md:table-cell">Avg Likes</TableHead>
                  <TableHead className="text-right min-w-[90px] hidden lg:table-cell">Best Time</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow></TableHeader>
                <TableBody>{sorted.map((c) => (
                  <TableRow key={c.id} className={compareIds.has(c.id) ? 'bg-primary/5' : ''}>
                    <TableCell><button onClick={() => toggleCompare(c.id)} className="flex items-center justify-center">
                      <div className={`h-4 w-4 rounded border-2 transition-colors flex items-center justify-center ${compareIds.has(c.id) ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
                        {compareIds.has(c.id) && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                      </div>
                    </button></TableCell>
                    <TableCell><span className="font-semibold">{c.handle}</span><span className="text-xs text-muted-foreground ml-1">{c.name}</span></TableCell>
                    <TableCell className={`text-right tabular-nums ${c.id === bestFollowers ? 'bg-emerald-50 dark:bg-emerald-950/30 font-semibold' : ''}`}>{fmt(c.followers)}</TableCell>
                    <TableCell className={`text-right tabular-nums ${c.id === bestEngagement ? 'bg-emerald-50 dark:bg-emerald-950/30 font-semibold' : ''}`}>{c.engagementRate}%</TableCell>
                    <TableCell className={`text-right tabular-nums ${c.id === bestGrowth ? 'bg-emerald-50 dark:bg-emerald-950/30 font-semibold' : ''}`}><span className="text-emerald-600">+{c.growthRate}%</span></TableCell>
                    <TableCell className="text-right tabular-nums hidden md:table-cell">{fmt(c.avgLikes)}</TableCell>
                    <TableCell className="text-right hidden lg:table-cell"><span className="text-xs text-muted-foreground">{c.bestTime || '—'}</span></TableCell>
                    <TableCell><span className="flex items-center gap-1"><Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground" title="Refresh metrics" onClick={() => handleRefresh(c.id)} disabled={refreshingId === c.id}>
                        {refreshingId === c.id ? <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <RefreshCw className="size-3.5" />}
                      </Button><Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-red-600" onClick={() => handleDelete(c.id)} disabled={deletingId === c.id}>
                      {deletingId === c.id ? <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Trash2 className="size-3.5" />}
                    </Button></span></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table></ScrollArea></CardContent>
            </Card>
          </TabsContent>

          {/* ── Growth Tab ── */}
          <TabsContent value="growth" className="mt-6 space-y-6">
            {comparedCompetitors.length === 0 ? (
              <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <TrendingUp className="mb-3 size-10 text-muted-foreground/40" /><h3 className="text-lg font-semibold">Select Competitors for Growth Analysis</h3>
                <p className="mt-1 text-sm text-muted-foreground">Select 1-3 competitors in the Overview tab to see their growth trajectory.</p>
              </CardContent></Card>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Follower Growth Trend (12 months)</CardTitle><CardDescription>Projected growth based on current growth rate</CardDescription></CardHeader>
                  <CardContent>
                    <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%">
                      <LineChart data={growthChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(v: number) => fmt(v)} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value: number) => [fmt(value), 'Followers']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Legend />
                        {comparedCompetitors.map((c, i) => (
                          <Line key={c.id} type="monotone" dataKey={c.name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer></div>
                  </CardContent>
                </Card>

                {/* Growth cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {comparedCompetitors.map((c, i) => (
                    <Card key={c.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                          <span className="font-semibold text-sm">{c.name}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Current</span><span className="font-medium">{fmt(c.followers)}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Growth Rate</span><span className="font-medium text-emerald-600">+{c.growthRate}%</span></div>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Est. 12mo</span><span className="font-medium">{fmt(Math.round(c.followers * (1 + c.growthRate / 100)))}</span></div>
                          <Progress value={Math.min(c.growthRate * 4, 100)} className="h-2 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Insights Tab ── */}
          <TabsContent value="insights" className="mt-6 space-y-6">
            <Card>
              <CardHeader><div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Lightbulb className="size-4.5" /></div>
                <div><CardTitle className="text-base">What&apos;s Working for Competitors</CardTitle><CardDescription>Actionable insights derived from real competitor data analysis.</CardDescription></div>
              </div></CardHeader>
              <CardContent>{insights.length > 0 ? (<>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{insights.map((insight) => {
                  const applied = appliedSet.has(insight.id)
                  return (
                    <Card key={insight.id} className={`relative overflow-hidden transition-all hover:shadow-md ${applied ? 'ring-2 ring-emerald-500/40' : ''}`}>
                      <CardContent className="p-4"><div className="flex items-start gap-3"><span className="text-xl mt-0.5">{insight.icon}</span>
                        <div className="flex-1 min-w-0 space-y-3">
                          <Badge variant="outline" className="text-[10px]">{insight.tag}</Badge>
                          <p className="text-sm leading-relaxed">{insight.text}</p>
                          <Button size="sm" variant={applied ? 'outline' : 'default'} className="w-full gap-1.5" onClick={() => applyStrategy(insight.id)} disabled={applied}>
                            {applied ? (<><Eye className="size-3.5" /> Applied</>) : (<><Zap className="size-3.5" /> Apply Strategy</>)}
                          </Button>
                        </div></div>
                        {applied && <div className="absolute right-2 top-2"><Badge className="bg-emerald-500 text-white text-[10px]">Active</Badge></div>}
                      </CardContent></Card>
                  )
                })}</div>
                {appliedSet.size > 0 && (
                  <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                    <div className="flex items-center gap-2"><Trophy className="size-4 text-emerald-600" /><p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{appliedSet.size} strateg{appliedSet.size === 1 ? 'y' : 'ies'} applied</p></div>
                    <Progress value={(appliedSet.size / insights.length) * 100} className="mt-3 h-2" />
                  </div>
                )}
              </>) : (<div className="flex flex-col items-center justify-center py-12 text-center"><Lightbulb className="mb-3 size-10 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">Add at least 2 competitors to generate insights.</p></div>)}</CardContent>
            </Card>
          </TabsContent>

          {/* ── Opportunities Tab ── */}
          <TabsContent value="opportunities" className="mt-6 space-y-6">
            <Card>
              <CardHeader><div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><AlertCircle className="size-4.5" /></div>
                <div><CardTitle className="text-base">Opportunity Alerts</CardTitle><CardDescription>Opportunities detected from competitor data patterns.</CardDescription></div>
              </div></CardHeader>
              <CardContent>{opportunities.length > 0 ? (<>
                <div className="space-y-3">{opportunities.map((opp) => (
                  <div key={opp.id} className="group flex flex-col gap-3 rounded-lg border p-4 transition-all hover:bg-muted/50 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><Badge variant="secondary" className={`text-[10px] ${priorityColor(opp.priority)}`}>{opp.priority} Priority</Badge></div><p className="text-sm leading-relaxed">{opp.text}</p></div>
                    <Button size="sm" variant={opp.priority === 'High' ? 'default' : 'outline'} className="shrink-0 gap-1.5 self-start sm:self-center"><ArrowRight className="size-3.5" /> Act Now</Button>
                  </div>
                ))}</div>
              </>) : (<div className="flex flex-col items-center justify-center py-12 text-center"><Zap className="mb-3 size-10 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">No opportunities detected yet.</p></div>)}</CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
