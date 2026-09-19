'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sparkles,
  Download,
  Play,
  Clock,
  Wand2,
  Video,
  Music,
  Mic,
  Palette,
  Film,
  Zap,
  Layers,
  Package,
  MessageCircleQuestion,
  Camera,
  GraduationCap,
  ArrowLeftRight,
  LayoutGrid,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────────────────

interface GeneratedVideo {
  id: string
  name: string
  thumbnail?: string
  status: string
  format?: string
  duration?: number
  prompt?: string
}

interface HistoryItem {
  id: string
  name: string
  type: string
  status: string
  thumbnail?: string
  createdAt: string
}

interface Template {
  id: string
  label: string
  description: string
  icon: React.ElementType
  prompt: string
}

// ── Constants ───────────────────────────────────────────────────────────────

const FORMATS = [
  { id: 'tiktok', label: 'TikTok', ratio: '9:16' },
  { id: 'reels', label: 'Instagram Reels', ratio: '9:16' },
  { id: 'shorts', label: 'YouTube Shorts', ratio: '9:16' },
  { id: 'square', label: 'Square', ratio: '1:1' },
  { id: 'landscape', label: 'Landscape', ratio: '16:9' },
]

const DURATIONS = ['15s', '30s', '60s', '90s']

const STYLES = [
  { id: 'cinematic', label: 'Cinematic', gradient: 'from-amber-600 via-orange-700 to-red-800' },
  { id: 'animated', label: 'Animated', gradient: 'from-emerald-500 via-teal-500 to-cyan-500' },
  { id: 'realistic', label: 'Realistic', gradient: 'from-stone-500 via-stone-600 to-stone-800' },
  { id: 'cartoon', label: 'Cartoon', gradient: 'from-pink-500 via-rose-400 to-fuchsia-500' },
  { id: 'minimal', label: 'Minimal', gradient: 'from-gray-300 via-gray-100 to-gray-300' },
  { id: 'retro', label: 'Retro', gradient: 'from-yellow-500 via-amber-400 to-orange-500' },
]

const MUSIC_OPTIONS = [
  { id: 'upbeat-pop', label: 'Upbeat Pop' },
  { id: 'chill-lofi', label: 'Chill Lo-Fi' },
  { id: 'epic-cinematic', label: 'Epic Cinematic' },
  { id: 'acoustic', label: 'Acoustic' },
  { id: 'electronic', label: 'Electronic' },
  { id: 'none', label: 'None' },
]

const VOICE_TYPES = ['Male - Deep', 'Male - Bright', 'Female - Warm', 'Female - Energetic', 'Neutral - AI']
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese', 'Portuguese', 'Korean']

const PROMPT_SUGGESTIONS = ['Add motion', 'Cinematic style', 'Product showcase', 'Storytelling']

const TEMPLATES: Template[] = [
  {
    id: 'product-launch',
    label: 'Product Launch',
    description: 'Dynamic reveal with zoom and glow effects',
    icon: Package,
    prompt: 'A sleek product reveal video with dramatic lighting, smooth camera zoom into the product, glowing highlights on key features, particle effects, and a modern minimalist background with subtle gradient shifts.',
  },
  {
    id: 'testimonial-reel',
    label: 'Testimonial Reel',
    description: 'Customer quotes with animated text overlays',
    icon: MessageCircleQuestion,
    prompt: 'A compilation of customer testimonial cards with smooth transitions, animated quote marks, elegant typography overlays on a soft bokeh background, with warm color tones and professional text animations.',
  },
  {
    id: 'behind-scenes',
    label: 'Behind the Scenes',
    description: 'Authentic workspace footage with film grain',
    icon: Camera,
    prompt: 'Behind the scenes footage with authentic workspace shots, subtle film grain overlay, warm natural lighting, time-lapse transitions between workstations, and a gentle ambient color grade.',
  },
  {
    id: 'tutorial',
    label: 'Tutorial',
    description: 'Step-by-step with numbered overlays',
    icon: GraduationCap,
    prompt: 'Step-by-step tutorial video with numbered animated overlays, clean pointer animations, split-screen demonstrations, progress indicator, and clear step transitions with minimal clean background.',
  },
  {
    id: 'before-after',
    label: 'Before / After',
    description: 'Split screen transformation reveal',
    icon: ArrowLeftRight,
    prompt: 'A dramatic before/after transformation video with a smooth sliding split screen reveal, dramatic lighting change, before state shown in muted tones transitioning to vibrant after state with satisfying visual impact.',
  },
  {
    id: 'mood-board',
    label: 'Mood Board',
    description: 'Aesthetic collage with ambient motion',
    icon: LayoutGrid,
    prompt: 'An aesthetic mood board video with floating image cards, gentle parallax movement, soft ambient lighting, smooth zoom transitions, curated color palette showcase, and dreamy bokeh effects.',
  },
]

