'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Shield, Eye, AlertTriangle, FileText, Search, RefreshCw, ExternalLink,
  Gavel, CheckCircle2, XCircle, Clock, Fingerprint, Globe, Lock, Plus,
  Trash2, Copy, TrendingUp, Loader2, Filter, History, Flag, X,
} from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────────────────

interface CopyrightMatch {
  id: string
  contentId: string
  matchedUrl: string
  platform: string
  similarity: number
  status: string
  createdAt: string
}

interface CopyrightContent {
  id: string
  name: string
  type: string
  fingerprint: string | null
  sourceUrl: string | null
  status: string
  lastScanned: string | null
  createdAt: string
  updatedAt: string
  matches: CopyrightMatch[]
}

// ── Helpers ──────────────────────────────────────────────────────────────

function platformBadgeColor(platform: string) {
  switch (platform) {
    case 'Instagram': return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20'
    case 'Facebook': return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
    case 'YouTube': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
    case 'TikTok': return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
    case 'Twitter': return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
    default: return ''
  }
}

function matchStatusBadge(status: string) {
  switch (status) {
    case 'action_needed': return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border-0 gap-1"><AlertTriangle className="h-3 w-3" />Action Needed</Badge>
    case 'pending': return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-0 gap-1"><Clock className="h-3 w-3" />Pending</Badge>
    case 'reviewed': return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-0 gap-1"><Eye className="h-3 w-3" />Reviewed</Badge>
    case 'resolved': return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-0 gap-1"><CheckCircle2 className="h-3 w-3" />Resolved</Badge>
    case 'ignored': return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-0 gap-1"><CheckCircle2 className="h-3 w-3" />Ignored</Badge>
    case 'reported': return <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 border-0 gap-1"><Flag className="h-3 w-3" />Reported</Badge>
    default: return <Badge variant="outline">{status}</Badge>
  }
}

function contentStatusBadge(status: string) {
  switch (status) {
    case 'registered': return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-0 gap-1"><CheckCircle2 className="h-3 w-3" />Registered</Badge>
    case 'scanning': return <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 border-0 gap-1"><RefreshCw className="h-3 w-3 animate-spin" />Scanning</Badge>
    default: return <Badge variant="outline">{status}</Badge>
  }
}

function similarityColor(similarity: number) {
  if (similarity >= 90) return 'text-red-600 dark:text-red-400'
  if (similarity >= 75) return 'text-amber-600 dark:text-amber-400'
  if (similarity >= 50) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-muted-foreground'
}

function similarityBg(similarity: number) {
  if (similarity >= 90) return 'bg-red-500/5 border-red-500/20'
  if (similarity >= 75) return 'bg-amber-500/5 border-amber-500/20'
  if (similarity >= 50) return 'bg-yellow-500/5 border-yellow-500/20'
  return ''
}

function typeBadge(type: string) {
  switch (type) {
    case 'Image': return <Badge variant="secondary" className="bg-pink-500/10 text-pink-600 dark:text-pink-400 border-0">{type}</Badge>
    case 'Video': return <Badge variant="secondary" className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-0">{type}</Badge>
    case 'Text': return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">{type}</Badge>
    case 'Audio': return <Badge variant="secondary" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-0">{type}</Badge>
    default: return <Badge variant="secondary">{type}</Badge>
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Never'
  try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return dateStr }
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Never'
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  return `${Math.floor(diffHrs / 24)}d ago`
}

