'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  MessageSquare,
  Search,
  Reply,
  Check,
  Trash2,
  Clock,
  AlertCircle,
  Mail,
  MailOpen,
  Send,
  X,
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  Loader2,
  Archive,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  SmilePlus,
  Frown,
  HelpCircle,
  Minus,
} from 'lucide-react'
import type { CommentItem } from '@/lib/store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterTab = 'all' | 'unread' | 'replied' | 'pending'
type SentimentFilter = 'all' | 'positive' | 'negative' | 'question' | 'neutral'
type SortOption = 'newest' | 'oldest' | 'platform' | 'sentiment'
type PlatformFilter = 'all' | 'instagram' | 'twitter' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin'

const COMMENTS_PER_PAGE = 20

// ---------------------------------------------------------------------------
// Platform helpers
// ---------------------------------------------------------------------------

const PLATFORM_STYLES: Record<string, string> = {
  instagram: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
  twitter: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  facebook: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  tiktok: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  youtube: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  linkedin: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
}

const PLATFORM_DOT: Record<string, string> = {
  instagram: 'bg-pink-500',
  twitter: 'bg-slate-500',
  facebook: 'bg-emerald-500',
  tiktok: 'bg-teal-500',
  youtube: 'bg-red-500',
  linkedin: 'bg-sky-500',
}

const AVATAR_COLORS = [
  'bg-pink-500', 'bg-slate-700', 'bg-emerald-600', 'bg-teal-500', 'bg-orange-500',
  'bg-violet-500', 'bg-rose-500', 'bg-amber-600', 'bg-fuchsia-500', 'bg-cyan-600',
  'bg-lime-600', 'bg-red-500', 'bg-indigo-500', 'bg-sky-500',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  return date.toLocaleDateString()
}

// ---------------------------------------------------------------------------
// Sentiment helpers
// ---------------------------------------------------------------------------

const SENTIMENT_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType; dotClass: string }> = {
  positive: {
    label: 'Positive',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    icon: SmilePlus,
    dotClass: 'bg-emerald-500',
  },
  negative: {
    label: 'Negative',
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
    icon: Frown,
    dotClass: 'bg-red-500',
  },
  question: {
    label: 'Question',
    className: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800',
    icon: HelpCircle,
    dotClass: 'bg-sky-500',
  },
  neutral: {
    label: 'Neutral',
    className: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/40 dark:text-gray-400 dark:border-gray-700',
    icon: Minus,
    dotClass: 'bg-gray-400',
  },
}

