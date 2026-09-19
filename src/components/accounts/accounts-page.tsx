'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Users,
  Heart,
  TrendingUp,
  Settings,
  Unplug,
  BarChart3,
  Plus,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Clock,
  Zap,
  Activity,
  Link2,
  XCircle,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AccountData {
  id: string
  userId: string
  platform: string
  username: string
  displayName: string | null
  avatar: string | null
  followers: number
  following: number
  isActive: boolean
  autoPost: boolean
  connectedAt: string
  updatedAt: string
}

interface ActivityEntry {
  id: string
  action: string
  platform: string
  timestamp: string
  type: 'connect' | 'settings' | 'growth' | 'post' | 'security'
}

// ─── Platform Meta ───────────────────────────────────────────────────────────

const PLATFORM_META: Record<string, { color: string; bgClass: string; textClass: string; borderClass: string; initial: string; label: string }> = {
  instagram: {
    color: 'bg-pink-500',
    bgClass: 'bg-pink-50 dark:bg-pink-950/30',
    textClass: 'text-pink-600 dark:text-pink-400',
    borderClass: 'border-pink-200 dark:border-pink-800',
    initial: 'I',
    label: 'Instagram',
  },
  twitter: {
    color: 'bg-slate-600',
    bgClass: 'bg-slate-50 dark:bg-slate-800/30',
    textClass: 'text-slate-600 dark:text-slate-400',
    borderClass: 'border-slate-200 dark:border-slate-700',
    initial: 'X',
    label: 'Twitter/X',
  },
  facebook: {
    color: 'bg-blue-600',
    bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    textClass: 'text-blue-600 dark:text-blue-400',
    borderClass: 'border-blue-200 dark:border-blue-800',
    initial: 'F',
    label: 'Facebook',
  },
  tiktok: {
    color: 'bg-teal-500',
    bgClass: 'bg-teal-50 dark:bg-teal-950/30',
    textClass: 'text-teal-600 dark:text-teal-400',
    borderClass: 'border-teal-200 dark:border-teal-800',
    initial: 'T',
    label: 'TikTok',
  },
  youtube: {
    color: 'bg-red-600',
    bgClass: 'bg-red-50 dark:bg-red-950/30',
    textClass: 'text-red-600 dark:text-red-400',
    borderClass: 'border-red-200 dark:border-red-800',
    initial: 'Y',
    label: 'YouTube',
  },
  linkedin: {
    color: 'bg-sky-600',
    bgClass: 'bg-sky-50 dark:bg-sky-950/30',
    textClass: 'text-sky-600 dark:text-sky-400',
    borderClass: 'border-sky-200 dark:border-sky-800',
    initial: 'L',
    label: 'LinkedIn',
  },
}