function formatDateTime(dateStr: string) {
  try { return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch { return dateStr }
}

// ── Circular Score ───────────────────────────────────────────────────────

function CircularProgress({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--muted)" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--primary)" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tracking-tight">{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function CopyrightPage() {
  const [content, setContent] = useState<CopyrightContent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('registry')
  const [showRegisterDialog, setShowRegisterDialog] = useState(false)

  // Register form
  const [regName, setRegName] = useState('')
  const [regType, setRegType] = useState('Image')
  const [regSourceUrl, setRegSourceUrl] = useState('')
  const [regTextContent, setRegTextContent] = useState('')
  const [registering, setRegistering] = useState(false)

  // Filters
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Scanning state
  const [scanningIds, setScanningIds] = useState<Set<string>>(new Set())

  // Auto-scan settings (local state)
  const [scanFrequency, setScanFrequency] = useState('weekly')
  const [similarityThreshold, setSimilarityThreshold] = useState([75])
  const [autoMonitor, setAutoMonitor] = useState(true)
  const [notifyMatches, setNotifyMatches] = useState(true)
  const [platforms, setPlatforms] = useState({ instagram: true, facebook: true, youtube: true, tiktok: false, twitter: true })
  const [savedSettings, setSavedSettings] = useState(false)

  const togglePlatform = (key: keyof typeof platforms) => setPlatforms((prev) => ({ ...prev, [key]: !prev[key] }))
  const handleSaveSettings = () => { setSavedSettings(true); setTimeout(() => setSavedSettings(false), 3000) }

  // Fetch content
  const fetchContent = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/copyright')
      const data = await res.json()
      setContent(data)
    } catch { setError('Failed to load copyright content') } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchContent() }, [fetchContent])

  // Register content
  const handleRegister = async () => {
    if (!regName.trim()) return
    setRegistering(true)
    try {
      const res = await fetch('/api/copyright', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, type: regType, sourceUrl: regSourceUrl || undefined, content: regTextContent || undefined }),
      })
      if (!res.ok) throw new Error('Failed to register')
      const newContent = await res.json()
      setContent((prev) => [newContent, ...prev])
      setRegName(''); setRegSourceUrl(''); setRegTextContent('')
      setShowRegisterDialog(false)
    } catch { setError('Failed to register content') } finally { setRegistering(false) }
  }

  // Scan content via web search
  const handleScan = async (contentId: string) => {
    setScanningIds((prev) => new Set(prev).add(contentId))
    setContent((prev) => prev.map((c) => (c.id === contentId ? { ...c, status: 'scanning' } : c)))
    try {
      const res = await fetch('/api/copyright', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan', contentId }),
      })
      if (!res.ok) throw new Error('Scan failed')
      const updated = await res.json()
      setContent((prev) => prev.map((c) => (c.id === contentId ? updated : c)))
    } catch { setError('Failed to scan content. Please try again.') } finally {
      setScanningIds((prev) => { const next = new Set(prev); next.delete(contentId); return next })
    }
  }

  // Delete content
  const handleDelete = async (contentId: string) => {
    try { await fetch(`/api/copyright?id=${contentId}`, { method: 'DELETE' }); setContent((prev) => prev.filter((c) => c.id !== contentId)) }
    catch { setError('Failed to delete') }
  }

  // DMCA
  const handleFileDmca = async (matchId: string) => {
    try {
      const res = await fetch('/api/copyright', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId, status: 'action_needed' }) })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setContent((prev) => prev.map((c) => ({ ...c, matches: c.matches.map((m) => (m.id === matchId ? updated : m)) })))
    } catch { setError('Failed to file DMCA') }
  }

  // Ignore
  const handleIgnore = async (matchId: string) => {
    try {
      const res = await fetch('/api/copyright', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId, status: 'ignored' }) })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setContent((prev) => prev.map((c) => ({ ...c, matches: c.matches.map((m) => (m.id === matchId ? updated : m)) })))
    } catch { setError('Failed to ignore match') }
  }

  // Report
  const handleReport = async (matchId: string) => {
    try {
      const res = await fetch('/api/copyright', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId, status: 'reported' }) })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setContent((prev) => prev.map((c) => ({ ...c, matches: c.matches.map((m) => (m.id === matchId ? updated : m)) })))
    } catch { setError('Failed to report match') }
  }

  // Resolve
  const handleResolve = async (matchId: string) => {
    try {
      const res = await fetch('/api/copyright', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId, status: 'resolved' }) })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setContent((prev) => prev.map((c) => ({ ...c, matches: c.matches.map((m) => (m.id === matchId ? updated : m)) })))
    } catch { setError('Failed to resolve match') }
  }

  // Filtered content
  const filteredContent = useMemo(() => {
    let result = content
    if (typeFilter !== 'all') result = result.filter((c) => c.type === typeFilter)
    if (statusFilter !== 'all') result = result.filter((c) => c.status === statusFilter)
    return result
  }, [content, typeFilter, statusFilter])

  // All matches with filter
  const filteredMatches = useMemo(() => {
    const all = filteredContent.flatMap((c) => c.matches.map((m) => ({ ...m, contentName: c.name, contentType: c.type })))
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [filteredContent])

  // Stats
  const allMatches = content.flatMap((c) => c.matches)
  const protectedCount = content.length
  const scanningCount = content.filter((c) => c.status === 'scanning').length
  const violationCount = allMatches.filter((m) => m.status === 'action_needed' || m.status === 'pending').length
  const dmcaCount = allMatches.filter((m) => m.status === 'action_needed').length
  const resolvedCount = allMatches.filter((m) => m.status === 'resolved').length
  const pendingActions = allMatches.filter((m) => m.status === 'action_needed' || m.status === 'pending' || m.status === 'reviewed').length

  // Copyright score
  const copyrightScore = (() => {
    if (content.length === 0) return 0
    const reg = Math.min(100, content.length * 20)
    const mon = scanningCount > 0 ? 85 : 50
    const resp = allMatches.length > 0 ? Math.round((resolvedCount / allMatches.length) * 100) : 70
    return Math.round((reg + mon + resp) / 3)
  })()

  // Scan timeline
  const scanTimeline = useMemo(() => {
    const events: { id: string; contentName: string; type: string; time: string; matchCount: number }[] = []
    for (const c of content) {
      if (c.lastScanned) {
        events.push({ id: c.id, contentName: c.name, type: 'scan', time: c.lastScanned, matchCount: c.matches.length })
      }
      for (const m of c.matches) {
        events.push({ id: m.id, contentName: c.name, type: 'match', time: m.createdAt, matchCount: 1 })
      }
    }
    return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 15)
  }, [content])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Content Shield</h1>
            <p className="text-sm text-muted-foreground">Protect your content from unauthorized use across the web</p>
          </div>
        </div>
        <Button className="gap-2" onClick={() => setShowRegisterDialog(true)}>
          <Plus className="h-4 w-4" /> Register Content
        </Button>
      </div>

      {/* Register Dialog */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Register Content</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Content Name</Label>
              <Input placeholder="e.g., Brand Logo v3" value={regName} onChange={(e) => setRegName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select value={regType} onValueChange={setRegType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Image">Image</SelectItem>
                  <SelectItem value="Video">Video</SelectItem>
                  <SelectItem value="Text">Text</SelectItem>
                  <SelectItem value="Audio">Audio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source URL (optional)</Label>
              <Input placeholder="https://example.com/your-content" value={regSourceUrl} onChange={(e) => setRegSourceUrl(e.target.value)} />
            </div>
            {(regType === 'Text') && (
              <div className="space-y-2">
                <Label>Content Text (for matching)</Label>
                <Textarea placeholder="Paste the original text content here..." value={regTextContent} onChange={(e) => setRegTextContent(e.target.value)} className="min-h-[80px]" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegisterDialog(false)}>Cancel</Button>
            <Button onClick={handleRegister} disabled={!regName.trim() || registering} className="gap-2">
              {registering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {registering ? 'Registering & Scanning...' : 'Register & Scan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20 p-4 flex items-center gap-3">
          <XCircle className="size-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400 flex-1">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => setError('')}><X className="size-4" /></Button>
        </div>
      )}

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Protected Content', value: protectedCount, sub: 'Active', icon: Shield, accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
          { label: 'Active Scans', value: scanningCount, sub: 'Monitoring', icon: Eye, accent: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
          { label: 'Pending Actions', value: pendingActions, sub: `${dmcaCount} DMCA`, icon: AlertTriangle, accent: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
          { label: 'Resolved', value: resolvedCount, sub: `${allMatches.length} total matches`, icon: CheckCircle2, accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
        ].map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-sm font-medium text-muted-foreground">{s.label}</CardDescription>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${s.accent}`}><Icon className="h-4 w-4" /></div>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold tracking-tight">{s.value}</div>}
                <Badge variant="secondary" className="mt-1 gap-1 bg-muted/50 text-xs">{s.sub}</Badge>
              </CardContent>
            </Card>
          )
        })}
      </section>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="registry" className="gap-1.5"><Fingerprint className="size-3.5" /> Registry</TabsTrigger>
          <TabsTrigger value="matches" className="gap-1.5"><Search className="size-3.5" /> Matches</TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5"><History className="size-3.5" /> Timeline</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><Lock className="size-3.5" /> Settings</TabsTrigger>
        </TabsList>

        {/* ── Registry Tab ── */}
        <TabsContent value="registry" className="mt-6 space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Image">Image</SelectItem>
                <SelectItem value="Video">Video</SelectItem>
                <SelectItem value="Text">Text</SelectItem>
                <SelectItem value="Audio">Audio</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="scanning">Scanning</SelectItem>
              </SelectContent>
            </Select>
            {(typeFilter !== 'all' || statusFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setTypeFilter('all'); setStatusFilter('all') }}>
                <X className="size-3.5 mr-1" /> Clear
              </Button>
            )}
            <div className="ml-auto text-sm text-muted-foreground">{filteredContent.length} item{filteredContent.length !== 1 ? 's' : ''}</div>
          </div>

          {/* Content Grid */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-lg border overflow-hidden"><Skeleton className="h-28 w-full" /><div className="p-3 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-3 w-2/3" /></div></div>
              ))}
            </div>
          ) : filteredContent.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Fingerprint className="size-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-lg font-semibold">No content found</h3>
              <p className="mt-1 text-sm text-muted-foreground">Register content to start protecting it from unauthorized use.</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredContent.map((item) => (
                <div key={item.id} className="group relative overflow-hidden rounded-lg border bg-card transition-colors hover:shadow-md">
                  <div className="relative flex h-28 items-center justify-center bg-muted">
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      {item.type === 'Video' ? <Globe className="h-7 w-7" /> : item.type === 'Text' ? <FileText className="h-7 w-7" /> : <Fingerprint className="h-7 w-7" />}
                      <span className="text-[10px]">Preview</span>
                    </div>
                    <div className="absolute top-2 right-2">{typeBadge(item.type)}</div>
                    {item.matches.length > 0 && (
                      <div className="absolute top-2 left-2"><Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-0 gap-1"><AlertTriangle className="h-3 w-3" />{item.matches.length}</Badge></div>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { navigator.clipboard.writeText(item.fingerprint || '') }}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Fingerprint className="h-3 w-3" />
                      <span className="font-mono">{item.fingerprint ? `${item.fingerprint.slice(0, 12)}...` : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Last scan: {timeAgo(item.lastScanned)}</span>
                      {contentStatusBadge(item.status)}
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs flex-1" onClick={() => handleScan(item.id)} disabled={item.status === 'scanning' || scanningIds.has(item.id)}>
                        <RefreshCw className={`h-3 w-3 ${item.status === 'scanning' || scanningIds.has(item.id) ? 'animate-spin' : ''}`} />
                        {item.status === 'scanning' || scanningIds.has(item.id) ? 'Scanning...' : 'Scan Now'}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Matches Tab ── */}
        <TabsContent value="matches" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div><CardTitle>Match Results</CardTitle><CardDescription>All detected potential copyright violations</CardDescription></div>
                <div className="flex items-center gap-2">
                  {violationCount > 0 && (
                    <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-0 gap-1">
                      <AlertTriangle className="h-3 w-3" />{violationCount} need attention
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : filteredMatches.length === 0 ? (
                <div className="text-center py-12"><Search className="size-8 mx-auto mb-3 text-muted-foreground/50" /><p className="text-sm text-muted-foreground">No matches found. Run scans on your registered content to detect potential violations.</p></div>
              ) : (
                <ScrollArea className="max-h-[520px]">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Original Content</TableHead>
                      <TableHead>Matched URL</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead className="text-right">Similarity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {filteredMatches.map((match) => (
                        <TableRow key={match.id} className={similarityBg(match.similarity)}>
                          <TableCell className="font-medium max-w-[140px] truncate">{match.contentName}</TableCell>
                          <TableCell>
                            <a href={match.matchedUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline min-w-0">
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[150px]">{match.matchedUrl}</span>
                            </a>
                          </TableCell>
                          <TableCell><Badge variant="outline" className={`text-[10px] ${platformBadgeColor(match.platform)}`}>{match.platform}</Badge></TableCell>
                          <TableCell className="text-right"><span className={`font-bold ${similarityColor(match.similarity)}`}>{match.similarity}%</span></TableCell>
                          <TableCell>{matchStatusBadge(match.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              {match.status !== 'action_needed' && match.status !== 'resolved' && match.status !== 'ignored' && (
                                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleFileDmca(match.id)}><Gavel className="h-3 w-3" />DMCA</Button>
                              )}
                              {match.status !== 'resolved' && match.status !== 'ignored' && match.status !== 'reported' && (
                                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => handleReport(match.id)}><Flag className="h-3 w-3" />Report</Button>
                              )}
                              {match.status !== 'ignored' && match.status !== 'resolved' && (
                                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => handleIgnore(match.id)}><XCircle className="h-3 w-3" />Ignore</Button>
                              )}
                              {(match.status === 'action_needed' || match.status === 'reported') && (
                                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-emerald-600" onClick={() => handleResolve(match.id)}><CheckCircle2 className="h-3 w-3" />Resolve</Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* DMCA Center */}
          {allMatches.filter((m) => m.status === 'action_needed').length > 0 && (
            <Card className="mt-6">
              <CardHeader><CardTitle className="flex items-center gap-2"><Gavel className="h-4 w-4 text-red-500" /> DMCA Center</CardTitle><CardDescription>Matches requiring immediate action</CardDescription></CardHeader>
              <CardContent>
                <ScrollArea className="max-h-80"><div className="space-y-3">
                  {allMatches.filter((m) => m.status === 'action_needed').map((match) => {
                    const parent = content.find((c) => c.id === match.contentId)
                    return (
                      <div key={match.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20 p-4">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{parent?.name || 'Unknown'}</span>
                            <Badge variant="outline" className={`text-[10px] ${platformBadgeColor(match.platform)}`}>{match.platform}</Badge>
                          </div>
                          <a href={match.matchedUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                            <ExternalLink className="h-3 w-3" /><span className="truncate">{match.matchedUrl}</span>
                          </a>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-lg font-bold ${similarityColor(match.similarity)}`}>{match.similarity}%</span>
                          <div className="flex gap-1.5">
                            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => handleIgnore(match.id)}><XCircle className="h-3 w-3" />Dismiss</Button>
                            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => handleResolve(match.id)}><CheckCircle2 className="h-3 w-3" />Resolved</Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div></ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Timeline Tab ── */}
        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Recent Activity</CardTitle><CardDescription>Timeline of scans and match detections</CardDescription></CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : scanTimeline.length === 0 ? (
                <div className="text-center py-12"><History className="size-8 mx-auto mb-3 text-muted-foreground/50" /><p className="text-sm text-muted-foreground">No activity yet. Register and scan content to see activity here.</p></div>
              ) : (
                <ScrollArea className="max-h-[480px]">
                  <div className="space-y-0">
                    {scanTimeline.map((event, i) => (
                      <div key={event.id + i} className="flex gap-3 pb-4">
                        <div className="flex flex-col items-center">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${event.type === 'scan' ? 'bg-sky-500/10' : event.type === 'match' ? 'bg-amber-500/10' : 'bg-muted'}`}>
                            {event.type === 'scan' ? <RefreshCw className="h-3.5 w-3.5 text-sky-600" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                          </div>
                          {i < scanTimeline.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{event.contentName}</span>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {event.type === 'scan' ? 'Scan completed' : 'Match found'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {event.type === 'scan'
                              ? `${event.matchCount} match${event.matchCount !== 1 ? 'es' : ''} detected`
                              : `Potential violation detected`}
                          </p>
                          <p className="text-[11px] text-muted-foreground/70 mt-0.5">{formatDateTime(event.time)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Settings Tab ── */}
        <TabsContent value="settings" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Auto-Scan Config */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Auto-Scan Settings</CardTitle><CardDescription>Configure automatic content monitoring</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Scan Frequency</Label>
                  <Select value={scanFrequency} onValueChange={setScanFrequency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Platforms to Scan</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { key: 'instagram' as const, label: 'Instagram', color: 'text-pink-500' },
                      { key: 'facebook' as const, label: 'Facebook', color: 'text-sky-500' },
                      { key: 'youtube' as const, label: 'YouTube', color: 'text-red-500' },
                      { key: 'tiktok' as const, label: 'TikTok', color: 'text-violet-500' },
                      { key: 'twitter' as const, label: 'Twitter', color: 'text-slate-500' },
                    ].map((p) => (
                      <div key={p.key} className="flex items-center gap-2">
                        <Checkbox id={`pf-${p.key}`} checked={platforms[p.key]} onCheckedChange={() => togglePlatform(p.key)} />
                        <Label htmlFor={`pf-${p.key}`} className={`text-sm font-normal cursor-pointer ${p.color}`}>{p.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><Label className="text-sm font-medium">Similarity Threshold</Label><span className="text-sm font-bold">{similarityThreshold[0]}%</span></div>
                  <Slider value={similarityThreshold} onValueChange={setSimilarityThreshold} min={50} max={100} step={5} />
                  <div className="flex justify-between text-xs text-muted-foreground"><span>50% (Broad)</span><span>100% (Exact)</span></div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><Label htmlFor="auto-mon" className="text-sm font-normal cursor-pointer">Monitor content automatically</Label><Switch id="auto-mon" checked={autoMonitor} onCheckedChange={setAutoMonitor} /></div>
                  <div className="flex items-center justify-between"><Label htmlFor="notify-m" className="text-sm font-normal cursor-pointer">Notify on new matches</Label><Switch id="notify-m" checked={notifyMatches} onCheckedChange={setNotifyMatches} /></div>
                </div>
                <Button className="w-full gap-2" onClick={handleSaveSettings} variant={savedSettings ? 'outline' : 'default'}>
                  {savedSettings ? <><CheckCircle2 className="h-4 w-4" />Settings Saved</> : <><Lock className="h-4 w-4" />Save Settings</>}
                </Button>
              </CardContent>
            </Card>

            {/* Copyright Score */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Protection Score</CardTitle><CardDescription>Your overall copyright protection rating</CardDescription></CardHeader>
              <CardContent className="flex flex-col items-center space-y-6">
                {loading ? <Skeleton className="h-[120px] w-[120px] rounded-full" /> : <CircularProgress score={copyrightScore} />}
                <div className="w-full space-y-3">
                  {[
                    { label: 'Registration', value: Math.min(100, content.length * 20) },
                    { label: 'Monitoring', value: scanningCount > 0 ? 85 : 50 },
                    { label: 'Response', value: allMatches.length > 0 ? Math.round((resolvedCount / allMatches.length) * 100) : 70 },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">{item.label}</span><span className="font-medium">{item.value}%</span></div>
                      <Progress value={item.value} className="h-2" />
                    </div>
                  ))}
                </div>
                {content.length < 5 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" />Register {5 - content.length} more pieces of content</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
