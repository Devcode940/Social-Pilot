'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Edit3,
  Trash2,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Linkedin,
  Music2,
  CheckCircle2,
  CircleDot,
  AlertCircle,
  CalendarDays,
  LayoutGrid,
  CalendarIcon,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import type { Post } from '@/lib/store'

// ─── Types ───────────────────────────────────────────────────────────────────

type Platform = 'instagram' | 'twitter' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin'
type PostStatus = 'scheduled' | 'published' | 'draft' | 'failed'
type ViewMode = 'month' | 'week'

// ─── Constants ───────────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<
  Platform,
  { label: string; color: string; dotClass: string; bgClass: string; icon: React.ReactNode }
> = {
  instagram: {
    label: 'Instagram',
    color: 'bg-pink-500',
    dotClass: 'bg-pink-500',
    bgClass: 'bg-pink-50 text-pink-700 border-pink-200',
    icon: <Instagram className="h-3.5 w-3.5" />,
  },
  twitter: {
    label: 'Twitter / X',
    color: 'bg-slate-500',
    dotClass: 'bg-slate-500',
    bgClass: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: <Twitter className="h-3.5 w-3.5" />,
  },
  facebook: {
    label: 'Facebook',
    color: 'bg-blue-600',
    dotClass: 'bg-blue-600',
    bgClass: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Facebook className="h-3.5 w-3.5" />,
  },
  tiktok: {
    label: 'TikTok',
    color: 'bg-teal-500',
    dotClass: 'bg-teal-500',
    bgClass: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: <Music2 className="h-3.5 w-3.5" />,
  },
  youtube: {
    label: 'YouTube',
    color: 'bg-red-500',
    dotClass: 'bg-red-500',
    bgClass: 'bg-red-50 text-red-700 border-red-200',
    icon: <Youtube className="h-3.5 w-3.5" />,
  },
  linkedin: {
    label: 'LinkedIn',
    color: 'bg-sky-600',
    dotClass: 'bg-sky-600',
    bgClass: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: <Linkedin className="h-3.5 w-3.5" />,
  },
}

const STATUS_CONFIG: Record<
  PostStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'outline' | 'destructive'
    icon: React.ReactNode
    dotColor: string
    bgColor: string
  }
> = {
  scheduled: {
    label: 'Scheduled',
    variant: 'secondary',
    icon: <Clock className="h-3 w-3" />,
    dotColor: 'bg-sky-400',
    bgColor: 'bg-sky-50',
  },
  published: {
    label: 'Published',
    variant: 'default',
    icon: <CheckCircle2 className="h-3 w-3" />,
    dotColor: 'bg-emerald-500',
    bgColor: 'bg-emerald-50',
  },
  draft: {
    label: 'Draft',
    variant: 'outline',
    icon: <CircleDot className="h-3 w-3" />,
    dotColor: 'bg-gray-400',
    bgColor: 'bg-gray-50',
  },
  failed: {
    label: 'Failed',
    variant: 'destructive',
    icon: <AlertCircle className="h-3 w-3" />,
    dotColor: 'bg-red-500',
    bgColor: 'bg-red-50',
  },
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_OF_WEEK_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePlatforms(platforms: string): Platform[] {
  return platforms
    .split(',')
    .map((p) => p.trim().toLowerCase() as Platform)
    .filter((p): p is Platform => p in PLATFORM_CONFIG)
}

function getPostDate(post: Post): Date | null {
  if (post.scheduledAt) return new Date(post.scheduledAt)
  if (post.publishedAt) return new Date(post.publishedAt)
  return null
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay()
}

function getWeekDates(date: Date): Date[] {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    days.push(d)
  }
  return days
}

interface CalendarDay {
  day: number
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  posts: Post[]
}

function buildCalendarDays(
  year: number,
  month: number,
  allPosts: Post[]
): CalendarDay[] {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const prevDays = getDaysInMonth(prevYear, prevMonth)

  const days: CalendarDay[] = []

  const today = new Date()
  const todayDay = today.getDate()
  const todayMonth = today.getMonth() + 1
  const todayYear = today.getFullYear()

  // Fill in leading days from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = prevDays - i
    const date = new Date(prevYear, prevMonth - 1, day)
    days.push({ day, date, isCurrentMonth: false, isToday: false, posts: [] })
  }

  // Fill in current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    const dateKey = formatDateKey(date)
    const posts = allPosts.filter((post) => {
      const postDate = getPostDate(post)
      if (!postDate) return false
      return formatDateKey(postDate) === dateKey
    })
    days.push({
      day: d,
      date,
      isCurrentMonth: true,
      isToday: d === todayDay && month === todayMonth && year === todayYear,
      posts,
    })
  }

  // Fill in trailing days to complete the grid
  const remaining = 42 - days.length
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(nextYear, nextMonth - 1, i)
    days.push({ day: i, date, isCurrentMonth: false, isToday: false, posts: [] })
  }

  return days
}