function getMeta(platform: string) {
  return PLATFORM_META[platform.toLowerCase()] ?? {
    color: 'bg-zinc-500',
    bgClass: 'bg-zinc-50 dark:bg-zinc-800/30',
    textClass: 'text-zinc-600 dark:text-zinc-400',
    borderClass: 'border-zinc-200 dark:border-zinc-700',
    initial: '?',
    label: platform,
  }
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function formatFollowers(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
  return n.toString()
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
  if (diffD < 30) return `${diffD}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function getActivityIcon(type: ActivityEntry['type']) {
  switch (type) {
    case 'connect': return <Link2 className="h-4 w-4" />
    case 'settings': return <Settings className="h-4 w-4" />
    case 'growth': return <TrendingUp className="h-4 w-4" />
    case 'post': return <Zap className="h-4 w-4" />
    case 'security': return <CheckCircle2 className="h-4 w-4" />
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [connectForm, setConnectForm] = useState({ platform: 'instagram', username: '', displayName: '' })
  const [connecting, setConnecting] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState<string | null>(null)

  // ── Fetch accounts ──────────────────────────────────────────────────────

  // Pure data loader: no state writes, safe to drive from effects or handlers.
  const loadAccounts = useCallback(async (): Promise<AccountData[]> => {
    const res = await fetch('/api/accounts')
    if (!res.ok) throw new Error('Failed to fetch accounts')
    return (await res.json()) as AccountData[]
  }, [])

  // Handler entry point (refresh buttons etc.): sets state from an event.
  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAccounts(await loadAccounts())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [loadAccounts])

  // Mount-only load: every setState below runs in a promise continuation
  // (post-await), never synchronously in the effect body.
  useEffect(() => {
    let cancelled = false
    loadAccounts()
      .then((data) => {
        if (cancelled) return
        setAccounts(data)
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
  }, [loadAccounts])

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleConnect = async () => {
    if (!connectForm.username.trim()) return
    setConnecting(true)
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: connectForm.platform,
          username: connectForm.username.trim(),
          displayName: connectForm.displayName.trim() || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to connect account')
      await fetchAccounts()
      setConnectForm({ platform: 'instagram', username: '', displayName: '' })
      setShowConnectDialog(false)
    } catch (err) {
      console.error(err)
    } finally {
      setConnecting(false)
    }
  }

  const handleToggleAutoPost = async (account: AccountData) => {
    try {
      const res = await fetch('/api/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: account.id, autoPost: !account.autoPost }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, autoPost: !account.autoPost } : a))
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleActive = async (account: AccountData) => {
    try {
      const res = await fetch('/api/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: account.id, isActive: !account.isActive }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, isActive: !account.isActive } : a))
    } catch (err) {
      console.error(err)
    }
  }

  const handleDisconnect = async (id: string) => {
    try {
      const res = await fetch(`/api/accounts?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to disconnect')
      setAccounts(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  // ── Derived stats ───────────────────────────────────────────────────────

  const activeAccounts = accounts.filter(a => a.isActive)
  const totalFollowers = accounts.reduce((sum, a) => sum + (a.followers ?? 0), 0)
  const avgFollowers = accounts.length > 0 ? Math.round(totalFollowers / accounts.length) : 0

  // Activity log derived from accounts
  const activityLog: ActivityEntry[] = accounts.slice(0, 8).map(a => {
    const meta = getMeta(a.platform)
    return {
      id: a.id,
      action: `${meta.label} account @${a.username} connected`,
      platform: a.platform,
      timestamp: timeAgo(a.connectedAt),
      type: 'connect' as const,
    }
  })

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Account Manager</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your connected social media accounts and track performance.
            </p>
          </div>
          <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Connect Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Connect a New Account</DialogTitle>
                <DialogDescription>
                  Add a social media account by providing platform and username.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={connectForm.platform} onValueChange={v => setConnectForm(prev => ({ ...prev, platform: v }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLATFORM_META).map(([key, meta]) => (
                        <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="connect-username">Username</Label>
                  <Input
                    id="connect-username"
                    placeholder="@username"
                    value={connectForm.username}
                    onChange={e => setConnectForm(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="connect-display-name">Display Name (optional)</Label>
                  <Input
                    id="connect-display-name"
                    placeholder="Display name"
                    value={connectForm.displayName}
                    onChange={e => setConnectForm(prev => ({ ...prev, displayName: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowConnectDialog(false)}>Cancel</Button>
                <Button onClick={handleConnect} disabled={!connectForm.username.trim() || connecting}>
                  {connecting ? 'Connecting...' : 'Connect Account'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Overview Stats ───────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-1" />
                  <Skeleton className="h-3 w-40" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Connected Accounts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Connected Accounts</CardTitle>
                <div className="rounded-md bg-primary/10 p-2">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeAccounts.length}/{accounts.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeAccounts.length} of {accounts.length} accounts active
                </p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: accounts.length > 0 ? `${(activeAccounts.length / accounts.length) * 100}%` : '0%' }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Total Followers */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
                <div className="rounded-md bg-pink-100 p-2 dark:bg-pink-950/50">
                  <Heart className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatFollowers(totalFollowers)}</div>
                <p className="text-xs text-muted-foreground">Across all platforms</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  <span>Avg {formatFollowers(avgFollowers)} per account</span>
                </div>
              </CardContent>
            </Card>

            {/* Growth Rate */}
            <Card className="sm:col-span-2 lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Platform Coverage</CardTitle>
                <div className="rounded-md bg-emerald-100 p-2 dark:bg-emerald-950/50">
                  <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{new Set(accounts.map(a => a.platform)).size}/{Object.keys(PLATFORM_META).length}</div>
                <p className="text-xs text-muted-foreground">
                  Platforms connected
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  <span>{Object.keys(PLATFORM_META).length - new Set(accounts.map(a => a.platform)).size} platforms remaining</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Connected Accounts Grid ──────────────────────────────────────── */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Connected Accounts</h2>
            <Badge variant="outline" className="gap-1">
              <Activity className="h-3 w-3" />
              {activeAccounts.length} active
            </Badge>
          </div>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="relative overflow-hidden">
                  <Skeleton className="h-1.5 w-full" />
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-11 w-11 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-5 w-24" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-9 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
              <XCircle className="mb-3 h-10 w-10 text-red-400" />
              <p className="text-sm text-red-500">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={fetchAccounts}>Retry</Button>
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <Users className="mb-3 h-10 w-10" />
              <p className="text-sm">No accounts connected yet</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowConnectDialog(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Connect Your First Account
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => {
                const meta = getMeta(account.platform)
                return (
                  <Card
                    key={account.id}
                    className={`relative overflow-hidden transition-all hover:shadow-md ${!account.isActive ? 'opacity-60' : ''}`}
                  >
                    {/* Color strip */}
                    <div className={`h-1.5 w-full ${meta.color}`} />

                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-11 w-11 border-2 border-background shadow-sm">
                          <AvatarFallback className={`text-sm font-bold text-white ${meta.color}`}>
                            {meta.initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="truncate text-sm">
                            {account.displayName ?? account.username}
                          </CardTitle>
                          <CardDescription className="truncate text-xs">
                            @{account.username}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={account.isActive ? 'default' : 'destructive'}
                          className="shrink-0 text-[10px] px-2 py-0"
                        >
                          {account.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-0">
                      {/* Stats Row */}
                      <div className="flex items-center justify-around rounded-lg bg-muted/50 p-3">
                        <div className="text-center">
                          <p className="text-sm font-bold">{formatFollowers(account.followers)}</p>
                          <p className="text-[10px] text-muted-foreground">Followers</p>
                        </div>
                        <Separator orientation="vertical" className="h-8" />
                        <div className="text-center">
                          <p className="text-sm font-bold">{formatFollowers(account.following)}</p>
                          <p className="text-[10px] text-muted-foreground">Following</p>
                        </div>
                        <Separator orientation="vertical" className="h-8" />
                        <div className="text-center">
                          <p className="text-sm font-bold capitalize">{meta.label}</p>
                          <p className="text-[10px] text-muted-foreground">Platform</p>
                        </div>
                      </div>

                      {/* Growth indicator */}
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          Connected {timeAgo(account.connectedAt)}
                        </span>
                      </div>

                      {/* Auto-post Toggle */}
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`auto-post-${account.id}`} className="text-xs text-muted-foreground">
                          Auto-post
                        </Label>
                        <Switch
                          id={`auto-post-${account.id}`}
                          checked={account.autoPost}
                          onCheckedChange={() => handleToggleAutoPost(account)}
                          disabled={!account.isActive}
                        />
                      </div>

                      <Separator />

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5 text-xs"
                          onClick={() => handleToggleActive(account)}
                        >
                          {account.isActive ? (
                            <>
                              <Unplug className="h-3.5 w-3.5" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <ExternalLink className="h-3.5 w-3.5" />
                              Activate
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5 text-xs text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                          onClick={() => handleDisconnect(account.id)}
                        >
                          <Unplug className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={!account.isActive}
                          onClick={() => setAnalyticsOpen(analyticsOpen === account.id ? null : account.id)}
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Inline Analytics Peek */}
                      {analyticsOpen === account.id && (
                        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                          <p className="text-xs font-semibold">Quick Analytics</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded bg-background p-2">
                              <p className="text-muted-foreground">Followers</p>
                              <p className="font-bold">{formatFollowers(account.followers)}</p>
                            </div>
                            <div className="rounded bg-background p-2">
                              <p className="text-muted-foreground">Following</p>
                              <p className="font-bold">{formatFollowers(account.following)}</p>
                            </div>
                            <div className="rounded bg-background p-2">
                              <p className="text-muted-foreground">Platform</p>
                              <p className="font-bold capitalize">{meta.label}</p>
                            </div>
                            <div className="rounded bg-background p-2">
                              <p className="text-muted-foreground">Status</p>
                              <p className="font-bold">{account.isActive ? 'Active' : 'Inactive'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Bottom Section: Activity + Comparison Table ──────────────────── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Account Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Account Activity</CardTitle>
                  <CardDescription className="text-xs">Recent account connections and changes</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={fetchAccounts} disabled={loading}>
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
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
                </div>
              ) : (
                <ScrollArea className="h-[360px] pr-4">
                  <div className="space-y-4">
                    {activityLog.map((item) => {
                      const meta = getMeta(item.platform)
                      return (
                        <div key={item.id} className="flex gap-3">
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs text-muted-foreground ${meta.bgClass}`}>
                            {getActivityIcon(item.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-snug">{item.action}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${meta.textClass} border-0 ${meta.bgClass}`}>
                                {meta.label}
                              </Badge>
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {item.timestamp}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Platform Comparison Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Platform Comparison</CardTitle>
                  <CardDescription className="text-xs">Side-by-side account metrics</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-4 w-20 flex-1" />
                    </div>
                  ))}
                </div>
              ) : accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                  <p className="text-sm">No accounts to compare</p>
                </div>
              ) : (
                <ScrollArea className="h-[360px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px] text-xs">Platform</TableHead>
                        <TableHead className="text-right text-xs">Followers</TableHead>
                        <TableHead className="text-right text-xs">Following</TableHead>
                        <TableHead className="text-right text-xs">Status</TableHead>
                        <TableHead className="text-right text-xs">Auto-post</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((account) => {
                        const meta = getMeta(account.platform)
                        return (
                          <TableRow key={account.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${meta.color}`}>
                                  {meta.initial}
                                </div>
                                <span className="text-xs font-medium">{meta.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs font-medium">
                              {formatFollowers(account.followers)}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {formatFollowers(account.following)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={account.isActive ? 'default' : 'destructive'}
                                className="text-[10px]"
                              >
                                {account.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={account.autoPost ? 'default' : 'secondary'}
                                className="text-[10px]"
                              >
                                {account.autoPost ? 'On' : 'Off'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
