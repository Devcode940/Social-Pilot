'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Sparkles, Copy, Save, History, Star, Target,
  MessageSquare, FileText, BookOpen, Lightbulb, ChevronDown, ChevronUp, Check,
  Clock, BarChart3, PenTool, Wand2, Type, Heart, Zap, Instagram,
  Youtube, Tv, RotateCcw, Trash2,
  Megaphone, Camera, ShoppingBag, PartyPopper, Users, Briefcase, AlertCircle, Loader2
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type ContentType = 'instagram' | 'tweet' | 'linkedin' | 'tiktok' | 'youtube' | 'blog'
type Tone = 'professional' | 'casual' | 'humorous' | 'inspirational' | 'educational' | 'bold' | 'minimal' | 'storytelling'
type Audience = 'gen-z' | 'millennials' | 'professionals' | 'general'

interface GeneratedVariation {
  id: string
  text: string
  charCount: number
  wordCount: number
  platforms: string[]
}

interface HistoryItem {
  id: string
  type: ContentType
  preview: string
  date: string
  platform: string
}

interface ContentMetrics {
  readability: number
  avgSentenceLength: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CONTENT_TYPES: { type: ContentType; label: string; icon: React.ElementType; color: string }[] = [
  { type: 'instagram', label: 'Instagram Caption', icon: Camera, color: 'from-pink-500 to-rose-500' },
  { type: 'tweet', label: 'Tweet / Thread', icon: MessageSquare, color: 'from-sky-400 to-cyan-500' },
  { type: 'linkedin', label: 'LinkedIn Post', icon: Briefcase, color: 'from-slate-500 to-zinc-600' },
  { type: 'tiktok', label: 'TikTok Script', icon: Tv, color: 'from-rose-500 to-pink-600' },
  { type: 'youtube', label: 'YouTube Description', icon: Youtube, color: 'from-red-500 to-rose-600' },
  { type: 'blog', label: 'Blog Intro', icon: BookOpen, color: 'from-emerald-500 to-teal-600' },
]

const TONES: { tone: Tone; label: string; emoji: string }[] = [
  { tone: 'professional', label: 'Professional', emoji: '👔' },
  { tone: 'casual', label: 'Casual', emoji: '😊' },
  { tone: 'humorous', label: 'Humorous', emoji: '😄' },
  { tone: 'inspirational', label: 'Inspirational', emoji: '✨' },
  { tone: 'educational', label: 'Educational', emoji: '📚' },
  { tone: 'bold', label: 'Bold', emoji: '🔥' },
  { tone: 'minimal', label: 'Minimal', emoji: '🎨' },
  { tone: 'storytelling', label: 'Storytelling', emoji: '📖' },
]

const PLATFORMS: { id: string; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  { id: 'twitter', label: 'Twitter / X', icon: MessageSquare, color: 'text-sky-500' },
  { id: 'linkedin', label: 'LinkedIn', icon: Briefcase, color: 'text-slate-600' },
  { id: 'tiktok', label: 'TikTok', icon: Tv, color: 'text-rose-500' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, color: 'text-red-500' },
]

const TEMPLATES: { id: string; label: string; icon: React.ElementType; description: string; topic: string }[] = [
  { id: 'product-launch', label: 'Product Launch', icon: Megaphone, description: 'Announce your new product', topic: 'We just launched our new product! It\'s been months in the making and we can\'t wait to share it with you.' },
  { id: 'behind-scenes', label: 'Behind the Scenes', icon: Camera, description: 'Show your process', topic: 'Ever wondered what happens behind the scenes at our office? Today we\'re taking you behind the curtain.' },
  { id: 'testimonial', label: 'Customer Testimonial', icon: Heart, description: 'Share customer love', topic: 'Our customer Sarah said this about us: "This product completely changed how I work every day."' },
  { id: 'tips', label: 'Tips & How-To', icon: Lightbulb, description: 'Share your expertise', topic: '5 tips that helped us grow 10x this year. Number 3 is the one nobody talks about.' },
  { id: 'event', label: 'Event Promotion', icon: PartyPopper, description: 'Promote an upcoming event', topic: 'Join us for our biggest event of the year! Free tickets for the first 100 registrants.' },
  { id: 'seasonal', label: 'Seasonal Sale', icon: ShoppingBag, description: 'Holiday or seasonal deals', topic: 'Our biggest sale of the season is here! Up to 50% off on everything.' },
  { id: 'ugc', label: 'User Generated Content', icon: Users, description: 'Feature your community', topic: 'We love seeing how our community uses our products. Check out this amazing creation from @user!' },
  { id: 'brand-story', label: 'Brand Story', icon: BookOpen, description: 'Tell your founding story', topic: 'It started with a simple idea in a small garage. 5 years later, we\'re serving customers in 50+ countries.' },
]

const LENGTH_LABELS: Record<number, string> = {
  1: 'Short (1-2 sentences)',
  2: 'Medium (3-5 sentences)',
  3: 'Long (paragraph)',
}

const LENGTH_DESCRIPTIONS: Record<number, string> = {
  1: 'Quick, punchy content perfect for stories and quick scrolls.',
  2: 'Balanced length that works across most platforms.',
  3: 'Detailed content ideal for captions, posts, and descriptions.',
}

const STORAGE_KEY = 'ai-writer-history'

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeReadability(text: string): ContentMetrics {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const words = text.split(/\s+/).filter(Boolean)
  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : words.length
  // Simplified Flesch-like score: penalize very long sentences, reward shorter ones
  const score = Math.max(20, Math.min(100, 100 - (avgSentenceLength - 10) * 5))
  return { readability: Math.round(score), avgSentenceLength: Math.round(avgSentenceLength * 10) / 10 }
}

function loadHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(items: HistoryItem[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)))
  } catch { /* ignore quota errors */ }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AIWriterPage() {
  // Content type
  const [selectedContentType, setSelectedContentType] = useState<ContentType>('instagram')

  // Topic
  const [topic, setTopic] = useState('')
  const MAX_TOPIC_LENGTH = 500

  // Tone
  const [selectedTone, setSelectedTone] = useState<Tone>('casual')

  // Platforms
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram'])

  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [audience, setAudience] = useState<Audience>('general')
  const [includeEmojis, setIncludeEmojis] = useState(true)
  const [includeHashtags, setIncludeHashtags] = useState(true)
  const [includeCta, setIncludeCta] = useState(true)
  const [contentLength, setContentLength] = useState<number>(2) // 1=short, 2=medium, 3=long
  const [language, setLanguage] = useState('en')

  // Generation
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [variations, setVariations] = useState<GeneratedVariation[]>([])
  const [, setHasGenerated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Save state
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())

  // History
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleTopicChange = useCallback((value: string) => {
    if (value.length <= MAX_TOPIC_LENGTH) {
      setTopic(value)
    }
  }, [])

  const togglePlatform = useCallback((platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    )
  }, [])

  const handleTemplateClick = useCallback((templateTopic: string) => {
    setTopic(templateTopic)
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return
    setGenerating(true)
    setLoading(true)
    setError(null)
    setVariations([])

    const lengthMap: Record<number, string> = { 1: 'short', 2: 'medium', 3: 'long' }

    try {
      const res = await fetch('/api/ai-writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          contentType: selectedContentType,
          tone: selectedTone,
          platforms: selectedPlatforms,
          options: {
            audience,
            includeEmojis,
            includeHashtags,
            includeCTA: includeCta,
            length: lengthMap[contentLength],
            language,
          },
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || `Request failed with status ${res.status}`)
      }

      const data = await res.json()
      const newVariations: GeneratedVariation[] = (data.variations || []).map(
        (v: { text: string; wordCount: number; charCount: number }, i: number) => ({
          id: `var-${Date.now()}-${i}`,
          text: v.text,
          charCount: v.charCount,
          wordCount: v.wordCount,
          platforms: selectedPlatforms.length > 0 ? selectedPlatforms : [selectedContentType],
        })
      )

      setVariations(newVariations)
      setHasGenerated(true)

      // Add to history
      const platformLabel = CONTENT_TYPES.find(ct => ct.type === selectedContentType)?.label || selectedContentType
      const historyItem: HistoryItem = {
        id: `h-${Date.now()}`,
        type: selectedContentType,
        preview: newVariations[0]?.text.slice(0, 100) || topic,
        date: new Date().toISOString().split('T')[0],
        platform: platformLabel,
      }
      const newHistory = [historyItem, ...history].slice(0, 50)
      setHistory(newHistory)
      saveHistory(newHistory)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content. Please try again.')
    } finally {
      setGenerating(false)
      setLoading(false)
    }
  }, [topic, selectedContentType, selectedTone, selectedPlatforms, audience, includeEmojis, includeHashtags, includeCta, contentLength, language, history])

  const handleCopy = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }).catch(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }, [])

  const handleRegenerate = useCallback(async (index: number) => {
    if (!topic.trim()) return
    setGenerating(true)
    setError(null)

    const lengthMap: Record<number, string> = { 1: 'short', 2: 'medium', 3: 'long' }

    try {
      const res = await fetch('/api/ai-writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          contentType: selectedContentType,
          tone: selectedTone,
          platforms: selectedPlatforms,
          options: {
            audience,
            includeEmojis,
            includeHashtags,
            includeCTA: includeCta,
            length: lengthMap[contentLength],
            language,
          },
        }),
      })

      if (!res.ok) throw new Error('Regeneration failed')

      const data = await res.json()
      const newVar = data.variations?.[0]
      if (newVar) {
        setVariations(prev => prev.map((v, i) =>
          i === index
            ? {
                ...v,
                text: newVar.text,
                charCount: newVar.charCount,
                wordCount: newVar.wordCount,
              }
            : v
        ))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regeneration failed')
    } finally {
      setGenerating(false)
    }
  }, [topic, selectedContentType, selectedTone, selectedPlatforms, audience, includeEmojis, includeHashtags, includeCta, contentLength, language])

  const handleSave = useCallback(async (variation: GeneratedVariation) => {
    const id = variation.id
    setSavingIds(prev => new Set(prev).add(id))
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: variation.text,
          platforms: variation.platforms,
          status: 'draft',
        }),
      })
      if (!res.ok) throw new Error('Save failed')
    } catch {
      // Silently fail - the save button still provides visual feedback
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [])

  const handleClearHistory = useCallback(() => {
    setHistory([])
    saveHistory([])
  }, [])

  const getLengthLabel = () => LENGTH_LABELS[contentLength] || 'Medium (3-5 sentences)'
  const getLengthDesc = () => LENGTH_DESCRIPTIONS[contentLength] || ''

  // ─── Render helpers ─────────────────────────────────────────────────────

  const ScoreBar = ({ label, value, max = 100 }: { label: string; value: number; max?: number }) => (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <div className="flex-1">
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-500 ${value >= 80 ? 'bg-emerald-500' : value >= 65 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
          />
        </div>
      </div>
      <span className="w-8 shrink-0 text-right font-medium">{value}/{max}</span>
    </div>
  )

  const ReadabilityBadge = ({ score }: { score: number }) => {
    if (score >= 80) return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 text-[10px]">Easy</Badge>
    if (score >= 60) return <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 text-[10px]">Medium</Badge>
    return <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 text-[10px]">Complex</Badge>
  }

  // ─── Main Render ────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
            <Wand2 className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Writer Studio</h1>
            <p className="text-sm text-muted-foreground">Generate AI-powered social media captions, descriptions, and content</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 sm:mt-0">
          <Badge variant="outline" className="gap-1.5 px-3 py-1">
            <Sparkles className="size-3.5 text-amber-500" />
            AI Powered
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1">
            <Zap className="size-3.5 text-emerald-500" />
            Live Generation
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Main Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left Column: Writer Controls */}
        <div className="space-y-6 xl:col-span-2">
          {/* Content Type Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Type className="size-4 text-violet-500" />
                Content Type
              </CardTitle>
              <CardDescription>Choose the type of content you want to create</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {CONTENT_TYPES.map((ct) => {
                  const Icon = ct.icon
                  const isSelected = selectedContentType === ct.type
                  return (
                    <button
                      key={ct.type}
                      onClick={() => setSelectedContentType(ct.type)}
                      className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all hover:shadow-md ${
                        isSelected
                          ? 'border-violet-500 bg-violet-50 shadow-sm dark:bg-violet-950/30'
                          : 'border-transparent bg-muted/50 hover:border-muted-foreground/20'
                      }`}
                    >
                      <div className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br ${ct.color} text-white shadow-sm transition-transform group-hover:scale-110`}>
                        <Icon className="size-5" />
                      </div>
                      <span className={`text-xs font-semibold leading-tight ${isSelected ? 'text-violet-700 dark:text-violet-300' : 'text-foreground'}`}>
                        {ct.label}
                      </span>
                      {isSelected && (
                        <div className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-violet-500 text-white">
                          <Check className="size-3" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Topic Input */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <PenTool className="size-4 text-violet-500" />
                Topic & Keywords
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Textarea
                  placeholder="What's your content about? Describe your topic, key points, or paste your notes..."
                  value={topic}
                  onChange={(e) => handleTopicChange(e.target.value)}
                  className="min-h-[120px] resize-none text-sm leading-relaxed"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {topic.length === 0 ? 'Be descriptive for better results' : `${topic.split(/\s+/).filter(Boolean).length} words`}
                  </p>
                  <p className={`text-xs font-medium ${topic.length > MAX_TOPIC_LENGTH * 0.9 ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {topic.length}/{MAX_TOPIC_LENGTH}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tone & Platforms Row */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Tone Selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Star className="size-4 text-amber-500" />
                  Tone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((t) => {
                    const isSelected = selectedTone === t.tone
                    return (
                      <button
                        key={t.tone}
                        onClick={() => setSelectedTone(t.tone)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                          isSelected
                            ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300'
                            : 'border-muted bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground'
                        }`}
                      >
                        <span>{t.emoji}</span>
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Platform Selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="size-4 text-rose-500" />
                  Target Platforms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {PLATFORMS.map((p) => {
                    const Icon = p.icon
                    const isChecked = selectedPlatforms.includes(p.id)
                    return (
                      <label
                        key={p.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-all hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => togglePlatform(p.id)}
                        />
                        <Icon className={`size-4 ${p.color}`} />
                        <span className="text-xs font-medium">{p.label}</span>
                      </label>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Advanced Options */}
          <Card>
            <CardHeader className="pb-3">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex w-full items-center justify-between"
              >
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="size-4 text-amber-500" />
                  Advanced Options
                </CardTitle>
                {showAdvanced ? (
                  <ChevronUp className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            {showAdvanced && (
              <CardContent>
                <div className="space-y-6">
                  {/* Audience & Language */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Target Audience</Label>
                      <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gen-z">Gen Z (18-25)</SelectItem>
                          <SelectItem value="millennials">Millennials (26-41)</SelectItem>
                          <SelectItem value="professionals">Professionals (30-55)</SelectItem>
                          <SelectItem value="general">General Audience</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Language</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                          <SelectItem value="pt">Portuguese</SelectItem>
                          <SelectItem value="ja">Japanese</SelectItem>
                          <SelectItem value="zh">Chinese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  {/* Toggles */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <Label htmlFor="emojis" className="text-sm cursor-pointer">Include Emojis</Label>
                      <Switch id="emojis" checked={includeEmojis} onCheckedChange={setIncludeEmojis} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <Label htmlFor="hashtags" className="text-sm cursor-pointer">Include Hashtags</Label>
                      <Switch id="hashtags" checked={includeHashtags} onCheckedChange={setIncludeHashtags} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <Label htmlFor="cta" className="text-sm cursor-pointer">Include CTA</Label>
                      <Switch id="cta" checked={includeCta} onCheckedChange={setIncludeCta} />
                    </div>
                  </div>

                  <Separator />

                  {/* Content Length Slider */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-muted-foreground">Content Length</Label>
                      <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">{getLengthLabel()}</span>
                    </div>
                    <Slider
                      value={[contentLength]}
                      onValueChange={(v) => setContentLength(v[0])}
                      min={1}
                      max={3}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Short</span>
                      <span>Medium</span>
                      <span>Long</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{getLengthDesc()}</p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!topic.trim() || generating}
            size="lg"
            className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 py-6 text-base font-semibold text-white shadow-lg hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 size-5 animate-spin" />
                Generating with AI...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-5" />
                Generate Content
              </>
            )}
          </Button>

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
              <CardContent className="flex items-start gap-3 p-4">
                <AlertCircle className="size-5 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">Generation Failed</p>
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Templates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-emerald-500" />
                Quick Templates
              </CardTitle>
              <CardDescription>Click a template to auto-fill the topic field</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {TEMPLATES.map((tmpl) => {
                  const Icon = tmpl.icon
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => handleTemplateClick(tmpl.topic)}
                      className="group flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all hover:border-violet-300 hover:bg-violet-50/50 hover:shadow-sm dark:hover:border-violet-700 dark:hover:bg-violet-950/20"
                    >
                      <div className="flex size-8 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30">
                        <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-violet-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold leading-tight">{tmpl.label}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{tmpl.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Results & History */}
        <div className="space-y-6">
          {/* Generated Results */}
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-4 text-violet-500" />
                  Generated Results
                </CardTitle>
                {variations.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{variations.length} variations</Badge>
                )}
              </div>
              <CardDescription>
                {generating
                  ? 'AI is crafting your content...'
                  : variations.length > 0
                    ? 'Click copy or save on any variation'
                    : 'Configure your settings and hit Generate'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[600px] pr-2">
                <div className="space-y-4">
                  {/* Loading Skeletons */}
                  {loading && (
                    <>
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-xl border p-4 space-y-3">
                          <Skeleton className="h-4 w-24" />
                          <div className="space-y-2">
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-3/4" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-5/6" />
                          </div>
                          <div className="flex gap-2">
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-8 w-20" />
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Variations */}
                  {!loading && variations.map((variation, index) => {
                    const metrics = computeReadability(variation.text)
                    return (
                      <div
                        key={variation.id}
                        className="rounded-xl border p-4 space-y-3 transition-all hover:border-violet-200 hover:shadow-sm dark:hover:border-violet-800"
                      >
                        {/* Variation Header */}
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            Variation {index + 1}
                          </Badge>
                          <ReadabilityBadge score={metrics.readability} />
                        </div>

                        {/* Content */}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{variation.text}</p>

                        {/* Metrics */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Type className="size-3" />
                            {variation.wordCount} words
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="size-3" />
                            {variation.charCount} chars
                          </span>
                          <span className="flex items-center gap-1">
                            <BarChart3 className="size-3" />
                            ~{metrics.avgSentenceLength} words/sentence
                          </span>
                        </div>

                        {/* Readability Bar */}
                        <ScoreBar label="Readability" value={metrics.readability} />

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1.5 text-xs"
                            onClick={() => handleCopy(variation.id, variation.text)}
                          >
                            {copiedId === variation.id ? (
                              <>
                                <Check className="size-3.5 text-emerald-500" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="size-3.5" />
                                Copy
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1.5 text-xs"
                            onClick={() => handleSave(variation)}
                            disabled={savingIds.has(variation.id)}
                          >
                            {savingIds.has(variation.id) ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="size-3.5" />
                                Save Draft
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => handleRegenerate(index)}
                            disabled={generating}
                          >
                            <RotateCcw className={`size-3.5 ${generating ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                      </div>
                    )
                  })}

                  {/* Empty State */}
                  {!loading && !generating && variations.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/80 mb-3">
                        <Wand2 className="size-7 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">No content generated yet</p>
                      <p className="mt-1 text-xs text-muted-foreground/70">Fill in your topic and click Generate to create content with AI</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Writing History */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="size-4 text-amber-500" />
                  Writing History
                </CardTitle>
                {history.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={handleClearHistory}
                  >
                    <Trash2 className="mr-1 size-3" />
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <History className="size-8 text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground">No history yet</p>
                  <p className="text-[10px] text-muted-foreground/60">Generated content will appear here</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[320px]">
                  <div className="space-y-2">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-start gap-3 rounded-lg border p-3 transition-all hover:bg-muted/50"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400">
                          {item.type === 'instagram' && <Instagram className="size-3.5" />}
                          {item.type === 'tweet' && <MessageSquare className="size-3.5" />}
                          {item.type === 'linkedin' && <Briefcase className="size-3.5" />}
                          {item.type === 'tiktok' && <Tv className="size-3.5" />}
                          {item.type === 'youtube' && <Youtube className="size-3.5" />}
                          {item.type === 'blog' && <BookOpen className="size-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium leading-tight line-clamp-2">{item.preview}</p>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Clock className="size-2.5" />
                            <span>{item.date}</span>
                            <span className="text-muted-foreground/50">·</span>
                            <span>{item.platform}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