// ── Component ───────────────────────────────────────────────────────────────

export default function AIVideoPage() {
  // Prompt state
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')

  // Settings state
  const [settings, setSettings] = useState({
    format: 'tiktok',
    duration: '30s',
    style: 'cinematic',
    resolution: '1080p',
    model: 'v2-Creative',
    music: 'none',
    voiceover: false,
    voiceType: 'Female - Warm',
    voiceLanguage: 'English',
    watermark: true,
  })

  // Gallery & UI state
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([])
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('create')

  // Pure data loader: no state writes, safe to drive from the effect below.
  const loadHistoryItems = useCallback(async (): Promise<HistoryItem[]> => {
    const res = await fetch('/api/media')
    const data = (await res.json()) as HistoryItem[]
    return data.filter((item) => item.status === 'exported')
  }, [])

  // Fetch history when tab changes to 'history': every setState below runs in
  // a promise continuation (post-await), never synchronously in the effect.
  useEffect(() => {
    if (activeTab !== 'history') return
    let cancelled = false
    loadHistoryItems()
      .then((exported) => {
        if (cancelled) return
        setHistoryItems(exported)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError('Failed to load history')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeTab, loadHistoryItems])

  const handleEnhancePrompt = useCallback(() => {
    if (!prompt.trim()) return
    setPrompt((prev) => `cinematic, high quality, professional, ${prev}`)
  }, [prompt])

  const handleAddSuggestion = useCallback((suggestion: string) => {
    setPrompt((prev) => {
      if (!prev.trim()) return suggestion
      return `${prev}, ${suggestion.toLowerCase()}`
    })
  }, [])

  const handleUseTemplate = useCallback((template: Template) => {
    setPrompt(template.prompt)
    setActiveTab('create')
  }, [])

  const handleGenerateVideo = useCallback(async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/ai-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style: settings.style,
          format: settings.format,
          duration: parseInt(settings.duration),
          settings: {
            resolution: settings.resolution,
            model: settings.model,
            music: settings.music,
            voiceover: settings.voiceover,
            watermark: settings.watermark,
          },
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to generate video')
      }
      const data = await res.json()
      setGeneratedVideos((prev) => [{ ...data, prompt }, ...prev])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate video')
    } finally {
      setGenerating(false)
    }
  }, [prompt, settings])

  const handleDownload = useCallback((video: GeneratedVideo) => {
    if (!video.thumbnail) return
    const link = document.createElement('a')
    link.href = video.thumbnail
    link.download = `${video.name || 'ai-video'}.png`
    link.click()
  }, [])

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'exported':
        return <CheckCircle2 className="size-4 text-emerald-500" />
      case 'failed':
        return <XCircle className="size-4 text-red-500" />
      case 'processing':
      case 'editing':
        return <Loader2 className="size-4 text-amber-500 animate-spin" />
      default:
        return <AlertCircle className="size-4 text-muted-foreground" />
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'exported':
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 gap-1"><CheckCircle2 className="size-3" />{status}</Badge>
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-0 gap-1"><XCircle className="size-3" />{status}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const renderVideoCard = (video: GeneratedVideo) => (
    <Card key={video.id} className="overflow-hidden group">
      {video.thumbnail ? (
        <div className="relative h-48 flex items-center justify-center bg-muted">
          <img src={video.thumbnail} alt={video.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
          <div className="relative flex size-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform group-hover:scale-110">
            <Play className="size-6 text-white ml-0.5" />
          </div>
          <div className="absolute top-3 right-3 flex gap-1.5">
            {video.duration && (
              <Badge variant="secondary" className="bg-black/40 text-white border-none text-[10px] backdrop-blur-sm">
                {video.duration}s
              </Badge>
            )}
            {video.format && (
              <Badge variant="secondary" className="bg-black/40 text-white border-none text-[10px] backdrop-blur-sm">
                {FORMATS.find((f) => f.id === video.format)?.label || video.format}
              </Badge>
            )}
          </div>
        </div>
      ) : (
        <div className="relative h-48 bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 flex items-center justify-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Play className="size-6 text-white ml-0.5" />
          </div>
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {statusIcon(video.status)}
            <h4 className="font-semibold text-sm truncate">{video.name || 'Untitled'}</h4>
          </div>
          {video.prompt && (
            <p className="text-xs text-muted-foreground line-clamp-2">{video.prompt}</p>
          )}
        </div>
        <Separator />
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs h-8"
            onClick={() => handleDownload(video)}
            disabled={!video.thumbnail}
          >
            <Download className="size-3" />
            Download
          </Button>
          {statusBadge(video.status)}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Video className="size-6 text-primary" />
            AI Short Video Generator
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create stunning short videos using AI prompts for your social media
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          {generating && (
            <Badge variant="secondary" className="gap-1">
              <Loader2 className="size-3 animate-spin" />
              Generating...
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <Layers className="size-3" />
            {generatedVideos.length} videos
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { if (v === 'history') setLoading(true); setActiveTab(v) }} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="create" className="gap-1.5">
            <Wand2 className="size-3.5" />
            <span className="hidden sm:inline">Create</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <LayoutGrid className="size-3.5" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="gallery" className="gap-1.5">
            <Film className="size-3.5" />
            <span className="hidden sm:inline">Gallery</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Clock className="size-3.5" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── CREATE TAB ──────────────────────────────────────────────────── */}
        <TabsContent value="create" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column: Prompt Studio */}
            <div className="lg:col-span-2 space-y-4">
              {/* AI Prompt Studio */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="size-5 text-amber-500" />
                    AI Prompt Studio
                  </CardTitle>
                  <CardDescription>Describe the video you want to create in detail</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Describe the video you want to create... (e.g., A golden sunset over calm ocean waters with gentle waves, seagulls flying overhead, and warm cinematic lighting)"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[140px] resize-y text-sm leading-relaxed"
                  />

                  {/* Prompt Enhancement Suggestions */}
                  <div className="flex flex-wrap gap-2">
                    {PROMPT_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleAddSuggestion(suggestion)}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <Zap className="size-3" />
                        {suggestion}
                      </button>
                    ))}
                  </div>

                  <Separator />

                  {/* Negative Prompt */}
                  <div className="space-y-2">
                    <Label htmlFor="negative-prompt" className="text-xs text-muted-foreground">
                      Negative Prompt
                    </Label>
                    <Input
                      id="negative-prompt"
                      placeholder="What to exclude... (e.g., blurry, low quality, text, watermarks)"
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  {/* Enhance Button */}
                  <Button
                    variant="outline"
                    onClick={handleEnhancePrompt}
                    disabled={!prompt.trim()}
                    className="w-full sm:w-auto gap-2"
                  >
                    <Sparkles className="size-4" />
                    Enhance Prompt
                  </Button>
                </CardContent>
              </Card>

              {/* Error Display */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20 p-4 flex items-center gap-3">
                  <XCircle className="size-5 text-red-500 shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Generate Button */}
              <Button
                size="lg"
                onClick={handleGenerateVideo}
                disabled={!prompt.trim() || generating}
                className="w-full h-14 text-base font-semibold gap-2 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:from-amber-700 hover:via-orange-700 hover:to-red-700 text-white shadow-lg shadow-orange-500/20"
              >
                {generating ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Generating Video... (AI processing, please wait)
                  </>
                ) : (
                  <>
                    <Zap className="size-5" />
                    Generate Video
                  </>
                )}
              </Button>

              {/* Generating State */}
              {generating && (
                <Card className="border-amber-200/50 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="relative">
                      <div className="size-12 rounded-full border-4 border-amber-200 dark:border-amber-800 border-t-amber-500 animate-spin" />
                      <Wand2 className="size-5 text-amber-500 absolute inset-0 m-auto" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Generating your video...</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        AI is creating a thumbnail concept for &ldquo;{prompt.slice(0, 50)}{prompt.length > 50 ? '...' : ''}&rdquo;
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Generated Videos Gallery (Create Tab) */}
              {generatedVideos.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Film className="size-4" />
                    Generated Videos
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {generatedVideos.map(renderVideoCard)}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {generatedVideos.length === 0 && !generating && (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="rounded-full bg-muted p-4 mb-4">
                      <Video className="size-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">No videos generated yet</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Write a prompt above describing the video you want, adjust the settings on the right, and click Generate to create your first AI-powered short video.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column: Video Settings */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="size-4" />
                    Video Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Format */}
                  <div className="space-y-2.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Format</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {FORMATS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setSettings((s) => ({ ...s, format: f.id }))}
                          className={`flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2.5 text-xs transition-all ${
                            settings.format === f.id
                              ? 'border-primary bg-primary/5 text-primary shadow-sm'
                              : 'border-border hover:border-muted-foreground/30 hover:bg-accent'
                          }`}
                        >
                          <span className="font-medium">{f.label}</span>
                          <span className="text-[10px] text-muted-foreground">{f.ratio}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Duration */}
                  <div className="space-y-2.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Duration</Label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {DURATIONS.map((d) => (
                        <button
                          key={d}
                          onClick={() => setSettings((s) => ({ ...s, duration: d }))}
                          className={`rounded-lg border px-2 py-2 text-xs font-medium transition-all ${
                            settings.duration === d
                              ? 'border-primary bg-primary/5 text-primary shadow-sm'
                              : 'border-border hover:border-muted-foreground/30 hover:bg-accent'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Style */}
                  <div className="space-y-2.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Style</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {STYLES.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSettings((prev) => ({ ...prev, style: s.id }))}
                          className={`group relative overflow-hidden rounded-lg border transition-all ${
                            settings.style === s.id
                              ? 'border-primary ring-1 ring-primary shadow-sm'
                              : 'border-border hover:border-muted-foreground/30'
                          }`}
                        >
                          <div className={`h-12 bg-gradient-to-br ${s.gradient} relative`}>
                            {settings.style === s.id && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <CheckCircle2 className="size-4 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="p-1.5 text-center">
                            <span className="text-[11px] font-medium">{s.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Resolution */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Resolution</Label>
                    <Select value={settings.resolution} onValueChange={(v) => setSettings((s) => ({ ...s, resolution: v }))}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="720p">720p (HD)</SelectItem>
                        <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                        <SelectItem value="4k">4K (Ultra HD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* AI Model */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">AI Model</Label>
                    <Select value={settings.model} onValueChange={(v) => setSettings((s) => ({ ...s, model: v }))}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="v1-Stable">v1-Stable (Fast)</SelectItem>
                        <SelectItem value="v2-Creative">v2-Creative (Balanced)</SelectItem>
                        <SelectItem value="v3-Cinematic">v3-Cinematic (Premium)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Background Music */}
                  <div className="space-y-2.5">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Music className="size-3" />
                      Background Music
                    </Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {MUSIC_OPTIONS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setSettings((s) => ({ ...s, music: m.id }))}
                          className={`flex items-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-medium transition-all ${
                            settings.music === m.id
                              ? 'border-primary bg-primary/5 text-primary shadow-sm'
                              : 'border-border hover:border-muted-foreground/30 hover:bg-accent'
                          }`}
                        >
                          {settings.music === m.id && <CheckCircle2 className="size-3 shrink-0" />}
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Voice Over */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Mic className="size-3" />
                        Voice Over
                      </Label>
                      <Switch checked={settings.voiceover} onCheckedChange={(v) => setSettings((s) => ({ ...s, voiceover: v }))} />
                    </div>
                    {settings.voiceover && (
                      <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Voice Type</Label>
                          <Select value={settings.voiceType} onValueChange={(v) => setSettings((s) => ({ ...s, voiceType: v }))}>
                            <SelectTrigger className="text-xs h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {VOICE_TYPES.map((v) => (
                                <SelectItem key={v} value={v}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Language</Label>
                          <Select value={settings.voiceLanguage} onValueChange={(v) => setSettings((s) => ({ ...s, voiceLanguage: v }))}>
                            <SelectTrigger className="text-xs h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LANGUAGES.map((l) => (
                                <SelectItem key={l} value={l}>{l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Watermark */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Watermark
                    </Label>
                    <Switch checked={settings.watermark} onCheckedChange={(v) => setSettings((s) => ({ ...s, watermark: v }))} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── TEMPLATES TAB ───────────────────────────────────────────────── */}
        <TabsContent value="templates" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Quick Templates</h2>
            <p className="text-sm text-muted-foreground">Choose a template to get started quickly</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.map((template) => {
              const Icon = template.icon
              return (
                <Card key={template.id} className="group transition-all hover:shadow-md hover:border-primary/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">{template.label}</CardTitle>
                        <CardDescription className="text-xs">{template.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                      {template.prompt}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUseTemplate(template)}
                      className="w-full gap-1.5 text-xs h-8"
                    >
                      <Wand2 className="size-3" />
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ─── GALLERY TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="gallery" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-1">Generated Videos Gallery</h2>
              <p className="text-sm text-muted-foreground">
                {generatedVideos.length > 0
                  ? `Showing ${generatedVideos.length} generated video${generatedVideos.length !== 1 ? 's' : ''}`
                  : 'No videos generated yet. Create your first video!'}
              </p>
            </div>
            {generatedVideos.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setActiveTab('create')}>
                <Sparkles className="size-3.5" />
                New Video
              </Button>
            )}
          </div>

          {generatedVideos.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {generatedVideos.map(renderVideoCard)}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Film className="size-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-1">No videos in gallery</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Create your first AI video to see it here.
                </p>
                <Button variant="outline" className="mt-4 gap-2" onClick={() => setActiveTab('create')}>
                  <Wand2 className="size-4" />
                  Create Video
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── HISTORY TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-1">Export History</h2>
              <p className="text-sm text-muted-foreground">
                {loading
                  ? 'Loading history...'
                  : historyItems.length > 0
                    ? `Showing ${historyItems.length} exported item${historyItems.length !== 1 ? 's' : ''}`
                    : 'No exported videos yet.'}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : historyItems.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {historyItems.map((item) => (
                <Card key={item.id} className="overflow-hidden group">
                  {item.thumbnail ? (
                    <div className="relative h-40 flex items-center justify-center bg-muted">
                      <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                      <div className="relative flex size-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                        <Play className="size-5 text-white ml-0.5" />
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-stone-400 via-stone-500 to-stone-700 flex items-center justify-center">
                      <Video className="size-8 text-white/50" />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-2">
                    <h4 className="font-semibold text-sm truncate">{item.name}</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                      <Badge variant="secondary" className="text-[10px]">{item.type}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Clock className="size-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-1">No history yet</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Exported videos will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
