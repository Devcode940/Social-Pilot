'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Heart,
  UserPlus,
  TrendingUp,
  Zap,
  Play,
  Pause,
  Square,
  Settings,
  Plus,
  Clock,
  Target,
  MessageSquare,
  Eye,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  Trash2,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type CampaignType = 'Like' | 'Follow' | 'Comment' | 'View'
type CampaignStatus = 'active' | 'paused' | 'completed'
type Platform = 'Instagram' | 'Twitter' | 'TikTok' | 'Facebook' | 'YouTube' | 'LinkedIn'
type SpeedLevel = 'slow' | 'normal' | 'fast'

interface Campaign {
  id: string
  name: string
  type: CampaignType
  platforms: Platform[]
  currentCount: number
  targetCount: number
  status: CampaignStatus
  startedAt: string
  endedAt?: string | null
  rules?: string | null
  createdAt: string
  updatedAt: string
}

interface ActivityEntry {
  id: string
  action: string
  platform: Platform
  timestamp: string
  status: 'success' | 'failed' | 'pending'
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const typeConfig: Record<
  CampaignType,
  { icon: typeof Heart; color: string; bg: string }
> = {
  Like: { icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/40' },
  Follow: { icon: UserPlus, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  Comment: { icon: MessageSquare, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  View: { icon: Eye, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/40' },
}

const statusConfig: Record<
  CampaignStatus,
  { label: string; color: string }
> = {
  active: { label: 'Active', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
  paused: { label: 'Paused', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20' },
  completed: { label: 'Completed', color: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20' },
}

const platformColors: Record<Platform, string> = {
  Instagram: 'bg-gradient-to-r from-rose-500 to-orange-400 text-white',
  Twitter: 'bg-sky-500 text-white',
  TikTok: 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
  Facebook: 'bg-blue-600 text-white',
  YouTube: 'bg-red-600 text-white',
  LinkedIn: 'bg-sky-700 text-white',
}

const formatNumber = (n: number) =>
  n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : n.toString()

function parsePlatforms(raw: string | null | undefined): Platform[] {
  if (!raw) return []
  return raw.split(',').map((s) => s.trim()) as Platform[]
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `${diffD}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function mapCampaign(raw: Record<string, unknown>): Campaign {
  return {
    id: raw.id as string,
    name: raw.name as string,
    type: capitalize(raw.type as string) as CampaignType,
    platforms: parsePlatforms(raw.platforms as string | null),
    currentCount: raw.currentCount as number ?? 0,
    targetCount: raw.targetCount as number ?? 100,
    status: raw.status as CampaignStatus,
    startedAt: raw.startedAt as string,
    endedAt: raw.endedAt as string | null ?? null,
    rules: raw.rules as string | null,
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LikerPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null)

  // New campaign form
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<CampaignType>('Like')
  const [newPlatforms, setNewPlatforms] = useState<Platform[]>([])
  const [newTarget, setNewTarget] = useState('')
  const [newSpeed, setNewSpeed] = useState<SpeedLevel>('normal')
  const [followBackOnly, setFollowBackOnly] = useState(false)
  const [skipVerified, setSkipVerified] = useState(false)
  const [targetHashtags, setTargetHashtags] = useState('')
  const [excludeAccounts, setExcludeAccounts] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ── Fetch campaigns ──────────────────────────────────────────────────────

  // Pure data loader: no state writes, safe to drive from effects or handlers.
  const loadCampaigns = useCallback(async (): Promise<Campaign[]> => {
    const res = await fetch('/api/campaigns')
    if (!res.ok) throw new Error('Failed to fetch campaigns')
    const data = (await res.json()) as Record<string, unknown>[]
    return data.map(mapCampaign)
  }, [])

  // Handler entry point (refresh buttons etc.): sets state from an event.
  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setCampaigns(await loadCampaigns())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [loadCampaigns])

  // Mount-only load: every setState below runs in a promise continuation
  // (post-await), never synchronously in the effect body.
  useEffect(() => {
    let cancelled = false
    loadCampaigns()
      .then((data) => {
        if (cancelled) return
        setCampaigns(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadCampaigns])

  // ── Create campaign ──────────────────────────────────────────────────────

  const handleCreateCampaign = async () => {
    if (!newName.trim() || newPlatforms.length === 0 || !newTarget) return

    setSubmitting(true)
    try {
      const rules: Record<string, unknown> = {
        speed: newSpeed,
        followBackOnly,
        skipVerified,
      }
      if (targetHashtags.trim()) rules.targetHashtags = targetHashtags.trim().split('\n').filter(Boolean)
      if (excludeAccounts.trim()) rules.excludeAccounts = excludeAccounts.trim().split('\n').filter(Boolean)

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          type: newType.toLowerCase(),
          platforms: newPlatforms.join(','),
          targetCount: parseInt(newTarget, 10),
          rules,
        }),
      })

      if (!res.ok) throw new Error('Failed to create campaign')

      resetForm()
      setShowCreateDialog(false)
      await fetchCampaigns()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setNewName('')
    setNewType('Like')
    setNewPlatforms([])
    setNewTarget('')
    setNewSpeed('normal')
    setFollowBackOnly(false)
    setSkipVerified(false)
    setTargetHashtags('')
    setExcludeAccounts('')
  }

  // ── Pause / Resume ───────────────────────────────────────────────────────

  const toggleCampaignStatus = async (campaign: Campaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active'
    try {
      const res = await fetch('/api/campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: campaign.id, status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update campaign')
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, status: newStatus } : c))
      )
    } catch (err) {
      console.error(err)
    }
  }

  // ── Stop (complete) ──────────────────────────────────────────────────────

  const stopCampaign = async (id: string) => {
    try {
      const res = await fetch('/api/campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'completed' }),
      })
      if (!res.ok) throw new Error('Failed to stop campaign')
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'completed' as CampaignStatus } : c))
      )
    } catch (err) {
      console.error(err)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  const deleteCampaign = async (id: string) => {
    try {
      const res = await fetch(`/api/campaigns?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete campaign')
      setCampaigns((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  // ── Platform toggle ──────────────────────────────────────────────────────

  const togglePlatform = (p: Platform) => {
    setNewPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const filteredCampaigns =
    filter === 'all'
      ? campaigns
      : campaigns.filter((c) => c.status === filter)

  const activeCount = campaigns.filter((c) => c.status === 'active').length
  const totalLikes = campaigns
    .filter((c) => c.type === 'Like')
    .reduce((sum, c) => sum + c.currentCount, 0)
  const totalFollows = campaigns
    .filter((c) => c.type === 'Follow')
    .reduce((sum, c) => sum + c.currentCount, 0)

  // Activity log derived from recent campaign updates
  const activityLog: ActivityEntry[] = campaigns.slice(0, 10).flatMap((c) => {
    const items: ActivityEntry[] = []
    const p = c.platforms[0] ?? 'Instagram'
    items.push({
      id: `${c.id}-created`,
      action: `Campaign "${c.name}" created`,
      platform: p,
      timestamp: timeAgo(c.createdAt),
      status: 'success',
    })
    if (c.status === 'paused' || c.endedAt) {
      items.push({
        id: `${c.id}-status`,
        action: `Campaign "${c.name}" ${c.status === 'paused' ? 'paused' : 'completed'}`,
        platform: p,
        timestamp: timeAgo(c.updatedAt),
        status: c.status === 'paused' ? 'pending' : 'success',
      })
    }
    return items
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
              Auto Liker &amp; Campaigns
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage your automated engagement campaigns across platforms
            </p>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700">
                <Plus className="h-4 w-4" />
                New Campaign
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl">Create New Campaign</DialogTitle>
                <DialogDescription>
                  Set up an automated engagement campaign for your social media accounts.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 py-4">
                {/* Campaign Name */}
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    placeholder="e.g. Instagram Growth Push"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>

                {/* Type */}
                <div className="space-y-2">
                  <Label>Campaign Type</Label>
                  <Select
                    value={newType}
                    onValueChange={(v) => setNewType(v as CampaignType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Like">
                        <span className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-rose-500" /> Auto Like
                        </span>
                      </SelectItem>
                      <SelectItem value="Follow">
                        <span className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4 text-emerald-500" /> Auto Follow
                        </span>
                      </SelectItem>
                      <SelectItem value="Comment">
                        <span className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-amber-500" /> Auto Comment
                        </span>
                      </SelectItem>
                      <SelectItem value="View">
                        <span className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-violet-500" /> Auto View
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Platforms */}
                <div className="space-y-3">
                  <Label>Platforms</Label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {(
                      ['Instagram', 'Twitter', 'TikTok', 'Facebook', 'YouTube', 'LinkedIn'] as Platform[]
                    ).map((p) => (
                      <label
                        key={p}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors ${
                          newPlatforms.includes(p)
                            ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950/40'
                            : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                        }`}
                      >
                        <Checkbox
                          checked={newPlatforms.includes(p)}
                          onCheckedChange={() => togglePlatform(p)}
                        />
                        <span className="text-sm font-medium">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Target & Speed row */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="target-count">Target Count</Label>
                    <Input
                      id="target-count"
                      type="number"
                      placeholder="e.g. 5000"
                      min={1}
                      value={newTarget}
                      onChange={(e) => setNewTarget(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Speed</Label>
                    <Select
                      value={newSpeed}
                      onValueChange={(v) => setNewSpeed(v as SpeedLevel)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slow">Slow — 50/day</SelectItem>
                        <SelectItem value="normal">Normal — 200/day</SelectItem>
                        <SelectItem value="fast">Fast — 500/day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Rules */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-zinc-500" />
                    <Label className="text-base font-semibold">Rules &amp; Filters</Label>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                    <div>
                      <p className="text-sm font-medium">Only interact with accounts that follow back</p>
                      <p className="text-xs text-zinc-500">Reduces wasted interactions</p>
                    </div>
                    <Switch checked={followBackOnly} onCheckedChange={setFollowBackOnly} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                    <div>
                      <p className="text-sm font-medium">Skip verified accounts</p>
                      <p className="text-xs text-zinc-500">Focus on organic growth targets</p>
                    </div>
                    <Switch checked={skipVerified} onCheckedChange={setSkipVerified} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target-hashtags">Target specific hashtags</Label>
                    <Textarea
                      id="target-hashtags"
                      placeholder="#marketing #growth #socialmedia (one per line)"
                      rows={3}
                      value={targetHashtags}
                      onChange={(e) => setTargetHashtags(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exclude-accounts">Exclude accounts</Label>
                    <Textarea
                      id="exclude-accounts"
                      placeholder="@competitor1 @competitor2 (one per line)"
                      rows={3}
                      value={excludeAccounts}
                      onChange={(e) => setExcludeAccounts(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm()
                    setShowCreateDialog(false)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                  onClick={handleCreateCampaign}
                  disabled={!newName.trim() || newPlatforms.length === 0 || !newTarget || submitting}
                >
                  {submitting ? 'Creating...' : 'Create Campaign'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* ─── Stats Row ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={<Zap className="h-5 w-5 text-amber-500" />}
              label="Active Campaigns"
              value={activeCount}
              badge={`${campaigns.length} total`}
              badgeColor="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            />
            <StatCard
              icon={<Heart className="h-5 w-5 text-rose-500" />}
              label="Total Likes Given"
              value={formatNumber(totalLikes)}
              badge={`from ${campaigns.filter(c => c.type === 'Like').length} campaigns`}
              badgeColor="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            />
            <StatCard
              icon={<UserPlus className="h-5 w-5 text-emerald-500" />}
              label="Total Follows"
              value={formatNumber(totalFollows)}
              badge={`from ${campaigns.filter(c => c.type === 'Follow').length} campaigns`}
              badgeColor="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5 text-teal-500" />}
              label="Completion Rate"
              value={`${campaigns.length > 0 ? Math.round((campaigns.filter(c => c.status === 'completed').length / campaigns.length) * 100) : 0}%`}
              badge={`${campaigns.filter(c => c.status === 'completed').length} completed`}
              badgeColor="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            />
          </div>
        )}

        {/* ─── Main Content ───────────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Campaigns */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-lg font-semibold">Active Campaigns</CardTitle>
                  <Tabs
                    value={filter}
                    onValueChange={setFilter}
                    className="w-full sm:w-auto"
                  >
                    <TabsList className="h-9 w-full sm:w-auto">
                      <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                      <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
                      <TabsTrigger value="paused" className="text-xs">Paused</TabsTrigger>
                      <TabsTrigger value="completed" className="text-xs">Completed</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <CardDescription>
                  Manage and monitor your automated engagement campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="flex items-start gap-3">
                          <Skeleton className="h-10 w-10 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <Skeleton className="h-2 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                    <XCircle className="mb-3 h-10 w-10 text-red-400" />
                    <p className="text-sm text-red-500">{error}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={fetchCampaigns}>
                      Retry
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredCampaigns.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                        <Target className="mb-3 h-10 w-10" />
                        <p className="text-sm">No campaigns found</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => setShowCreateDialog(true)}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Create Campaign
                        </Button>
                      </div>
                    ) : (
                      filteredCampaigns.map((campaign) => {
                        const tCfg = typeConfig[campaign.type] ?? typeConfig.Like
                        const sCfg = statusConfig[campaign.status] ?? statusConfig.active
                        const TypeIcon = tCfg.icon
                        const pct = campaign.targetCount > 0 ? Math.round((campaign.currentCount / campaign.targetCount) * 100) : 0
                        const isExpanded = expandedCampaign === campaign.id

                        return (
                          <div
                            key={campaign.id}
                            className="group rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                          >
                            {/* Row 1: Name + Type + Status */}
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${tCfg.bg}`}
                                >
                                  <TypeIcon className={`h-5 w-5 ${tCfg.color}`} />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                                    {campaign.name}
                                  </h3>
                                  <p className="text-xs text-zinc-500">
                                    Started {new Date(campaign.startedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={sCfg.color}>{sCfg.label}</Badge>
                                <Badge
                                  variant="secondary"
                                  className="flex items-center gap-1"
                                >
                                  <TypeIcon className="h-3 w-3" />
                                  {campaign.type}
                                </Badge>
                              </div>
                            </div>

                            {/* Row 2: Platforms */}
                            {campaign.platforms.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {campaign.platforms.map((p) => {
                                  const pColor = platformColors[p] ?? platformColors.Instagram
                                  return (
                                    <span
                                      key={p}
                                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${pColor}`}
                                    >
                                      {p}
                                    </span>
                                  )
                                })}
                              </div>
                            )}

                            {/* Row 3: Progress */}
                            <div className="mt-4 space-y-1.5">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                  {formatNumber(campaign.currentCount)} / {formatNumber(campaign.targetCount)}
                                </span>
                                <span className="text-zinc-500">{pct}%</span>
                              </div>
                              <Progress
                                value={pct}
                                className={`h-2 ${
                                  campaign.status === 'completed'
                                    ? '[&>div]:bg-zinc-400'
                                    : campaign.status === 'paused'
                                      ? '[&>div]:bg-amber-500'
                                      : '[&>div]:bg-emerald-500'
                                }`}
                              />
                            </div>

                            {/* Expand toggle */}
                            <button
                              onClick={() =>
                                setExpandedCampaign(isExpanded ? null : campaign.id)
                              }
                              className="mt-3 flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                              {isExpanded ? 'Less details' : 'More details'}
                            </button>

                            {/* Expanded info */}
                            {isExpanded && (
                              <div className="mt-3 animate-in slide-in-from-top-2 duration-200 space-y-2">
                                {campaign.rules && (
                                  <div className="rounded-lg bg-muted/50 p-3">
                                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Rules</p>
                                    <pre className="mt-1 text-xs text-zinc-500 whitespace-pre-wrap">
                                      {JSON.stringify(JSON.parse(campaign.rules), null, 2)}
                                    </pre>
                                  </div>
                                )}
                                <p className="text-xs text-zinc-500">
                                  Created: {new Date(campaign.createdAt).toLocaleString()}
                                  {campaign.updatedAt !== campaign.createdAt && ` · Updated: ${new Date(campaign.updatedAt).toLocaleString()}`}
                                </p>
                              </div>
                            )}

                            {/* Actions */}
                            <Separator className="my-3" />
                            <div className="flex items-center gap-2">
                              {campaign.status !== 'completed' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 text-xs"
                                  onClick={() => toggleCampaignStatus(campaign)}
                                >
                                  {campaign.status === 'active' ? (
                                    <>
                                      <Pause className="h-3.5 w-3.5" />
                                      Pause
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-3.5 w-3.5" />
                                      Resume
                                    </>
                                  )}
                                </Button>
                              )}
                              {campaign.status !== 'completed' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 text-xs text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-300"
                                  onClick={() => stopCampaign(campaign.id)}
                                >
                                  <Square className="h-3.5 w-3.5" />
                                  Stop
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                                onClick={() => deleteCampaign(campaign.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Activity Log */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-teal-500" />
                  <CardTitle className="text-lg font-semibold">
                    Activity Log
                  </CardTitle>
                </div>
                <CardDescription>
                  Recent campaign activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Skeleton className="h-5 w-5 rounded-full mt-0.5" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activityLog.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                    <Activity className="mb-3 h-8 w-8" />
                    <p className="text-sm">No activity yet</p>
                    <p className="text-xs text-zinc-400 mt-1">Activity will appear as campaigns run</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[520px] pr-3">
                    <div className="space-y-1">
                      {activityLog.map((item) => (
                        <ActivityRow key={item.id} item={item} />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  badge,
  badgeColor,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  badge: string
  badgeColor: string
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              {label}
            </p>
            <p className="mt-0.5 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
              {value}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor}`}
          >
            {badge}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityRow({ item }: { item: ActivityEntry }) {
  const statusIcons = {
    success: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
    failed: <XCircle className="h-3.5 w-3.5 text-red-500" />,
    pending: <AlertCircle className="h-3.5 w-3.5 text-amber-500" />,
  }

  const pColor = platformColors[item.platform] ?? platformColors.Instagram

  return (
    <div className="group flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
      <div className="mt-0.5">{statusIcons[item.status]}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          {item.action}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${pColor}`}
          >
            {item.platform}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-zinc-400">
            <Clock className="h-3 w-3" />
            {item.timestamp}
          </span>
        </div>
      </div>
    </div>
  )
}