function getUpcomingPosts(allPosts: Post[], limit: number): Post[] {
  const now = new Date()
  return allPosts
    .filter((p) => {
      if (p.status !== 'scheduled' || !p.scheduledAt) return false
      return new Date(p.scheduledAt) >= now
    })
    .sort((a, b) => {
      const dateA = new Date(a.scheduledAt!).getTime()
      const dateB = new Date(b.scheduledAt!).getTime()
      return dateA - dateB
    })
    .slice(0, limit)
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform: Platform }) {
  const config = PLATFORM_CONFIG[platform]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${config.bgClass}`}>
      {config.icon}
      {config.label}
    </span>
  )
}

function StatusBadge({ status }: { status: PostStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant={config.variant} className="gap-1 text-[11px]">
      {config.icon}
      {config.label}
    </Badge>
  )
}

function PlatformDot({ platform }: { platform: Platform }) {
  const config = PLATFORM_CONFIG[platform]
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${config.dotClass}`}
      title={config.label}
    />
  )
}

function StatusDot({ status }: { status: PostStatus }) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[status].dotColor}`}
      title={STATUS_CONFIG[status].label}
    />
  )
}

/** Color-coded post count badge for a calendar cell */
function PostCountIndicator({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null

  const statusGroups = posts.reduce<Record<PostStatus, number>>((acc, post) => {
    const s = post.status as PostStatus
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {} as Record<PostStatus, number>)

  return (
    <div className="flex items-center gap-1 flex-wrap mt-0.5">
      {Object.entries(statusGroups).map(([status, count]) => (
        <div key={status} className="flex items-center gap-0.5">
          <StatusDot status={status as PostStatus} />
          <span className="text-[10px] text-muted-foreground leading-none">{count}</span>
        </div>
      ))}
      {posts.length > 0 && (
        <span className="text-[10px] font-semibold text-muted-foreground ml-auto">
          {posts.length}
        </span>
      )}
    </div>
  )
}

// ─── Day Detail Dialog Content ───────────────────────────────────────────────

function DayDetailContent({
  day,
  month,
  year,
  posts,
  onDelete,
  onEdit,
}: {
  day: number
  month: number
  year: number
  posts: Post[]
  onDelete: (id: string) => Promise<void>
  onEdit: () => void
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleConfirmDelete(id: string) {
    setDeleting(true)
    await onDelete(id)
    setDeleting(false)
    setDeleteId(null)
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Clock className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No posts scheduled</p>
        <p className="text-xs mt-1">Click &quot;Schedule Post&quot; to create one</p>
      </div>
    )
  }

  // Group posts by status
  const grouped = posts.reduce<Record<string, Post[]>>((acc, post) => {
    const key = post.status
    if (!acc[key]) acc[key] = []
    acc[key].push(post)
    return acc
  }, {})

  const statusOrder: PostStatus[] = ['published', 'scheduled', 'draft', 'failed']

  return (
    <div className="space-y-4">
      {statusOrder
        .filter((s) => grouped[s]?.length > 0)
        .map((status) => (
          <div key={status}>
            <div className="flex items-center gap-2 mb-2">
              <StatusDot status={status} />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {STATUS_CONFIG[status].label} ({grouped[status].length})
              </span>
            </div>
            <div className="space-y-2">
              {grouped[status].map((post) => {
                const platforms = parsePlatforms(post.platforms)
                const postDate = getPostDate(post)
                const time = postDate ? formatTime(postDate.toISOString()) : ''

                return (
                  <Card
                    key={post.id}
                    className="border border-border/60 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <CardContent className="p-3 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {platforms.map((p) => (
                            <PlatformBadge key={p} platform={p} />
                          ))}
                        </div>
                        <StatusBadge status={post.status as PostStatus} />
                      </div>

                      <p className="text-sm leading-relaxed text-foreground/90 line-clamp-2">
                        {post.content}
                      </p>

                      {time && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {MONTH_NAMES[month - 1]} {day}, {year} at {time}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          onClick={onEdit}
                        >
                          <Edit3 className="h-3 w-3" />
                          Edit
                        </Button>
                        {deleteId === post.id ? (
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={deleting}
                              onClick={() => handleConfirmDelete(post.id)}
                            >
                              {deleting ? 'Deleting...' : 'Confirm'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setDeleteId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteId(post.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
    </div>
  )
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function CalendarSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3 w-48 hidden sm:block" />
              </div>
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-8 w-32 hidden sm:block" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <Card>
            <CardContent className="p-2 sm:p-4">
              <div className="grid grid-cols-7 mb-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 mx-0.5" />
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border bg-border">
                {Array.from({ length: 42 }).map((_, i) => (
                  <Skeleton key={i} className="min-h-[72px] sm:min-h-[90px]" />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="p-0 pb-2">
                <div className="px-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3 py-2">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

// ─── Week View Component ─────────────────────────────────────────────────────

function WeekView({
  currentDate,
  allPosts,
  onDayClick,
}: {
  currentDate: Date
  allPosts: Post[]
  onDayClick: (date: Date, posts: Post[]) => void
}) {
  const weekDates = getWeekDates(currentDate)
  const today = new Date()
  const todayKey = formatDateKey(today)

  return (
    <Card>
      <CardContent className="p-2 sm:p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {weekDates.map((date, idx) => {
            const isToday = formatDateKey(date) === todayKey
            return (
              <div
                key={idx}
                className={`py-2 text-center text-xs font-semibold uppercase tracking-wider rounded-t-lg ${
                  isToday ? 'text-primary bg-primary/5' : 'text-muted-foreground'
                }`}
              >
                <span className="hidden sm:inline">{DAYS_OF_WEEK[idx]}</span>
                <span className="sm:hidden">{DAYS_OF_WEEK_SHORT[idx]}</span>
              </div>
            )
          })}
        </div>

        {/* Week cells */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {weekDates.map((date, idx) => {
            const dateKey = formatDateKey(date)
            const isToday = dateKey === todayKey
            const posts = allPosts.filter((post) => {
              const postDate = getPostDate(post)
              if (!postDate) return false
              return formatDateKey(postDate) === dateKey
            })

            return (
              <TooltipProvider key={idx} delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onDayClick(date, posts)}
                      className={`
                        relative min-h-[140px] sm:min-h-[200px] p-1.5 sm:p-2 rounded-lg text-left transition-colors
                        ${isToday ? 'ring-2 ring-primary bg-primary/5' : 'bg-muted/30 hover:bg-muted/60'}
                        border border-border/50 cursor-pointer
                      `}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-sm font-semibold ${
                            isToday ? 'text-primary' : 'text-foreground'
                          }`}
                        >
                          {date.getDate()}
                        </span>
                        {posts.length > 0 && (
                          <span className="text-[10px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-semibold">
                            {posts.length}
                          </span>
                        )}
                      </div>

                      {/* Post indicators */}
                      <div className="space-y-1">
                        {posts.slice(0, 3).map((post) => {
                          const platforms = parsePlatforms(post.platforms)
                          const firstPlatform = platforms[0]

                          return (
                            <div
                              key={post.id}
                              className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-none ${STATUS_CONFIG[post.status as PostStatus].bgColor}`}
                            >
                              {firstPlatform && <PlatformDot platform={firstPlatform} />}
                              <span className="truncate text-muted-foreground max-w-[50px] sm:max-w-[80px]">
                                {post.content.substring(0, 20)}
                              </span>
                            </div>
                          )
                        })}
                        {posts.length > 3 && (
                          <span className="text-[10px] text-muted-foreground font-medium pl-1">
                            +{posts.length - 3} more
                          </span>
                        )}
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    {posts.length === 0 ? (
                      <p className="text-xs">No posts</p>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold">{posts.length} post(s)</p>
                        {posts.slice(0, 4).map((post) => (
                          <div key={post.id} className="flex items-start gap-1">
                            <StatusDot status={post.status as PostStatus} />
                            <span className="text-[11px] text-muted-foreground line-clamp-1">
                              {post.content}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { setCurrentPage } = useAppStore()
  const today = new Date()

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(today)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  // For week view dialog: stores posts for a specific date
  const [dialogPosts, setDialogPosts] = useState<Post[]>([])

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1

  // Pure data loader: no state writes, safe to drive from effects or handlers.
  // Returns null on non-OK responses (caller keeps previous posts), matching
  // the original semantics.
  const loadPosts = useCallback(async (): Promise<Post[] | null> => {
    const res = await fetch('/api/posts')
    if (!res.ok) return null
    return (await res.json()) as Post[]
  }, [])

  // Handler entry point (refresh buttons etc.): sets state from an event.
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true)
      const data = await loadPosts()
      if (data) setPosts(data)
    } catch (err) {
      console.error('Failed to fetch posts:', err)
    } finally {
      setLoading(false)
    }
  }, [loadPosts])

  // Mount-only load: every setState below runs in a promise continuation
  // (post-await), never synchronously in the effect body.
  useEffect(() => {
    let cancelled = false
    loadPosts()
      .then((data) => {
        if (cancelled) return
        if (data) setPosts(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.error('Failed to fetch posts:', err)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadPosts])

  const handleDeletePost = useCallback(async (id: string) => {
    try {
      await fetch(`/api/posts?id=${id}`, { method: 'DELETE' })
      await fetchPosts()
      setDialogOpen(false)
    } catch (err) {
      console.error('Failed to delete post:', err)
    }
  }, [fetchPosts])

  const handleEditPost = useCallback(() => {
    setDialogOpen(false)
    setCurrentPage('poster')
  }, [setCurrentPage])

  const handleSchedulePostForDate = useCallback(
    (date: Date) => {
      setDialogOpen(false)
      setCurrentPage('poster')
      // Store the pre-filled date in sessionStorage for the poster to pick up
      sessionStorage.setItem(
        'scheduleDate',
        date.toISOString()
      )
    },
    [setCurrentPage]
  )

  const calendarDays = useMemo(
    () => buildCalendarDays(currentYear, currentMonth, posts),
    [currentYear, currentMonth, posts]
  )

  const upcomingPosts = useMemo(
    () => getUpcomingPosts(posts, 5),
    [posts]
  )

  function goToPrevMonth() {
    setCurrentDate((prev) => {
      const m = prev.getMonth() === 0 ? 11 : prev.getMonth() - 1
      const y = prev.getMonth() === 0 ? prev.getFullYear() - 1 : prev.getFullYear()
      return new Date(y, m, 1)
    })
  }

  function goToNextMonth() {
    setCurrentDate((prev) => {
      const m = prev.getMonth() === 11 ? 0 : prev.getMonth() + 1
      const y = prev.getMonth() === 11 ? prev.getFullYear() + 1 : prev.getFullYear()
      return new Date(y, m, 1)
    })
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  function goToPrevWeek() {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
  }

  function goToNextWeek() {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
  }

  function handleMonthDayClick(day: CalendarDay) {
    if (!day.isCurrentMonth) return
    setSelectedDay(day.day)
    setDialogPosts(day.posts)
    setDialogOpen(true)
  }

  function handleWeekDayClick(date: Date, dayPosts: Post[]) {
    setSelectedDay(date.getDate())
    setDialogPosts(dayPosts)
    setDialogOpen(true)
  }

  // Compute the "selected date" for the dialog header based on the view mode
  const dialogDate = useMemo(() => {
    if (viewMode === 'month' && selectedDay !== null) {
      return new Date(currentYear, currentMonth - 1, selectedDay)
    }
    if (viewMode === 'week') {
      return currentDate
    }
    return new Date()
  }, [viewMode, selectedDay, currentYear, currentMonth, currentDate])

  // ── Stats for current month ──
  const monthPosts = posts.filter((post) => {
    const date = getPostDate(post)
    if (!date) return false
    return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear
  })

  // Week label
  const weekLabel = useMemo(() => {
    const weekDates = getWeekDates(currentDate)
    const start = weekDates[0]
    const end = weekDates[6]
    if (start.getMonth() === end.getMonth()) {
      return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`
    }
    return `${MONTH_NAMES[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`
  }, [currentDate])

  if (loading) return <CalendarSkeleton />

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold leading-tight">Content Calendar</h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    Social Media Management
                  </p>
                </div>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => setCurrentPage('poster')}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Post</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Navigation & Controls */}
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {/* Navigation buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={viewMode === 'month' ? goToPrevMonth : goToPrevWeek}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={goToToday}>
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={viewMode === 'month' ? goToNextMonth : goToNextWeek}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Title */}
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {viewMode === 'month'
                    ? `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`
                    : weekLabel}
                </h2>

                {/* View mode toggle + platform badges */}
                <div className="flex items-center gap-3">
                  <ToggleGroup
                    type="single"
                    value={viewMode}
                    onValueChange={(v) => {
                      if (v) setViewMode(v as ViewMode)
                    }}
                    className="bg-muted rounded-lg p-0.5"
                  >
                    <ToggleGroupItem
                      value="month"
                      size="sm"
                      className="h-7 px-2.5 gap-1 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm"
                    >
                      <LayoutGrid className="h-3 w-3" />
                      <span className="hidden sm:inline">Month</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="week"
                      size="sm"
                      className="h-7 px-2.5 gap-1 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm"
                    >
                      <CalendarIcon className="h-3 w-3" />
                      <span className="hidden sm:inline">Week</span>
                    </ToggleGroupItem>
                  </ToggleGroup>

                  <div className="hidden md:flex items-center gap-1.5">
                    {Object.entries(PLATFORM_CONFIG).slice(0, 4).map(([key, config]) => (
                      <span
                        key={key}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${config.bgClass}`}
                      >
                        {config.icon}
                        <span className="hidden lg:inline">{config.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            {/* Calendar Grid */}
            {viewMode === 'month' ? (
              <Card>
                <CardContent className="p-2 sm:p-4">
                  {/* Day-of-week headers */}
                  <div className="grid grid-cols-7 mb-1">
                    {DAYS_OF_WEEK.map((d) => (
                      <div
                        key={d}
                        className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                      >
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Calendar cells */}
                  <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border bg-border">
                    {calendarDays.map((day, idx) => {
                      const hasPosts = day.posts.length > 0
                      const isClickable = day.isCurrentMonth

                      return (
                        <TooltipProvider key={idx} delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleMonthDayClick(day)}
                                disabled={!isClickable}
                                className={`
                                  relative min-h-[72px] sm:min-h-[90px] p-1.5 sm:p-2 text-left transition-colors
                                  ${
                                    day.isCurrentMonth
                                      ? 'bg-background hover:bg-muted/60 cursor-pointer'
                                      : 'bg-muted/30 cursor-default'
                                  }
                                  ${hasPosts ? 'bg-muted/40' : ''}
                                  ${day.isToday ? 'ring-2 ring-primary ring-inset' : ''}
                                  ${hasPosts && day.isCurrentMonth ? 'hover:bg-muted/70' : ''}
                                `}
                              >
                                {/* Day number */}
                                <span
                                  className={`
                                    text-xs sm:text-sm font-medium leading-none
                                    ${day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'}
                                    ${day.isToday ? 'text-primary font-bold' : ''}
                                  `}
                                >
                                  {day.day}
                                </span>

                                {/* Color-coded post indicators */}
                                {day.isCurrentMonth && hasPosts && (
                                  <div className="mt-1 space-y-0.5">
                                    {day.posts.slice(0, 2).map((post) => {
                                      const platforms = parsePlatforms(post.platforms)
                                      const firstPlatform = platforms[0]
                                      const statusConf = STATUS_CONFIG[post.status as PostStatus]

                                      return (
                                        <div
                                          key={post.id}
                                          className={`flex items-center gap-1 rounded px-0.5 py-px ${statusConf.bgColor}`}
                                        >
                                          {firstPlatform && <PlatformDot platform={firstPlatform} />}
                                          <span className="text-[10px] leading-none text-muted-foreground truncate hidden sm:block max-w-[60px]">
                                            {post.content.substring(0, 18)}
                                          </span>
                                        </div>
                                      )
                                    })}
                                    <PostCountIndicator posts={day.posts} />
                                  </div>
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              {day.isCurrentMonth && hasPosts ? (
                                <div className="space-y-1.5">
                                  <p className="text-xs font-semibold">
                                    {MONTH_NAMES[currentMonth - 1]} {day.day} — {day.posts.length} post(s)
                                  </p>
                                  {day.posts.slice(0, 5).map((post) => (
                                    <div key={post.id} className="flex items-start gap-1.5">
                                      <StatusDot status={post.status as PostStatus} />
                                      <span className="text-[11px] text-muted-foreground leading-tight">
                                        <span className="font-medium">
                                          {STATUS_CONFIG[post.status as PostStatus].label}:
                                        </span>{' '}
                                        {post.content}
                                      </span>
                                    </div>
                                  ))}
                                  {day.posts.length > 5 && (
                                    <p className="text-[10px] text-muted-foreground">
                                      +{day.posts.length - 5} more...
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No posts</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <WeekView
                currentDate={currentDate}
                allPosts={posts}
                onDayClick={handleWeekDayClick}
              />
            )}

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Upcoming Posts */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Upcoming Posts</CardTitle>
                  <CardDescription>
                    Next {upcomingPosts.length} scheduled posts
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 pb-2">
                  <ScrollArea className="max-h-[480px]">
                    <div className="px-4 space-y-0">
                      {upcomingPosts.length === 0 ? (
                        <div className="flex flex-col items-center py-10 text-muted-foreground">
                          <Clock className="h-8 w-8 mb-2 opacity-40" />
                          <p className="text-sm">No upcoming posts</p>
                        </div>
                      ) : (
                        upcomingPosts.map((post, idx) => {
                          const platforms = parsePlatforms(post.platforms)
                          const firstPlatform = platforms[0]
                          const postDate = getPostDate(post)
                          const day = postDate ? postDate.getDate() : 0
                          const month = postDate ? postDate.getMonth() + 1 : 1
                          const time = postDate ? formatTime(postDate.toISOString()) : ''

                          return (
                            <div key={post.id}>
                              {idx > 0 && <Separator className="my-2" />}
                              <div className="flex items-start gap-3 py-2">
                                <div className="flex flex-col items-center justify-center min-w-[40px]">
                                  <span className="text-lg font-bold leading-none text-foreground">
                                    {day}
                                  </span>
                                  <span className="text-[10px] uppercase text-muted-foreground mt-0.5">
                                    {MONTH_NAMES[month - 1].slice(0, 3)}
                                  </span>
                                </div>

                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {firstPlatform && <PlatformBadge platform={firstPlatform} />}
                                    <StatusBadge status={post.status as PostStatus} />
                                  </div>
                                  <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                                    {post.content}
                                  </p>
                                  {time && (
                                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      {time}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Status Legend */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Status Legend</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-2">
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <div
                        key={key}
                        className="flex items-center gap-2.5 rounded-lg border p-2.5"
                      >
                        <span className={`h-3 w-3 rounded-full ${config.dotColor} shrink-0`} />
                        <div className="flex-1">
                          <span className="text-xs font-medium">{config.label}</span>
                        </div>
                        <Badge variant={config.variant} className="text-[10px] h-5">
                          {config.icon}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">This Month</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        label: 'Total Posts',
                        value: monthPosts.length,
                        color: 'text-foreground',
                      },
                      {
                        label: 'Scheduled',
                        value: monthPosts.filter((p) => p.status === 'scheduled').length,
                        color: 'text-sky-600',
                      },
                      {
                        label: 'Published',
                        value: monthPosts.filter((p) => p.status === 'published').length,
                        color: 'text-emerald-600',
                      },
                      {
                        label: 'Failed',
                        value: monthPosts.filter((p) => p.status === 'failed').length,
                        color: 'text-red-600',
                      },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center p-2 rounded-lg bg-muted/40">
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        {/* Day Detail Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                {selectedDay !== null && (
                  <>
                    {MONTH_NAMES[dialogDate.getMonth()]} {dialogDate.getDate()},{` `}
                    {dialogDate.getFullYear()}
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {dialogPosts.length > 0
                  ? `${dialogPosts.length} post${dialogPosts.length > 1 ? 's' : ''} for this day`
                  : 'No posts for this day'}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[55vh] pr-2">
              <DayDetailContent
                day={dialogDate.getDate()}
                month={dialogDate.getMonth() + 1}
                year={dialogDate.getFullYear()}
                posts={dialogPosts}
                onDelete={handleDeletePost}
                onEdit={handleEditPost}
              />
            </ScrollArea>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => handleSchedulePostForDate(dialogDate)}
              >
                <Clock className="h-3.5 w-3.5" />
                Schedule Post
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setDialogOpen(false)
                  setCurrentPage('poster')
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                New Post
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}


