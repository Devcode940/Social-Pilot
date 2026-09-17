'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Send, Clock, FileText, Sparkles, Trash2, Edit3, Copy, Plus, CalendarDays, Zap, AlertCircle, Loader2, Upload, X, BarChart3, Eye, Heart, MessageCircle, Share2, Video } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// --- Types ---

interface Platform {
  id: string
  name: string
  icon: string
  color: string
  charLimit: number
}

interface PostFromAPI {
  id: string
  userId: string
  accountId: string | null
  platforms: string
  content: string
  mediaUrl: string | null
  mediaType: string | null
  status: string
  scheduledAt: string | null
  publishedAt: string | null
  likes: number
  comments: number
  shares: number
  views: number
  createdAt: string
  updatedAt: string
  account: {
    id: string
    platform: string
    username: string
    displayName: string | null
  } | null
  tags: { id: string; postId: string; tag: string }[]
}

interface PostTemplate {
  id: string
  title: string
  icon: React.ReactNode
  description: string
  content: string
}

interface UploadedMedia {
  url: string
  thumbnail: string
  type: 'image' | 'video'
  size: number
  name: string
}

// --- Constants ---

const PLATFORMS: Platform[] = [
  { id: 'instagram', name: 'Instagram', icon: '📷', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400', charLimit: 2200 },
  { id: 'twitter', name: 'Twitter/X', icon: '✦', color: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300', charLimit: 280 },
  { id: 'facebook', name: 'Facebook', icon: '👤', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', charLimit: 63206 },
  { id: 'tiktok', name: 'TikTok', icon: '♪', color: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300', charLimit: 2200 },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400', charLimit: 3000 },
  { id: 'youtube', name: 'YouTube', icon: '▶', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', charLimit: 5000 },
]

const HASHTAG_SUGGESTIONS = [
  '#SocialMedia',
  '#Marketing',
  '#Growth',
  '#ContentCreator',
  '#DigitalMarketing',
  '#Viral',
  '#Trending',
  '#BrandBuilding',
]

const POST_TEMPLATES: PostTemplate[] = [
  {
    id: 'product-launch',
    title: 'Product Launch',
    icon: <Zap className="h-5 w-5" />,
    description: 'Announce a new product or feature',
    content: '🚀 Introducing our newest release! After months of hard work, we\'re thrilled to share [Product Name] with the world.\n\n✨ Key features:\n• [Feature 1]\n• [Feature 2]\n• [Feature 3]\n\nAvailable now — link in bio!\n\n#ProductLaunch #Innovation #NewRelease',
  },
  {
    id: 'behind-the-scenes',
    title: 'Behind the Scenes',
    icon: <Sparkles className="h-5 w-5" />,
    description: 'Share an inside look at your process',
    content: 'A peek behind the curtain! 🎬 Ever wonder what goes into [your process]? Here\'s a look at our creative journey from concept to completion.\n\nSwipe to see the process →\n\n#BehindTheScenes #CreativeProcess #MakingOf',
  },
  {
    id: 'testimonial',
    title: 'Customer Testimonial',
    icon: <FileText className="h-5 w-5" />,
    description: 'Highlight a customer review',
    content: '⭐⭐⭐⭐⭐\n\n"[Customer quote about their experience with your product/service. Keep it authentic and specific.]"\n\n— [Customer Name], [Title/Role]\n\nWe love hearing from our amazing customers! Share your story with us. 💬\n\n#CustomerLove #Testimonial #RealReviews',
  },
  {
    id: 'tips-tricks',
    title: 'Tips & Tricks',
    icon: <CalendarDays className="h-5 w-5" />,
    description: 'Share actionable advice',
    content: '💡 [Number] tips for [topic]:\n\n1️⃣ [Tip 1 — clear and actionable]\n2️⃣ [Tip 2 — practical advice]\n3️⃣ [Tip 3 — expert insight]\n\n[Closing thought or question to drive engagement]\n\nSave this for later! 🔖 Which tip will you try first?\n\n#TipsAndTricks #[Industry] #HowTo',
  },
]

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  scheduled: 'default',
  published: 'secondary',
  draft: 'outline',
}

const MAX_IMAGES = 4

// --- Helpers ---

function formatScheduleTime(isoString: string | null): string {
  if (!isoString) return 'No date set'
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  if (diffDays < 0) return `${formatted} (past)`
  if (diffDays === 0) return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
  if (diffDays === 1) return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
  return formatted
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

// --- Analytics Dialog ---

function AnalyticsDialog({ post, open, onOpenChange }: {
  post: PostFromAPI | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!post) return null

  const totalEngagements = post.likes + post.comments + post.shares
  const engagementRate = post.views > 0 ? ((totalEngagements / post.views) * 100).toFixed(2) : '0'

  const chartData = [
    { name: 'Likes', value: post.likes, color: 'var(--chart-1)' },
    { name: 'Comments', value: post.comments, color: 'var(--chart-2)' },
    { name: 'Shares', value: post.shares, color: 'var(--chart-3)' },
    { name: 'Views', value: post.views, color: 'var(--chart-4)' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Post Analytics
          </DialogTitle>
          <DialogDescription>
            Detailed performance metrics for this post
          </DialogDescription>
        </DialogHeader>

        {/* Post content preview */}
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-sm line-clamp-3 leading-relaxed">{post.content}</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-500/10">
              <Heart className="h-4 w-4 text-pink-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{post.likes.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Likes</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/10">
              <MessageCircle className="h-4 w-4 text-sky-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{post.comments.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Comments</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
              <Share2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{post.shares.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Shares</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
              <Eye className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{post.views.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Views</p>
            </div>
          </div>
        </div>

        {/* Engagement Rate */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Engagement Rate</span>
            <span className="text-sm font-bold text-emerald-600">{engagementRate}%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {totalEngagements.toLocaleString()} total engagements across {post.views.toLocaleString()} views
          </p>
        </div>

        {/* Mini Bar Chart */}
        <div>
          <p className="text-sm font-medium mb-3">Engagement Breakdown</p>
          <div className="h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
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
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dates */}
        <Separator />
        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Created:</span>{' '}
            {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </div>
          {post.publishedAt && (
            <div>
              <span className="font-medium text-foreground">Published:</span>{' '}
              {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </div>
          )}
          {post.scheduledAt && (
            <div>
              <span className="font-medium text-foreground">Scheduled:</span>{' '}
              {new Date(post.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- Main Component ---

export default function PosterPage() {
  // Post composer state
  const [content, setContent] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram'])
  const [scheduleLater, setScheduleLater] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)

  // AI generate state
  const [generating, setGenerating] = useState(false)

  // Smart schedule state
  const [smartScheduling, setSmartScheduling] = useState(false)
  const [scheduleSuggestions, setScheduleSuggestions] = useState<{
    suggestedTimes: { day: string; time: string; reason: string; score: number }[]
    bestDay: string
    bestTime: string
  } | null>(null)

  // Analytics dialog state
  const [analyticsPost, setAnalyticsPost] = useState<PostFromAPI | null>(null)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)

  // Posts list state
  const [posts, setPosts] = useState<PostFromAPI[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load posts from API
  const loadPosts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/posts${filter !== 'all' ? '?status=' + filter : ''}`)
      if (!res.ok) throw new Error('Failed to fetch posts')
      const data = await res.json()
      setPosts(data)
    } catch {
      setError('Failed to load posts')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  // Character limit logic
  const activeCharLimit = selectedPlatforms.length > 0
    ? Math.min(...selectedPlatforms.map(id => PLATFORMS.find(p => p.id === id)?.charLimit ?? 280))
    : 280

  const charCount = content.length
  const isOverLimit = charCount > activeCharLimit
  const charPercent = Math.min((charCount / activeCharLimit) * 100, 100)

  // Toggle platform
  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    )
  }

  // Add hashtag to content
  const addHashtag = (tag: string) => {
    const separator = content && !content.endsWith(' ') ? ' ' : ''
    const newContent = content + separator + tag
    if (newContent.length <= activeCharLimit) {
      setContent(newContent)
    }
  }

  // Apply template
  const applyTemplate = (template: PostTemplate) => {
    setContent(template.content)
  }

  // Check if we can upload more files
  const canUploadMore = () => {
    const hasVideo = uploadedMedia.some(m => m.type === 'video')
    if (hasVideo) return false
    if (uploadedMedia.length >= MAX_IMAGES) return false
    return true
  }

  // Upload files
  const uploadFiles = async (files: FileList | File[]) => {
    if (!canUploadMore()) {
      toast.error('Maximum media limit reached (4 images or 1 video)')
      return
    }

    const fileArray = Array.from(files)

    for (const file of fileArray) {
      if (!canUploadMore()) break

      // Validate type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
      if (!allowedTypes.includes(file.type)) {
        toast.error(`Unsupported file type: ${file.name}`)
        continue
      }

      // Validate size
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`File too large: ${file.name} (max 50MB)`)
        continue
      }

      // Check video limit
      const isVideo = file.type.startsWith('video/')
      if (isVideo && uploadedMedia.length > 0) {
        toast.error('Only one video allowed per post. Remove existing media first.')
        break
      }
      if (!isVideo && uploadedMedia.length >= MAX_IMAGES) {
        toast.error('Maximum 4 images allowed per post')
        break
      }

      setUploading(true)
      setUploadProgress(0)

      try {
        const formData = new FormData()
        formData.append('file', file)

        // Simulate progress
        let progress = 0
        const progressInterval = setInterval(() => {
          progress = Math.min(progress + Math.random() * 20, 90)
          setUploadProgress(progress)
        }, 200)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        clearInterval(progressInterval)
        setUploadProgress(100)

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.message || 'Upload failed')
        }

        const data = await res.json()
        setUploadedMedia(prev => [...prev, data])
        toast.success(`Uploaded: ${file.name}`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Upload failed')
      } finally {
        setUploading(false)
        setUploadProgress(0)
      }
    }
  }

  // Remove uploaded media
  const removeMedia = (index: number) => {
    setUploadedMedia(prev => prev.filter((_, i) => i !== index))
  }

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      uploadFiles(files)
    }
  }

  // AI generate image
  const handleGenerateImage = async () => {
    if (!content.trim()) {
      toast.error('Enter some post content first to use as a prompt')
      return
    }
    if (uploadedMedia.length >= MAX_IMAGES) {
      toast.error('Maximum media limit reached')
      return
    }

    setGenerating(true)
    try {
      const prompt = `${content.slice(0, 500)} - social media post illustration, professional, high quality`
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Generation failed')
      }

      const data = await res.json()
      setUploadedMedia(prev => [...prev, data])
      toast.success('AI image generated!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate image')
    } finally {
      setGenerating(false)
    }
  }

  // Filter posts by status
  const filteredPosts = filter === 'all'
    ? posts
    : posts.filter(p => p.status === filter)

  // Post status counts from real data
  const statusCounts = {
    all: posts.length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    published: posts.filter(p => p.status === 'published').length,
    draft: posts.filter(p => p.status === 'draft').length,
  }

  // Create post (Save Draft / Publish / Schedule)
  const handleCreatePost = async (postStatus: 'draft' | 'published' | 'scheduled') => {
    if (!content.trim()) return
    setSubmitting(true)
    try {
      const scheduledValue = postStatus === 'scheduled' ? scheduledAt : undefined
      const mediaUrl = uploadedMedia.length > 0 ? uploadedMedia[0].url : undefined
      const mediaType = uploadedMedia.length > 0 ? uploadedMedia[0].type : undefined
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platforms: selectedPlatforms.join(','),
          content,
          status: postStatus,
          scheduledAt: scheduledValue || null,
          mediaUrl,
          mediaType,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to create post')
      }
      setContent('')
      setScheduledAt('')
      setScheduleLater(false)
      setUploadedMedia([])
      toast.success(postStatus === 'published' ? 'Post published!' : postStatus === 'scheduled' ? 'Post scheduled!' : 'Draft saved!')
      await loadPosts()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create post')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete post
  const deletePost = async (id: string) => {
    try {
      const res = await fetch('/api/posts?id=' + id, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete post')
      toast.success('Post deleted')
      await loadPosts()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete post')
    }
  }

  // Open analytics
  const openAnalytics = (post: PostFromAPI) => {
    setAnalyticsPost(post)
    setAnalyticsOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-primary-foreground">
                <Send className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Social Poster</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Compose, schedule & manage your posts</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-normal">
                <Clock className="h-3 w-3 mr-1" />
                {statusCounts.scheduled} scheduled
              </Badge>
              <Badge variant="secondary" className="text-xs font-normal">
                <FileText className="h-3 w-3 mr-1" />
                {statusCounts.draft} drafts
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 mb-6">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={loadPosts}
            >
              Retry
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Composer + Queue */}
          <div className="lg:col-span-2 space-y-6">
            {/* Post Composer */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Compose Post</CardTitle>
                    <CardDescription>Create and publish to multiple platforms at once</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isOverLimit ? 'destructive' : 'outline'} className="text-xs font-mono">
                      {charCount} / {activeCharLimit}
                    </Badge>
                  </div>
                </div>

                {/* Character limit progress bar */}
                {selectedPlatforms.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>
                        Limit: {selectedPlatforms.length === 1
                          ? PLATFORMS.find(p => p.id === selectedPlatforms[0])?.name
                          : `Min of ${selectedPlatforms.length} platforms`}
                      </span>
                      <span>{Math.round(charPercent)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOverLimit
                            ? 'bg-destructive'
                            : charPercent > 90
                            ? 'bg-amber-500'
                            : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(charPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Textarea */}
                <Textarea
                  placeholder="What's on your mind? Write your post content here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[140px] resize-y text-base leading-relaxed"
                />

                {/* Platform Selector */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Select Platforms</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PLATFORMS.map(platform => (
                      <label
                        key={platform.id}
                        className={`
                          flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200
                          ${selectedPlatforms.includes(platform.id)
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border hover:border-primary/40 hover:bg-muted/50'
                          }
                        `}
                      >
                        <Checkbox
                          checked={selectedPlatforms.includes(platform.id)}
                          onCheckedChange={() => togglePlatform(platform.id)}
                          className="pointer-events-none"
                        />
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base flex-shrink-0">{platform.icon}</span>
                          <span className="text-sm font-medium truncate">{platform.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Media Upload */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Media</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) uploadFiles(e.target.files)
                      e.target.value = ''
                    }}
                  />
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                      isDragOver
                        ? 'border-primary bg-primary/5'
                        : uploading
                        ? 'border-muted bg-muted/30 cursor-wait'
                        : canUploadMore()
                        ? 'hover:border-primary/50 hover:bg-muted/30'
                        : 'border-muted bg-muted/20 cursor-not-allowed opacity-60'
                    }`}
                    onClick={() => canUploadMore() && !uploading && fileInputRef.current?.click()}
                    onDragOver={canUploadMore() ? handleDragOver : undefined}
                    onDragLeave={canUploadMore() ? handleDragLeave : undefined}
                    onDrop={canUploadMore() ? handleDrop : undefined}
                  >
                    {uploading ? (
                      <div className="space-y-3">
                        <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
                        <p className="text-sm font-medium text-primary">Uploading...</p>
                        <Progress value={uploadProgress} className="h-1.5 max-w-[200px] mx-auto" />
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground font-medium">Click or drag to upload</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">PNG, JPG, GIF, WebP, MP4 up to 50MB</p>
                        <p className="text-xs text-muted-foreground/50 mt-0.5">Up to {MAX_IMAGES} images or 1 video</p>
                      </>
                    )}
                  </div>

                  {/* Uploaded media previews */}
                  {uploadedMedia.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {uploadedMedia.map((media, index) => (
                        <div
                          key={index}
                          className="group relative rounded-lg border overflow-hidden bg-muted/30"
                        >
                          {media.type === 'video' ? (
                            <div className="aspect-square flex items-center justify-center bg-muted">
                              <Video className="h-8 w-8 text-muted-foreground" />
                            </div>
                          ) : (
                            <img
                              src={media.thumbnail}
                              alt={media.name}
                              className="aspect-square w-full object-cover"
                            />
                          )}
                          {/* Overlay info */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                            <p className="text-[10px] text-white truncate">{media.name}</p>
                            <p className="text-[10px] text-white/70">{formatFileSize(media.size)}</p>
                          </div>
                          {/* Remove button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeMedia(index)
                            }}
                            className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI Generate Image Button */}
                  {uploadedMedia.length < MAX_IMAGES && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-2"
                      onClick={handleGenerateImage}
                      disabled={generating || !content.trim()}
                    >
                      {generating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {generating ? 'Generating...' : 'AI Generate Image'}
                    </Button>
                  )}
                </div>

                {/* Schedule Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label htmlFor="schedule-toggle" className="font-medium text-sm cursor-pointer">
                        Schedule for later
                      </Label>
                      <p className="text-xs text-muted-foreground">Set a specific date and time to publish</p>
                    </div>
                  </div>
                  <Switch
                    id="schedule-toggle"
                    checked={scheduleLater}
                    onCheckedChange={setScheduleLater}
                  />
                </div>

                {scheduleLater && (
                  <>
                    <div className="flex flex-col gap-3 pl-2">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Input
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          className="max-w-xs"
                        />
                      </div>

                      {/* Smart Schedule Button */}
                      <div className="ml-7">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={async () => {
                            if (!content.trim() || selectedPlatforms.length === 0) {
                              toast.error('Add content and select platforms first')
                              return
                            }
                            setSmartScheduling(true)
                            setScheduleSuggestions(null)
                            try {
                              const res = await fetch('/api/ai-schedule', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  platforms: selectedPlatforms,
                                  content: content.trim(),
                                }),
                              })
                              if (!res.ok) throw new Error('Failed to get schedule suggestions')
                              const data = await res.json()
                              setScheduleSuggestions(data)
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : 'Failed to get smart schedule suggestions')
                            } finally {
                              setSmartScheduling(false)
                            }
                          }}
                          disabled={smartScheduling || !content.trim() || selectedPlatforms.length === 0}
                        >
                          {smartScheduling ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          {smartScheduling ? 'Analyzing...' : 'Smart Schedule'}
                        </Button>
                      </div>

                      {/* Schedule Suggestions */}
                      {scheduleSuggestions && scheduleSuggestions.suggestedTimes.length > 0 && (
                        <div className="ml-7 mt-1 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            AI-recommended posting times:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {scheduleSuggestions.suggestedTimes.map((suggestion, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  // Find the next occurrence of the suggested day
                                  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                                  const targetDay = days.indexOf(suggestion.day)
                                  const now = new Date()
                                  const nextDay = new Date(now)
                                  const currentDay = now.getDay()
                                  let daysAhead = targetDay - currentDay
                                  if (daysAhead < 0) daysAhead += 7
                                  if (daysAhead === 0) daysAhead = 7
                                  nextDay.setDate(now.getDate() + daysAhead)

                                  // Parse the time (e.g. "9:00 AM")
                                  const [timeStr, ampm] = suggestion.time.split(' ')
                                  const [hours, minutes] = timeStr.split(':').map(Number)
                                  let hour24 = hours
                                  if (ampm === 'PM' && hours !== 12) hour24 += 12
                                  if (ampm === 'AM' && hours === 12) hour24 = 0
                                  nextDay.setHours(hour24, minutes, 0, 0)

                                  const isoString = nextDay.toISOString().slice(0, 16)
                                  setScheduledAt(isoString)
                                  toast.success(`Scheduled for ${suggestion.day} ${suggestion.time}`)
                                }}
                                className={
                                  `text-left rounded-lg border p-3 transition-all hover:border-primary hover:bg-primary/5 cursor-pointer w-full ${i === 0 ? 'ring-1 ring-primary/30 border-primary/30 bg-primary/5' : ''}`
                                }
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-semibold text-foreground">
                                    {suggestion.day} {suggestion.time}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className={`text-[10px] px-1.5 ${suggestion.score >= 90 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : suggestion.score >= 80 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400'}`}
                                  >
                                    {suggestion.score}%
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {suggestion.reason}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                {/* Hashtag Suggestions */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Suggested Hashtags</Label>
                    <span className="text-xs text-muted-foreground">Click to add</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {HASHTAG_SUGGESTIONS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => addHashtag(tag)}
                        className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors hover:bg-primary/10 hover:border-primary/40 hover:text-primary cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    disabled={submitting || !content.trim()}
                    onClick={() => handleCreatePost('draft')}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                    Save Draft
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    disabled={submitting || !scheduleLater || !scheduledAt || !content.trim()}
                    onClick={() => handleCreatePost('scheduled')}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                    Schedule
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    disabled={submitting || isOverLimit || selectedPlatforms.length === 0 || !content.trim()}
                    onClick={() => handleCreatePost('published')}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Publish Now
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Scheduled Posts Queue */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Post Queue</CardTitle>
                    <CardDescription>Manage your upcoming and past posts</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    New Post
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={filter} onValueChange={setFilter} className="w-full">
                  <TabsList className="w-full grid grid-cols-4 mb-4">
                    <TabsTrigger value="all" className="text-xs sm:text-sm">
                      All
                      <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{statusCounts.all}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="scheduled" className="text-xs sm:text-sm">
                      Scheduled
                      <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{statusCounts.scheduled}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="published" className="text-xs sm:text-sm">
                      Published
                      <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{statusCounts.published}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="draft" className="text-xs sm:text-sm">
                      Draft
                      <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{statusCounts.draft}</Badge>
                    </TabsTrigger>
                  </TabsList>

                  {['all', 'scheduled', 'published', 'draft'].map(tab => (
                    <TabsContent key={tab} value={tab} className="mt-0">
                      {loading ? (
                        <div className="space-y-3 py-2">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="rounded-lg border p-4">
                              <Skeleton className="h-4 w-full mb-3" />
                              <div className="flex gap-2 mb-3">
                                <Skeleton className="h-5 w-20 rounded-full" />
                                <Skeleton className="h-5 w-20 rounded-full" />
                              </div>
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-3 w-28" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : filteredPosts.length === 0 ? (
                        <div className="text-center py-12">
                          <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                          <p className="text-sm text-muted-foreground">No {tab === 'all' ? '' : tab + ' '}posts found</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">Create a new post to get started</p>
                        </div>
                      ) : (
                        <ScrollArea className="max-h-[520px] pr-1">
                          <div className="space-y-3">
                            {filteredPosts.map(post => {
                              const platformIds = post.platforms.split(',')
                              const showAnalytics = post.status === 'published' && (post.likes > 0 || post.comments > 0 || post.shares > 0 || post.views > 0)
                              return (
                                <div
                                  key={post.id}
                                  className="group rounded-lg border p-4 hover:shadow-sm transition-all duration-200"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      {/* Content preview */}
                                      <p className="text-sm leading-relaxed line-clamp-2 mb-3">
                                        {post.content.length > 120
                                          ? post.content.slice(0, 120) + '...'
                                          : post.content
                                        }
                                      </p>

                                      {/* Platform badges */}
                                      <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                        {platformIds.map(pId => {
                                          const platform = PLATFORMS.find(p => p.id === pId)
                                          return platform ? (
                                            <Badge
                                              key={pId}
                                              variant="secondary"
                                              className={`text-[11px] px-2 py-0 ${platform.color}`}
                                            >
                                              {platform.icon} {platform.name}
                                            </Badge>
                                          ) : null
                                        })}
                                      </div>

                                      {/* Engagement metrics for published posts */}
                                      {post.status === 'published' && (
                                        <div className="flex items-center gap-3 mb-3">
                                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Heart className="h-3 w-3" /> {post.likes}
                                          </span>
                                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <MessageCircle className="h-3 w-3" /> {post.comments}
                                          </span>
                                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Share2 className="h-3 w-3" /> {post.shares}
                                          </span>
                                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Eye className="h-3 w-3" /> {post.views}
                                          </span>
                                        </div>
                                      )}

                                      {/* Time & Status */}
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                          <Clock className="h-3 w-3" />
                                          {formatScheduleTime(post.scheduledAt || post.publishedAt)}
                                        </div>
                                        <Badge
                                          variant={STATUS_VARIANTS[post.status] || 'outline'}
                                          className="text-[11px] capitalize"
                                        >
                                          {post.status}
                                        </Badge>
                                      </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                      {showAnalytics && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          title="View Analytics"
                                          onClick={() => openAnalytics(post)}
                                        >
                                          <BarChart3 className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        title="Edit"
                                      >
                                        <Edit3 className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        title="Reschedule"
                                      >
                                        <CalendarDays className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => deletePost(post.id)}
                                        title="Delete"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </ScrollArea>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Templates */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Templates</CardTitle>
                  <CardDescription>Start with a pre-built post format</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {POST_TEMPLATES.map(template => (
                      <div
                        key={template.id}
                        className="group rounded-lg border p-4 hover:shadow-sm transition-all duration-200"
                      >
                        <div className="flex items-start gap-3 mb-2">
                          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-muted flex-shrink-0 text-muted-foreground">
                            {template.icon}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold">{template.title}</h4>
                            <p className="text-xs text-muted-foreground">{template.description}</p>
                          </div>
                        </div>

                        {/* Template preview */}
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 bg-muted/50 rounded-md p-2.5 leading-relaxed">
                          {template.content.slice(0, 100)}...
                        </p>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-1.5 text-xs"
                          onClick={() => applyTemplate(template)}
                        >
                          <Copy className="h-3 w-3" />
                          Use Template
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">This Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Posts Published</span>
                      <span className="text-sm font-semibold">{statusCounts.published}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Engagement Rate</span>
                      <span className="text-sm font-semibold text-emerald-600">+4.2%</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Reach</span>
                      <span className="text-sm font-semibold">24.8K</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Upcoming</span>
                      <span className="text-sm font-semibold">{statusCounts.scheduled}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Analytics Dialog */}
      <AnalyticsDialog
        post={analyticsPost}
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
      />
    </div>
  )
}