function SentimentBadge({ sentiment }: { sentiment: string | null | undefined }) {
  const config = SENTIMENT_CONFIG[sentiment ?? 'neutral'] ?? SENTIMENT_CONFIG.neutral
  const Icon = config.icon

  return (
    <Badge variant="outline" className={`gap-1 text-[10px] font-medium ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function CommentsSkeleton() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-stone-100 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-44" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="min-w-0 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sentiment Summary */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <Skeleton className="h-5 w-40 mb-3" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Skeleton className="h-9 w-72" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-40" />
                <Skeleton className="h-9 w-52" />
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <div className="flex flex-col">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i}>
                  <div className="px-4 py-5 sm:px-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full ml-12 mb-2" />
                    <Skeleton className="h-4 w-3/4 ml-12 mb-3" />
                    <div className="ml-12 flex gap-2">
                      <Skeleton className="h-7 w-16" />
                      <Skeleton className="h-7 w-24" />
                      <Skeleton className="h-7 w-16" />
                    </div>
                  </div>
                  {i < 4 && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
          <Separator />
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-48" />
          </div>
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CommentsPage() {
  const [, setComments] = useState<CommentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzingSentiment, setAnalyzingSentiment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>('all')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [search, setSearch] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [aiReplyLoading, setAiReplyLoading] = useState<string | null>(null)

  // Bulk action state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)

  // Extended comment type with sentiment
  type ExtendedComment = CommentItem & { sentiment?: string | null; archived?: boolean }

  const [extendedComments, setExtendedComments] = useState<ExtendedComment[]>([])

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      let url = '/api/comments'
      if (filter === 'unread') url += '?isRead=false'

      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch comments')
      const data = await res.json()
      setComments(data)
      setExtendedComments(data)
    } catch (err) {
      console.error('Failed to fetch comments:', err)
      setError('Failed to load comments. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // ── Derived stats ──
  const totalComments = extendedComments.length
  const unreadCount = extendedComments.filter((c) => !c.isRead).length
  const repliedCount = extendedComments.filter((c) => c.isReplied).length

  // ── Sentiment stats ──
  const sentimentCounts = {
    positive: extendedComments.filter((c) => c.sentiment === 'positive').length,
    negative: extendedComments.filter((c) => c.sentiment === 'negative').length,
    question: extendedComments.filter((c) => c.sentiment === 'question').length,
    neutral: extendedComments.filter((c) => c.sentiment === 'neutral' || !c.sentiment).length,
  }

  // ── Analyze sentiment ──
  async function handleAnalyzeSentiment() {
    setAnalyzingSentiment(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze' }),
      })
      if (!res.ok) throw new Error('Failed to analyze sentiments')
      const data = await res.json()
      setExtendedComments(data.comments)
      setComments(data.comments)
    } catch (err) {
      console.error('Failed to analyze sentiments:', err)
    } finally {
      setAnalyzingSentiment(false)
    }
  }

  // ── Client-side filtering + sorting ──
  const filteredComments = extendedComments
    .filter((c) => {
      if (c.archived) return false
      // Tab filter
      if (filter === 'unread' && c.isRead) return false
      if (filter === 'replied' && !c.isReplied) return false
      if (filter === 'pending' && c.isReplied) return false

      // Sentiment filter
      if (sentimentFilter !== 'all') {
        if (sentimentFilter === 'neutral') {
          if (c.sentiment && c.sentiment !== 'neutral') return false
        } else {
          if (c.sentiment !== sentimentFilter) return false
        }
      }

      // Platform filter
      if (platformFilter !== 'all' && c.platform !== platformFilter) return false

      // Search filter
      if (search) {
        const q = search.toLowerCase()
        return (
          c.content.toLowerCase().includes(q) ||
          c.author.toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'platform':
          return a.platform.localeCompare(b.platform)
        case 'sentiment':
          return (a.sentiment ?? 'neutral').localeCompare(b.sentiment ?? 'neutral')
        default:
          return 0
      }
    })

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filteredComments.length / COMMENTS_PER_PAGE))
  const paginatedComments = filteredComments.slice(
    (currentPage - 1) * COMMENTS_PER_PAGE,
    currentPage * COMMENTS_PER_PAGE
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [filter, sentimentFilter, platformFilter, sortBy, search])

  // ── Selection helpers ──
  const allOnPageSelected = paginatedComments.length > 0 && paginatedComments.every((c) => selectedIds.has(c.id))

  function toggleSelectAll() {
    if (allOnPageSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedComments.map((c) => c.id)))
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Bulk actions ──
  async function handleBulkMarkRead() {
    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetch('/api/comments', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, isRead: true }),
        })
      )
      await Promise.all(promises)
      setSelectedIds(new Set())
      await fetchComments()
    } catch (err) {
      console.error('Bulk mark as read failed:', err)
    }
  }

  async function handleBulkMarkUnread() {
    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetch('/api/comments', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, isRead: false }),
        })
      )
      await Promise.all(promises)
      setSelectedIds(new Set())
      await fetchComments()
    } catch (err) {
      console.error('Bulk mark as unread failed:', err)
    }
  }

  async function handleBulkArchive() {
    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetch('/api/comments', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, archived: true }),
        })
      )
      await Promise.all(promises)
      setSelectedIds(new Set())
      await fetchComments()
    } catch (err) {
      console.error('Bulk archive failed:', err)
    }
  }

  // ── Single comment handlers ──

  async function handleMarkAsRead(id: string) {
    try {
      await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isRead: true }),
      })
      await fetchComments()
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/comments?id=${id}`, { method: 'DELETE' })
      await fetchComments()
    } catch (err) {
      console.error('Failed to delete comment:', err)
    }
  }

  function handleOpenReply(id: string) {
    setReplyingTo(id)
    setReplyText('')
  }

  function handleCancelReply() {
    setReplyingTo(null)
    setReplyText('')
  }

  async function handleSendReply() {
    if (!replyingTo || !replyText.trim()) return
    try {
      setSendingReply(true)
      await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: replyingTo, reply: replyText.trim(), isReplied: true, isRead: true }),
      })
      setReplyingTo(null)
      setReplyText('')
      await fetchComments()
    } catch (err) {
      console.error('Failed to send reply:', err)
    } finally {
      setSendingReply(false)
    }
  }

  // ── AI Suggest Reply ──
  async function handleAiSuggestReply(commentId: string, commentContent: string) {
    setAiReplyLoading(commentId)
    setReplyingTo(commentId)
    setReplyText('')
    try {
      const res = await fetch('/api/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, commentContent }),
      })
      if (!res.ok) throw new Error('Failed to generate AI reply')
      const data = await res.json()
      setReplyText(data.suggestedReply)
    } catch (err) {
      console.error('AI reply failed:', err)
    } finally {
      setAiReplyLoading(null)
    }
  }

  // ── Error state ──
  if (error && !loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-stone-100 dark:from-slate-950 dark:to-slate-900">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Button onClick={fetchComments} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (loading) return <CommentsSkeleton />

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-stone-100 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
                Comments Manager
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {unreadCount} unread
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage and respond to comments across all platforms
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyzeSentiment}
            disabled={analyzingSentiment}
            className="gap-1.5"
          >
            {analyzingSentiment ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {analyzingSentiment ? 'Analyzing...' : 'Analyze Sentiment'}
          </Button>
        </div>

        {/* Quick Stats Bar */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Total Comments</p>
                <p className="text-lg font-bold tabular-nums text-foreground">{totalComments}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Unread</p>
                <p className="text-lg font-bold tabular-nums text-destructive">{unreadCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <Check className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Replied</p>
                <p className="text-lg font-bold tabular-nums text-emerald-600">{repliedCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Avg Response</p>
                <p className="text-lg font-bold tabular-nums text-amber-600">
                  {totalComments > 0
                    ? repliedCount > 0
                      ? '2.4h'
                      : '--'
                    : '--'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sentiment Summary Card */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Sentiment Overview</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3">
                <div className={`h-3 w-3 rounded-full ${SENTIMENT_CONFIG.positive.dotClass}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Positive</p>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {sentimentCounts.positive}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({totalComments > 0 ? Math.round((sentimentCounts.positive / totalComments) * 100) : 0}%)
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-950/30 p-3">
                <div className={`h-3 w-3 rounded-full ${SENTIMENT_CONFIG.negative.dotClass}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Negative</p>
                  <p className="text-sm font-bold text-red-700 dark:text-red-400">
                    {sentimentCounts.negative}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({totalComments > 0 ? Math.round((sentimentCounts.negative / totalComments) * 100) : 0}%)
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 p-3">
                <div className={`h-3 w-3 rounded-full ${SENTIMENT_CONFIG.question.dotClass}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Questions</p>
                  <p className="text-sm font-bold text-sky-700 dark:text-sky-400">
                    {sentimentCounts.question}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({totalComments > 0 ? Math.round((sentimentCounts.question / totalComments) * 100) : 0}%)
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-gray-100 dark:bg-gray-900/40 p-3">
                <div className={`h-3 w-3 rounded-full ${SENTIMENT_CONFIG.neutral.dotClass}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Neutral</p>
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-400">
                    {sentimentCounts.neutral}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({totalComments > 0 ? Math.round((sentimentCounts.neutral / totalComments) * 100) : 0}%)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            {/* Filter Row */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Tabs
                value={filter}
                onValueChange={(v) => setFilter(v as FilterTab)}
                className="w-full sm:w-auto"
              >
                <TabsList className="h-9 w-full sm:w-auto">
                  <TabsTrigger value="all" className="text-xs">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="gap-1.5 text-xs">
                    <Mail className="h-3 w-3" />
                    Unread
                  </TabsTrigger>
                  <TabsTrigger value="replied" className="gap-1.5 text-xs">
                    <Reply className="h-3 w-3" />
                    Replied
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="gap-1.5 text-xs">
                    <Clock className="h-3 w-3" />
                    Pending
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select
                  value={sentimentFilter}
                  onValueChange={(v) => setSentimentFilter(v as SentimentFilter)}
                >
                  <SelectTrigger className="h-9 w-full text-xs sm:w-[140px]">
                    <SelectValue placeholder="All Sentiments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sentiments</SelectItem>
                    <SelectItem value="positive">😊 Positive</SelectItem>
                    <SelectItem value="negative">😞 Negative</SelectItem>
                    <SelectItem value="question">❓ Questions</SelectItem>
                    <SelectItem value="neutral">😐 Neutral</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={platformFilter}
                  onValueChange={(v) => setPlatformFilter(v as PlatformFilter)}
                >
                  <SelectTrigger className="h-9 w-full text-xs sm:w-[140px]">
                    <SelectValue placeholder="All Platforms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-full sm:w-[180px]">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search comments..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 pl-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Sort + Bulk Actions Row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="h-8 w-full text-xs sm:w-[150px]">
                    <ArrowUpDown className="h-3 w-3 mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="platform">By Platform</SelectItem>
                    <SelectItem value="sentiment">By Sentiment</SelectItem>
                  </SelectContent>
                </Select>

                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-xs">
                      {selectedIds.size} selected
                    </Badge>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={handleBulkMarkRead}>
                      <Check className="h-3 w-3" /> Mark Read
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={handleBulkMarkUnread}>
                      <Mail className="h-3 w-3" /> Mark Unread
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={handleBulkArchive}>
                      <Archive className="h-3 w-3" /> Archive
                    </Button>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={toggleSelectAll}
              >
                <Checkbox checked={allOnPageSelected} className="h-3.5 w-3.5 mr-0.5" />
                {allOnPageSelected ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="p-0">
            {/* Comments list */}
            <ScrollArea className="max-h-[600px]">
              <div className="flex flex-col">
                {paginatedComments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <MailOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">
                      No comments found
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      Try adjusting your filters or search query
                    </p>
                  </div>
                ) : (
                  paginatedComments.map((comment, index) => {
                    const platformLower = comment.platform.toLowerCase()
                    const platformStyle = PLATFORM_STYLES[platformLower] || PLATFORM_STYLES.twitter
                    const platformDotColor = PLATFORM_DOT[platformLower] || PLATFORM_DOT.twitter
                    const avatarColor = getAvatarColor(comment.author)
                    const platformLabel = comment.platform.charAt(0).toUpperCase() + comment.platform.slice(1).toLowerCase()
                    const isSelected = selectedIds.has(comment.id)

                    return (
                      <div key={comment.id}>
                        <div
                          className={`
                            relative px-4 py-4 transition-colors hover:bg-muted/40 sm:px-6
                            ${!comment.isRead ? 'border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}
                            ${isSelected ? 'bg-primary/5' : ''}
                          `}
                        >
                          {/* Unread dot */}
                          {!comment.isRead && (
                            <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-primary sm:right-6" />
                          )}

                          {/* Selection checkbox */}
                          <div className="absolute left-1 top-5 sm:left-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(comment.id)}
                              className="h-3.5 w-3.5"
                            />
                          </div>

                          {/* Author row */}
                          <div className="mb-2 flex items-center gap-3 ml-5 sm:ml-6">
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarFallback
                                className={`${avatarColor} text-xs font-semibold text-white`}
                              >
                                {getInitials(comment.author)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">
                                  {comment.author}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className={`gap-1 text-[10px] font-medium ${platformStyle}`}
                                >
                                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${platformDotColor}`} />
                                  {platformLabel}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
                                {comment.sentiment && <SentimentBadge sentiment={comment.sentiment} />}
                                {comment.isReplied ? (
                                  <Badge
                                    variant="outline"
                                    className="border-emerald-300 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                                  >
                                    Replied
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="border-amber-300 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400"
                                  >
                                    Pending
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Comment text */}
                          <p className="ml-12 text-sm leading-relaxed text-foreground/90">
                            {comment.content}
                          </p>

                          {/* Existing reply */}
                          {comment.reply && (
                            <div className="ml-12 mt-3">
                              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                                <div className="mb-1 flex items-center gap-2">
                                  <span className="text-xs font-semibold text-primary">You</span>
                                  <span className="text-xs text-muted-foreground">Replied</span>
                                </div>
                                <p className="text-sm leading-relaxed text-foreground/80">{comment.reply}</p>
                              </div>
                            </div>
                          )}

                          {/* Inline Reply Form */}
                          {replyingTo === comment.id && (
                            <div className="ml-12 mt-3">
                              <div className="rounded-lg border bg-muted/50 p-3">
                                <div className="mb-2 rounded bg-muted p-2 text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground/60">@{comment.author}</span>:{' '}
                                  {comment.content.length > 120
                                    ? comment.content.slice(0, 120) + '...'
                                    : comment.content}
                                </div>
                                <Textarea
                                  placeholder={aiReplyLoading === comment.id ? 'Generating AI reply...' : 'Write your reply...'}
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  className="min-h-[80px] resize-none text-sm"
                                  autoFocus
                                  disabled={aiReplyLoading === comment.id}
                                />
                                <div className="mt-2 flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancelReply}
                                    className="h-8 gap-1.5 text-xs"
                                    disabled={sendingReply}
                                  >
                                    <X className="h-3 w-3" />
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={handleSendReply}
                                    disabled={!replyText.trim() || sendingReply}
                                    className="h-8 gap-1.5 text-xs"
                                  >
                                    <Send className="h-3 w-3" />
                                    {sendingReply ? 'Sending...' : 'Send Reply'}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="ml-12 mt-3 flex flex-wrap items-center gap-2">
                            {!comment.isReplied && replyingTo !== comment.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenReply(comment.id)}
                                className="h-7 gap-1.5 text-xs"
                              >
                                <Reply className="h-3 w-3" />
                                Reply
                              </Button>
                            )}
                            {!comment.isReplied && replyingTo !== comment.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAiSuggestReply(comment.id, comment.content)}
                                disabled={aiReplyLoading === comment.id}
                                className="h-7 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5"
                              >
                                {aiReplyLoading === comment.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Sparkles className="h-3 w-3" />
                                )}
                                {aiReplyLoading === comment.id ? 'Generating...' : 'AI Suggest Reply'}
                              </Button>
                            )}
                            {!comment.isRead && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkAsRead(comment.id)}
                                className="h-7 gap-1.5 text-xs"
                              >
                                <Check className="h-3 w-3" />
                                Mark as Read
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(comment.id)}
                              className="h-7 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          </div>
                        </div>
                        {index < paginatedComments.length - 1 && <Separator />}
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>

          {/* Footer with Pagination */}
          <Separator />
          <div className="flex flex-col gap-3 sm:flex-row items-center justify-between px-4 py-3 sm:px-6">
            <p className="text-xs text-muted-foreground">
              Showing {((currentPage - 1) * COMMENTS_PER_PAGE) + 1}–{Math.min(currentPage * COMMENTS_PER_PAGE, filteredComments.length)} of {filteredComments.length} comments
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600 font-medium">
                  {totalComments > 0 ? Math.round((repliedCount / totalComments) * 100) : 0}%
                </span>{' '}
                response rate
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground px-1">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
