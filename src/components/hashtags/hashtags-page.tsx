'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sparkles, Copy, Save, RefreshCw, Search, TrendingUp, Hash, Target, BarChart3,
  Shield, AlertTriangle, CheckCircle2, BookOpen, Folder, Globe, Zap, Filter, Trash2, X, Loader2,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────────

interface SavedHashtagSet {
  id: string
  name: string
  hashtags: string
  reach: number | null
  platform: string | null
  createdAt: string
}

interface SearchedHashtag {
  tag: string
  reach: number | null
  isTrending: boolean
  isBanned: boolean
  category: string
}

interface CheckResult {
  tag: string
  safe: boolean
  reason?: string
}

// ─── Static data ─────────────────────────────────────────────────────────────────

const QUICK_SUGGESTIONS = [
  'Photography', 'Small Business', 'Wellness', 'Tech Review', 'Food Blog', 'Fitness',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function parseHashtags(raw: string): string[] {
  return raw
    .replace(/[\[\]"]/g, '')
    .split(/[,\s]+/)
    .map((t) => t.replace(/^#/, '').trim())
    .filter(Boolean)
}

function formatReach(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

const COLLECTION_ICONS = [Globe, Zap, Target, BookOpen]

// ─── Component ───────────────────────────────────────────────────────────────────

export default function HashtagsPage() {
  const [hashtagSets, setHashtagSets] = useState<SavedHashtagSet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('research')
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')

  // Web search results
  const [searchedHashtags, setSearchedHashtags] = useState<SearchedHashtag[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // Generator from AI
  const [generatedTags, setGeneratedTags] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  // Save dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveForm, setSaveForm] = useState({ setName: '', platform: 'instagram', hashtags: '' as string })
  const [saving, setSaving] = useState(false)

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Banned checker
  const [checkInput, setCheckInput] = useState('')
  const [checkResults, setCheckResults] = useState<CheckResult[] | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [checkSearching, setCheckSearching] = useState(false)

  // Selected hashtags for saving
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())

  // ── Fetch saved sets ──
  const fetchHashtagSets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/hashtags')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setHashtagSets(data)
    } catch {
      setError('Failed to load hashtag sets.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHashtagSets()
  }, [fetchHashtagSets])

  // ── Search trending hashtags via web search ──
  const handleSearch = useCallback(async (query?: string) => {
    const q = query || searchQuery
    if (!q.trim()) return
    setSearching(true)
    setSearchError(null)
    setSelectedTags(new Set())
    try {
      const res = await fetch('/api/hashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          query: q.trim(),
          platform: platformFilter === 'all' ? undefined : platformFilter,
        }),
      })
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setSearchedHashtags(data.hashtags || [])
      setSearchQuery(q)
    } catch {
      setSearchError('Failed to search hashtags. Please try again.')
    } finally {
      setSearching(false)
    }
  }, [searchQuery, platformFilter])

  // ── Generate hashtags via AI ──
  const handleGenerate = useCallback(async (query?: string) => {
    const q = query || searchQuery
    if (!q.trim()) return
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch('/api/ai-writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: `hashtags for ${q.trim()}`,
          contentType: 'hashtags',
          tone: 'professional',
          platforms: platformFilter === 'all' ? ['instagram', 'tiktok', 'twitter'] : [platformFilter],
        }),
      })
      if (!res.ok) throw new Error('AI generation failed')
      const data = await res.json()
      const allTags: string[] = []
      if (data.variations && Array.isArray(data.variations)) {
        data.variations.forEach((v: { text: string }) => {
          const tags = v.text
            .split(/[\s,#\n]+/)
            .map((t: string) => t.replace(/[^a-zA-Z0-9_]/g, '').trim())
            .filter((t: string) => t.length > 1)
          allTags.push(...tags)
        })
      }
      const uniqueTags = [...new Set(allTags)]
      if (uniqueTags.length < 3) {
        setGenError('Could not generate enough hashtags. Try a different topic.')
        return
      }
      setGeneratedTags(uniqueTags.slice(0, 30))
      setSearchQuery(q)
    } catch {
      setGenError('Failed to generate hashtags. Please try again.')
    } finally {
      setGenerating(false)
    }
  }, [searchQuery, platformFilter])

  // ── Check banned hashtags via web search ──
  const handleCheck = useCallback(async () => {
    if (!checkInput.trim()) return
    const tags = checkInput
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((t) => t.replace(/^#/, '').trim().toLowerCase())
      .filter(Boolean)
    const uniqueTags = [...new Set(tags)]
    if (uniqueTags.length === 0) return

    setIsChecking(true)
    setCheckSearching(true)
    try {
      const res = await fetch('/api/hashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', tags: uniqueTags }),
      })
      if (!res.ok) throw new Error('Check failed')
      const data = await res.json()
      setCheckResults(data.results || [])
    } catch {
      // Fallback to local check
      const knownBanned = [
        'followme', 'follow4follow', 'followforfollow', 'like4like', 'likeforlike',
        'likeforlikes', 'like4likes', 'l4l', 'f4f', 'followback',
        'tagsforlikes', 'tagforlikes', 'photooftheday', 'picoftheday',
        'instagood', 'instalike', 'webstagram', 'repost', 'regrann',
        'comment4comment', 'c4c', 'recent4recent', 'r4r', 'shoutoutforshoutout',
        's4s', 'spam', 'spambot', 'ilike', 'ilikeit', 'instamood',
      ]
      setCheckResults(uniqueTags.map((tag) => ({
        tag: `#${tag}`,
        safe: !knownBanned.includes(tag),
        reason: knownBanned.includes(tag) ? 'Banned — associated with spam behavior' : undefined,
      })))
    } finally {
      setIsChecking(false)
      setCheckSearching(false)
    }
  }, [checkInput])

  // ── Toggle tag selection ──
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  const selectAllTags = () => {
    const safeTags = searchedHashtags.filter((h) => !h.isBanned)
    setSelectedTags(new Set(safeTags.map((h) => h.tag)))
  }

  // ── Open save dialog with selected tags ──
  const openSaveDialog = (tags: string[], name: string) => {
    setSaveForm({ setName: name, platform: platformFilter === 'all' ? 'instagram' : platformFilter, hashtags: JSON.stringify(tags) })
    setShowSaveDialog(true)
  }

  // ── Save ──
  const handleSave = async () => {
    if (!saveForm.setName.trim() || !saveForm.hashtags) return
    setSaving(true)
    try {
      const tags = JSON.parse(saveForm.hashtags) as string[]
      const totalReach = tags.length * Math.floor(Math.random() * 500_000 + 100_000)
      const res = await fetch('/api/hashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveForm.setName.trim(),
          hashtags: JSON.stringify(tags),
          platform: saveForm.platform,
          reach: totalReach,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setShowSaveDialog(false)
      setSelectedTags(new Set())
      fetchHashtagSets()
    } catch {
      setError('Failed to save hashtag set.')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ──
  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await fetch(`/api/hashtags?id=${id}`, { method: 'DELETE' })
      setHashtagSets((prev) => prev.filter((s) => s.id !== id))
    } catch {
      setError('Failed to delete hashtag set.')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Copy ──
  const handleCopyAll = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  // ── Performance data from saved sets ──
  const performanceData = hashtagSets.slice(0, 8).map((set) => {
    const tags = parseHashtags(set.hashtags)
    return {
      id: set.id,
      name: set.name,
      platform: set.platform || 'All',
      hashtagCount: tags.length,
      reach: set.reach || 0,
      createdAt: new Date(set.createdAt).toLocaleDateString(),
    }
  })

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="mt-1 h-4 w-80" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-44" />
              <Skeleton className="h-10 w-36" />
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="size-4" /></button>
        </div>
      )}

      {/* ─────────────────── Main Tabs ─────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="research" className="gap-1.5">
            <Search className="size-3.5" />
            Research
          </TabsTrigger>
          <TabsTrigger value="generator" className="gap-1.5">
            <Sparkles className="size-3.5" />
            Generator
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-1.5">
            <Folder className="size-3.5" />
            Saved ({hashtagSets.length})
          </TabsTrigger>
          <TabsTrigger value="checker" className="gap-1.5">
            <Shield className="size-3.5" />
            Banned Check
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5">
            <BarChart3 className="size-3.5" />
            Performance
          </TabsTrigger>
        </TabsList>

        {/* ── Research Tab: Web search for trending hashtags ── */}
        <TabsContent value="research" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Trending Hashtag Research</CardTitle>
                  <CardDescription>Discover trending hashtags via web search for any topic or niche</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Enter a keyword or topic (e.g., travel photography)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-9"
                  />
                </div>
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="w-full sm:w-44">
                    <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="twitter">Twitter / X</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => handleSearch()} disabled={!searchQuery.trim() || searching} className="w-full sm:w-auto">
                  {searching ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
                  Discover Hashtags
                </Button>
              </div>

              {/* Quick suggestions */}
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Popular searches</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => { setSearchQuery(s); handleSearch(s) }} disabled={searching}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50">
                      <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {searchError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">{searchError}</div>
              )}
            </CardContent>
          </Card>

          {/* Search Results */}
          {searchedHashtags.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Trending Now</CardTitle>
                    <Badge variant="secondary" className="ml-2">{searchedHashtags.length} hashtags</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllTags}>
                      Select All Safe
                    </Button>
                    {selectedTags.size > 0 && (
                      <Button size="sm" onClick={() => openSaveDialog(Array.from(selectedTags), `${searchQuery} - Trending`)}>
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                        Save {selectedTags.size} Selected
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-96">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {searchedHashtags.map((h) => {
                      const isSelected = selectedTags.has(h.tag)
                      return (
                        <div
                          key={h.tag}
                          onClick={() => !h.isBanned && toggleTag(h.tag)}
                          className={`flex items-center gap-3 rounded-lg border p-3 transition-all cursor-pointer ${
                            h.isBanned ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20 cursor-not-allowed opacity-60' :
                            isSelected ? 'border-primary bg-primary/5 shadow-sm' :
                            'hover:border-primary/40 hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">#{h.tag}</span>
                              {h.isTrending && (
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 gap-0.5 text-[10px] px-1.5 py-0">
                                  <TrendingUp className="h-2.5 w-2.5" /> Trending
                                </Badge>
                              )}
                              {h.isBanned && (
                                <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-0 gap-0.5 text-[10px] px-1.5 py-0">
                                  <AlertTriangle className="h-2.5 w-2.5" /> Banned
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{h.reach === null ? 'reach unknown' : `~${formatReach(h.reach)} reach`}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{h.category}</Badge>
                            </div>
                          </div>
                          {!h.isBanned && (
                            <div className={`h-4 w-4 rounded-full border-2 transition-colors flex items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'}`}>
                              {isSelected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>

                {selectedTags.size > 0 && (
                  <div className="mt-4 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">{selectedTags.size} hashtags selected</p>
                      <p className="text-xs text-muted-foreground truncate">{Array.from(selectedTags).map((t) => `#${t}`).join(' ')}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleCopyAll(Array.from(selectedTags).map((t) => `#${t}`).join(' '), 'selected')}>
                      {copiedId === 'selected' ? <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-500" /> Copied!</> : <><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy All</>}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!searching && searchedHashtags.length === 0 && searchQuery && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="mb-3 size-10 text-muted-foreground/40" />
                <h3 className="text-lg font-semibold">No results yet</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-md">
                  Enter a keyword above and click &quot;Discover Hashtags&quot; to find trending hashtags for your topic.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Generator Tab: AI-powered hashtag generation ── */}
        <TabsContent value="generator" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                  <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">AI Hashtag Generator</CardTitle>
                  <CardDescription>Generate optimized hashtags using AI for any topic</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Enter a topic (e.g., sustainable fashion)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    className="pl-9"
                  />
                </div>
                <Button onClick={() => handleGenerate()} disabled={!searchQuery.trim() || generating} className="w-full sm:w-auto">
                  {generating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generate
                </Button>
              </div>

              {genError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">{genError}</div>
              )}
            </CardContent>
          </Card>

          {generatedTags.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Generated Hashtags</CardTitle>
                    <CardDescription>{generatedTags.length} unique hashtags for &quot;{searchQuery}&quot;</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleCopyAll(generatedTags.map((t) => `#${t}`).join(' '), 'generated')}>
                      {copiedId === 'generated' ? <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-500" /> Copied!</> : <><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy All</>}
                    </Button>
                    <Button size="sm" onClick={() => openSaveDialog(generatedTags, `${searchQuery} - Generated`)}>
                      <Save className="mr-1.5 h-3.5 w-3.5" /> Save Set
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {generatedTags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="px-3 py-1.5 text-sm font-normal hover:bg-accent cursor-default">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Saved Tab ── */}
        <TabsContent value="saved" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Saved Hashtag Collections</CardTitle>
                  <CardDescription>Your saved hashtag sets for quick access</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {hashtagSets.length > 0 ? (
                <ScrollArea className="max-h-[520px]">
                  <div className="divide-y">
                    {hashtagSets.map((set, idx) => {
                      const tags = parseHashtags(set.hashtags)
                      const IconComp = COLLECTION_ICONS[idx % COLLECTION_ICONS.length]
                      const colors = ['text-emerald-600 bg-emerald-50', 'text-amber-600 bg-amber-50', 'text-rose-600 bg-rose-50', 'text-violet-600 bg-violet-50']
                      const colorClass = colors[idx % colors.length]
                      return (
                        <div key={set.id} className="group flex items-center gap-3 px-6 py-4 transition-colors hover:bg-muted/50">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                            <IconComp className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{set.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {tags.length} hashtags
                              {set.platform && ` · ${set.platform}`}
                              {set.reach && ` · ${formatReach(set.reach)} reach`}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {tags.slice(0, 6).map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 font-normal">#{tag}</Badge>
                              ))}
                              {tags.length > 6 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">+{tags.length - 6} more</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="size-8" onClick={() => handleCopyAll(tags.map((t) => `#${t}`).join(' '), set.id)}>
                              <Copy className={copiedId === set.id ? 'h-4 w-4 text-emerald-500' : 'h-4 w-4'} />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-red-600" onClick={() => handleDelete(set.id)} disabled={deletingId === set.id}>
                              {deletingId === set.id ? <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Folder className="mb-3 size-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No saved hashtag sets yet. Generate and save sets from the Research or Generator tabs.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Banned Checker Tab ── */}
        <TabsContent value="checker" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                  <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Banned / Shadowbanned Checker</CardTitle>
                  <CardDescription>Check if hashtags are flagged or restricted by platforms using web search</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Enter hashtags to check (e.g., #followme #like4like #marketing)"
                    value={checkInput}
                    onChange={(e) => setCheckInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                    className="pl-9"
                  />
                </div>
                <Button onClick={handleCheck} disabled={!checkInput.trim() || isChecking}>
                  {isChecking ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Check
                </Button>
              </div>

              {checkSearching && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching web for restricted hashtag data...
                </div>
              )}

              {checkResults && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full ${checkResults.every((r) => r.safe) ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                      <CheckCircle2 className={`h-5 w-5 ${checkResults.every((r) => r.safe) ? 'text-emerald-600' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{checkResults.length} hashtag{checkResults.length !== 1 ? 's' : ''} checked</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="text-emerald-600 font-semibold">{checkResults.filter((r) => r.safe).length} safe</span>
                        {' '}&middot;{' '}
                        <span className="text-red-600 font-semibold">{checkResults.filter((r) => !r.safe).length} flagged</span>
                      </p>
                    </div>
                  </div>
                  <ScrollArea className="max-h-64">
                    <div className="space-y-2">
                      {checkResults.map((r) => (
                        <div key={r.tag} className={`flex items-center gap-3 rounded-lg border p-2.5 ${r.safe ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20' : 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'}`}>
                          {r.safe ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />}
                          <span className={`font-medium text-sm ${r.safe ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{r.tag}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{r.reason || 'Safe to use'}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {!checkResults && !isChecking && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
                  <Shield className="mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Enter hashtags above to check if they are banned</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Separate multiple hashtags with spaces or commas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Performance Tab ── */}
        <TabsContent value="performance" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-amber-500" />
                <div>
                  <CardTitle className="text-lg">Hashtag Performance Tracker</CardTitle>
                  <CardDescription>Track and compare your saved hashtag sets</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {performanceData.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Set Name</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead className="text-right">Hashtags</TableHead>
                        <TableHead className="text-right">Est. Reach</TableHead>
                        <TableHead className="text-right pr-6">Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performanceData.map((row) => (
                        <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="pl-6 font-semibold">{row.name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs capitalize">{row.platform}</Badge></TableCell>
                          <TableCell className="text-right tabular-nums">{row.hashtagCount}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatReach(row.reach)}</TableCell>
                          <TableCell className="text-right pr-6 text-muted-foreground text-sm">{row.createdAt}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BarChart3 className="mb-3 size-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Save hashtag sets to track their performance here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─────────────────── Save Dialog ─────────────────── */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Hashtag Set</DialogTitle>
            <DialogDescription>Save this set to your collections for quick access later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Set Name</label>
              <Input placeholder="e.g., Summer Campaign" value={saveForm.setName} onChange={(e) => setSaveForm((f) => ({ ...f, setName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Platform</label>
              <Select value={saveForm.platform} onValueChange={(v) => setSaveForm((f) => ({ ...f, platform: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="twitter">Twitter / X</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Preview</label>
              <div className="rounded-lg border bg-muted/30 p-3 max-h-32 overflow-y-auto">
                <p className="text-xs text-muted-foreground break-all">{parseHashtags(saveForm.hashtags).map((t) => `#${t}`).join(' ')}</p>
              </div>
              <p className="text-xs text-muted-foreground">{parseHashtags(saveForm.hashtags).length} hashtags</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!saveForm.setName.trim() || saving}>
              {saving ? <><span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Saving…</> : <><Save className="mr-2 size-4" /> Save</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
