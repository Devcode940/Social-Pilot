'use client'

import { toast } from 'sonner'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Play, Pause, SkipBack, SkipForward, Scissors, Copy, Trash2, Download, Save,
  Plus, Type, Music, Palette, Volume2, ZoomIn, ZoomOut, Film, Layers,
  ChevronLeft, Clock, Eye, EyeOff, X, Loader2,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface MediaProject {
  id: string
  name: string
  type: string
  duration: number | null
  status: string
  thumbnail: string | null
  createdAt: string
  updatedAt: string
}

interface TextOverlay {
  id: string
  content: string
  fontFamily: string
  fontSize: number
  color: string
  position: 'top' | 'center' | 'bottom'
  animation: string
}

// ── Static data (UI-only) ──────────────────────────────────────────────────

const filters = [
  { name: 'None', color: 'bg-gradient-to-br from-gray-300 to-gray-400' },
  { name: 'Warm', color: 'bg-gradient-to-br from-orange-300 to-amber-500' },
  { name: 'Cool', color: 'bg-gradient-to-br from-cyan-300 to-teal-500' },
  { name: 'Vintage', color: 'bg-gradient-to-br from-yellow-400 to-orange-600' },
  { name: 'B&W', color: 'bg-gradient-to-br from-gray-100 to-gray-800' },
  { name: 'Sepia', color: 'bg-gradient-to-br from-amber-200 to-yellow-800' },
  { name: 'Vivid', color: 'bg-gradient-to-br from-rose-400 to-purple-600' },
  { name: 'Cinematic', color: 'bg-gradient-to-br from-slate-600 to-zinc-900' },
]

const presetColors = [
  { name: 'white', hex: '#FFFFFF', ring: 'ring-gray-400' },
  { name: 'black', hex: '#000000', ring: 'ring-gray-400' },
  { name: 'red', hex: '#EF4444', ring: 'ring-red-400' },
  { name: 'yellow', hex: '#EAB308', ring: 'ring-yellow-400' },
  { name: 'green', hex: '#22C55E', ring: 'ring-green-400' },
  { name: 'blue', hex: '#3B82F6', ring: 'ring-blue-400' },
]

const backgroundMusic = [
  { id: 'none', name: 'No Music', duration: '' },
  { id: 'upbeat', name: 'Upbeat Corporate', duration: '2:30' },
  { id: 'ambient', name: 'Ambient Chill', duration: '3:15' },
  { id: 'dramatic', name: 'Dramatic Rise', duration: '1:45' },
  { id: 'acoustic', name: 'Acoustic Light', duration: '2:00' },
]

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
  editing: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  exported: 'bg-teal-100 text-teal-700 border-teal-300',
  published: 'bg-teal-100 text-teal-700 border-teal-300',
  review: 'bg-amber-100 text-amber-700 border-amber-300',
}

const thumbnailGradients = [
  'bg-gradient-to-br from-rose-400 to-orange-500',
  'bg-gradient-to-br from-emerald-400 to-cyan-500',
  'bg-gradient-to-br from-violet-400 to-fuchsia-500',
  'bg-gradient-to-br from-amber-400 to-red-500',
  'bg-gradient-to-br from-teal-400 to-emerald-600',
  'bg-gradient-to-br from-pink-400 to-rose-600',
]

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '00:00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatShortTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
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
  return `${diffD}d ago`
}

// ── Component ──────────────────────────────────────────────────────────────

export default function VideoPage() {
  // Project state (from API)
  const [projects, setProjects] = useState<MediaProject[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectType, setNewProjectType] = useState('video')
  const [newProjectDuration, setNewProjectDuration] = useState('60')
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  // Preview state
  const [watermarkEnabled, setWatermarkEnabled] = useState(true)

  // Timeline state
  const [timelineZoom, setTimelineZoom] = useState(100)

  // Trim state (local editing)
  const [trimStart, setTrimStart] = useState('00:00:00')
  const [trimEnd, setTrimEnd] = useState('00:01:00')

  // Filter state (local editing)
  const [activeFilter, setActiveFilter] = useState('None')
  const [filterIntensity, setFilterIntensity] = useState(75)

  // Text state (local editing)
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([])
  const [currentText, setCurrentText] = useState('')
  const [textFont, setTextFont] = useState('Inter')
  const [textSize, setTextSize] = useState(32)
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [textPosition, setTextPosition] = useState<'top' | 'center' | 'bottom'>('center')
  const [textAnimation, setTextAnimation] = useState('none')

  // Audio state (local editing)
  const [volume, setVolume] = useState(80)
  const [bgMusic, setBgMusic] = useState('none')
  const [fadeIn, setFadeIn] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  // Export state
  const [exportFormat, setExportFormat] = useState('mp4')
  const [exportQuality, setExportQuality] = useState('1080p')

  // Sidebar state
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)

  // ── Fetch projects ──────────────────────────────────────────────────────

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/media')
      if (!res.ok) throw new Error('Failed to fetch projects')
      const data = await res.json()
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-select first project when projects load
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // ── Derived ─────────────────────────────────────────────────────────────

  const selectedProject = projects.find(p => p.id === selectedProjectId) ?? null
  const totalDuration = selectedProject?.duration ?? 60

  const timelineProgress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  const timeMarkers = totalDuration > 0
    ? Array.from({ length: Math.min(12, Math.ceil(totalDuration / 30) + 1) }, (_, i) => {
        const secs = i * 30
        const m = Math.floor(secs / 60)
        const s = Math.floor(secs % 60)
        return `${m}:${String(s).padStart(2, '0')}`
      })
    : ['0:00', '0:30', '1:00', '1:30', '2:00', '2:30']

  // ── Handlers ────────────────────────────────────────────────────────────

  const handlePlayToggle = () => setIsPlaying(prev => !prev)

  const handleAddTextOverlay = () => {
    if (!currentText.trim()) return
    const newOverlay: TextOverlay = {
      id: Date.now().toString(),
      content: currentText,
      fontFamily: textFont,
      fontSize: textSize,
      color: textColor,
      position: textPosition,
      animation: textAnimation,
    }
    setTextOverlays(prev => [...prev, newOverlay])
    setCurrentText('')
  }

  const handleRemoveTextOverlay = (id: string) => {
    setTextOverlays(prev => prev.filter(t => t.id !== id))
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          type: newProjectType,
          duration: parseFloat(newProjectDuration) || 60,
        }),
      })
      if (!res.ok) throw new Error('Failed to create project')
      const created = await res.json()
      setNewProjectName('')
      setNewProjectDuration('60')
      setIsNewProjectOpen(false)
      setProjects(prev => [created, ...prev])
      setSelectedProjectId(created.id)
    } catch {
      toast.error('Failed to create project. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!selectedProjectId) return
    setSaving(true)
    try {
      const res = await fetch('/api/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedProjectId,
          status: 'editing',
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const updated = await res.json()
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    } catch {
      toast.error('Failed to save draft. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async () => {
    if (!selectedProjectId) return
    setSaving(true)
    try {
      const res = await fetch('/api/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedProjectId,
          status: 'exported',
        }),
      })
      if (!res.ok) throw new Error('Failed to export')
      const updated = await res.json()
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    } catch {
      toast.error('Failed to export project. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProject = async (id: string) => {
    try {
      const res = await fetch(`/api/media?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setProjects(prev => prev.filter(p => p.id !== id))
      if (selectedProjectId === id) {
        setSelectedProjectId(projects.find(p => p.id !== id)?.id ?? null)
      }
    } catch {
      toast.error('Failed to delete project. Please try again.')
    }
  }

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id)
    // Reset editing state when switching projects
    setTextOverlays([])
    setTrimStart('00:00:00')
    setTrimEnd(formatDuration(projects.find(p => p.id === id)?.duration ?? 60))
    setActiveFilter('None')
    setCurrentTime(0)
    setIsPlaying(false)
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header / Project Selector ─────────────────────────────────── */}
      <header className="border-b bg-card">
        <div className="flex items-center justify-between px-4 py-3 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            >
              <Layers className="h-5 w-5" />
            </Button>
            <Film className="h-5 w-5 text-primary shrink-0" />
            <h1 className="text-lg font-semibold hidden sm:block">Video Editor</h1>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md">
            {loading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select value={selectedProjectId ?? ''} onValueChange={handleSelectProject}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.name}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[p.status] ?? statusColors.editing}`}>
                          {p.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsNewProjectOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">New Project</span>
            </Button>
            <Button variant="outline" size="icon" onClick={handleSaveDraft} disabled={saving || !selectedProjectId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
            <Button size="sm" onClick={handleExport} disabled={saving || !selectedProjectId}>
              <Download className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        {/* Project info bar */}
        {selectedProject && (
          <div className="px-4 pb-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(selectedProject.duration)}
            </span>
            <Badge variant="outline" className={`text-[10px] ${statusColors[selectedProject.status] ?? statusColors.editing}`}>
              {selectedProject.status}
            </Badge>
            <span>Last edited: {timeAgo(selectedProject.updatedAt)}</span>
            <span className="capitalize">{selectedProject.type}</span>
          </div>
        )}
      </header>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left Sidebar: Recent Projects ─────────────────────────── */}
        <aside
          className={`border-r bg-card transition-all duration-300 ${
            leftSidebarOpen ? 'w-64 flex-shrink-0' : 'w-0 overflow-hidden'
          } hidden lg:block`}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Projects ({projects.length})</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setLeftSidebarOpen(false)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
            <Separator />
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5">
                      <Skeleton className="w-12 h-8 rounded-md" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))
                ) : projects.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-zinc-400">
                    <Film className="h-8 w-8 mb-2" />
                    <p className="text-xs">No projects yet</p>
                  </div>
                ) : (
                  projects.map((project, index) => (
                    <button
                      key={project.id}
                      className={`w-full text-left rounded-lg p-2.5 transition-colors group ${
                        selectedProjectId === project.id ? 'bg-accent' : 'hover:bg-accent/50'
                      }`}
                      onClick={() => handleSelectProject(project.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-12 h-8 rounded-md ${thumbnailGradients[index % thumbnailGradients.length]} flex items-center justify-center shrink-0`}
                        >
                          <Play className="h-3.5 w-3.5 text-white/80" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                            {project.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                            <span>{formatDuration(project.duration)}</span>
                            <span>·</span>
                            <span>{timeAgo(project.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </aside>

        {/* ── Center: Preview + Timeline ────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {error && (
            <div className="p-4">
              <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-4 flex items-center justify-between">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchProjects}>Retry</Button>
              </div>
            </div>
          )}

          {/* Video Preview */}
          <div className="flex-1 flex items-center justify-center p-4 min-h-[280px]">
            <div className="relative w-full max-w-4xl aspect-video bg-black/90 rounded-xl overflow-hidden shadow-2xl group">
              {/* Video frame simulation */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black flex items-center justify-center">
                {selectedProject ? (
                  <div className="w-48 h-28 sm:w-64 sm:h-36 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center">
                    <Film className="h-10 w-10 sm:h-14 sm:w-14 text-white/20" />
                  </div>
                ) : (
                  <div className="text-center text-white/30">
                    <Film className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">Select or create a project</p>
                  </div>
                )}
              </div>

              {/* Resolution badge */}
              <div className="absolute top-3 left-3">
                <Badge variant="secondary" className="bg-black/60 text-white/90 border-white/10 backdrop-blur-sm">
                  {exportQuality}
                </Badge>
              </div>

              {/* Duration display */}
              <div className="absolute top-3 right-3">
                <Badge variant="secondary" className="bg-black/60 text-white/90 border-white/10 backdrop-blur-sm font-mono text-xs">
                  {formatTime(currentTime)} / {formatDuration(selectedProject?.duration ?? null)}
                </Badge>
              </div>

              {/* Watermark */}
              {watermarkEnabled && (
                <div className="absolute bottom-14 right-4 text-white/20 text-xs font-medium tracking-wider pointer-events-none select-none">
                  WATERMARK
                </div>
              )}

              {/* Text overlays preview */}
              {textOverlays.map(overlay => (
                <div
                  key={overlay.id}
                  className={`absolute left-0 right-0 flex justify-center pointer-events-none ${
                    overlay.position === 'top' ? 'top-16' : overlay.position === 'bottom' ? 'bottom-16' : 'top-1/2 -translate-y-1/2'
                  }`}
                >
                  <span
                    style={{
                      fontFamily: overlay.fontFamily,
                      fontSize: `${Math.min(overlay.fontSize, 24)}px`,
                      color: overlay.color,
                      textShadow: '0 2px 8px rgba(0,0,0,0.7)',
                    }}
                    className="font-semibold"
                  >
                    {overlay.content}
                  </span>
                </div>
              ))}

              {/* Play button overlay */}
              {selectedProject && (
                <button
                  onClick={handlePlayToggle}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-all hover:scale-110">
                    {isPlaying ? (
                      <Pause className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                    ) : (
                      <Play className="h-7 w-7 sm:h-8 sm:w-8 text-white ml-1" />
                    )}
                  </div>
                </button>
              )}

              {/* Playback controls bar */}
              {selectedProject && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {/* Progress bar */}
                  <div
                    className="relative h-1 bg-white/20 rounded-full mb-3 cursor-pointer group/progress"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const x = e.clientX - rect.left
                      const pct = x / rect.width
                      setCurrentTime(Math.floor(pct * totalDuration))
                    }}
                  >
                    <div
                      className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-200"
                      style={{ width: `${timelineProgress}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
                      style={{ left: `${timelineProgress}%`, transform: `translate(-50%, -50%)` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10" onClick={() => setCurrentTime(0)}>
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10" onClick={handlePlayToggle}>
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10" onClick={() => setCurrentTime(totalDuration)}>
                        <SkipForward className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-white/70 ml-2 font-mono">
                        {formatShortTime(currentTime)} / {formatShortTime(totalDuration)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10" onClick={() => setWatermarkEnabled(!watermarkEnabled)}>
                        {watermarkEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Timeline ────────────────────────────────────────────── */}
          <div className="border-t bg-card px-4 py-3">
            {/* Timeline controls */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Scissors className="h-3.5 w-3.5 mr-1" />
                  Split
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => selectedProjectId && handleDeleteProject(selectedProjectId)}
                  disabled={!selectedProjectId}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setTimelineZoom(prev => Math.max(50, prev - 25))}>
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-[11px] text-muted-foreground w-10 text-center">{timelineZoom}%</span>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setTimelineZoom(prev => Math.min(200, prev + 25))}>
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Time markers */}
            <div className="relative mb-1">
              <div
                className="flex justify-between text-[10px] text-muted-foreground px-0"
                style={{ width: `${timelineZoom}%`, transition: 'width 0.2s' }}
              >
                {timeMarkers.map(t => (
                  <span key={t} className="font-mono">{t}</span>
                ))}
              </div>
            </div>

            {/* Track area */}
            <div className="relative space-y-1.5 overflow-x-auto pb-1" style={{ maxWidth: '100%' }}>
              <div style={{ width: `${timelineZoom}%`, minWidth: '100%', transition: 'width 0.2s' }}>
                {/* Video Track */}
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground w-14 shrink-0 flex items-center gap-1">
                    <Film className="h-3 w-3" /> Video
                  </Label>
                  <div className="relative flex-1 h-9 bg-muted/50 rounded-md border border-border overflow-hidden">
                    <div className="absolute inset-y-0 left-[3%] right-[5%] flex gap-0.5">
                      <div className="h-full w-full bg-gradient-to-r from-emerald-500/80 to-emerald-600/80 rounded-sm flex items-center px-2">
                        <span className="text-[10px] text-white font-medium truncate">
                          {selectedProject?.name ?? 'No project selected'}
                        </span>
                      </div>
                    </div>
                    <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none" style={{ left: `${timelineProgress}%` }}>
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-sm" />
                    </div>
                  </div>
                </div>

                {/* Audio Track */}
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground w-14 shrink-0 flex items-center gap-1">
                    <Volume2 className="h-3 w-3" /> Audio
                  </Label>
                  <div className="relative flex-1 h-7 bg-muted/50 rounded-md border border-border overflow-hidden">
                    <div className="absolute inset-y-0 left-[3%] right-[5%]">
                      <div className="h-full w-full bg-gradient-to-r from-amber-500/60 to-amber-600/60 rounded-sm flex items-center px-2">
                        <span className="text-[10px] text-white/90 font-medium truncate">
                          {bgMusic === 'none' ? 'Original Audio' : backgroundMusic.find(m => m.id === bgMusic)?.name ?? 'Original Audio'}
                        </span>
                      </div>
                    </div>
                    <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none" style={{ left: `${timelineProgress}%` }} />
                  </div>
                </div>

                {/* Text Track */}
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground w-14 shrink-0 flex items-center gap-1">
                    <Type className="h-3 w-3" /> Text
                  </Label>
                  <div className="relative flex-1 h-7 bg-muted/50 rounded-md border border-border overflow-hidden">
                    {textOverlays.length > 0 ? (
                      <div className="absolute inset-y-0 left-[3%] right-[5%] flex gap-1">
                        {textOverlays.map((overlay, idx) => (
                          <div key={overlay.id} className="h-full rounded-sm bg-gradient-to-r from-purple-500/70 to-purple-600/70 flex items-center px-2" style={{ width: `${100 / Math.max(textOverlays.length, 1)}%` }}>
                            <span className="text-[10px] text-white font-medium truncate">{overlay.content || `Text ${idx + 1}`}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground/60">No text overlays</span>
                      </div>
                    )}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none" style={{ left: `${timelineProgress}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Export Bar (bottom) ──────────────────────────────────── */}
          <div className="border-t bg-card px-4 py-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Format:</span>
                <div className="flex gap-1">
                  {['mp4', 'mov', 'webm'].map(f => (
                    <Button key={f} variant={exportFormat === f ? 'default' : 'outline'} size="sm" className="h-7 text-xs px-3" onClick={() => setExportFormat(f)}>
                      {f.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
              <Separator orientation="vertical" className="h-5 hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Quality:</span>
                <Select value={exportQuality} onValueChange={setExportQuality}>
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="720p">720p HD</SelectItem>
                    <SelectItem value="1080p">1080p Full HD</SelectItem>
                    <SelectItem value="4k">4K Ultra HD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving || !selectedProjectId}>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  Save Draft
                </Button>
                <Button size="sm" onClick={handleExport} disabled={saving || !selectedProjectId}>
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Export Video
                </Button>
              </div>
            </div>
          </div>
        </main>

        {/* ── Right Sidebar: Editing Tools ──────────────────────────── */}
        <aside className="w-72 xl:w-80 border-l bg-card flex-shrink-0 hidden md:flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <Tabs defaultValue="trim" className="h-full">
              <TabsList className="w-full grid grid-cols-4 rounded-none border-b bg-transparent p-0 h-auto">
                <TabsTrigger value="trim" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 text-xs">
                  <Scissors className="h-3.5 w-3.5 mr-1" /> Trim
                </TabsTrigger>
                <TabsTrigger value="filters" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 text-xs">
                  <Palette className="h-3.5 w-3.5 mr-1" /> Filters
                </TabsTrigger>
                <TabsTrigger value="text" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 text-xs">
                  <Type className="h-3.5 w-3.5 mr-1" /> Text
                </TabsTrigger>
                <TabsTrigger value="audio" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-2 text-xs">
                  <Music className="h-3.5 w-3.5 mr-1" /> Audio
                </TabsTrigger>
              </TabsList>

              {/* ── Trim Tab ── */}
              <TabsContent value="trim" className="p-4 mt-0 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Start Time</Label>
                  <Input value={trimStart} onChange={e => setTrimStart(e.target.value)} className="h-9 font-mono text-sm" placeholder="00:00:00" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">End Time</Label>
                  <Input value={trimEnd} onChange={e => setTrimEnd(e.target.value)} className="h-9 font-mono text-sm" placeholder="00:02:34" />
                </div>
                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                  <p className="text-[11px] text-muted-foreground">Trimmed Duration</p>
                  <p className="text-lg font-semibold font-mono">{trimEnd}</p>
                  <p className="text-[10px] text-muted-foreground">Original: {formatDuration(selectedProject?.duration ?? null)}</p>
                </div>
                <Button className="w-full" onClick={() => {}}>
                  <Scissors className="h-4 w-4 mr-2" /> Apply Trim
                </Button>
              </TabsContent>

              {/* ── Filters Tab ── */}
              <TabsContent value="filters" className="p-4 mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {filters.map(filter => (
                    <button key={filter.name} onClick={() => setActiveFilter(filter.name)} className={`relative rounded-lg overflow-hidden transition-all ${activeFilter === filter.name ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]' : 'hover:scale-[1.02] opacity-80 hover:opacity-100'}`}>
                      <div className={`aspect-video ${filter.color}`} />
                      <div className="absolute inset-x-0 bottom-0 bg-black/50 py-1 text-center">
                        <span className="text-[10px] font-medium text-white">{filter.name}</span>
                      </div>
                      {activeFilter === filter.name && (
                        <div className="absolute top-1.5 right-1.5">
                          <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Intensity</Label>
                    <span className="text-xs text-muted-foreground font-mono">{filterIntensity}%</span>
                  </div>
                  <Slider value={[filterIntensity]} onValueChange={v => setFilterIntensity(v[0])} min={0} max={100} step={1} />
                </div>
              </TabsContent>

              {/* ── Text Tab ── */}
              <TabsContent value="text" className="p-4 mt-0 space-y-4">
                <Button variant="outline" className="w-full" onClick={handleAddTextOverlay}>
                  <Plus className="h-4 w-4 mr-2" /> Add Text Overlay
                </Button>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Text Content</Label>
                  <Input value={currentText} onChange={e => setCurrentText(e.target.value)} placeholder="Enter text overlay..." className="h-9 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Font Family</Label>
                  <Select value={textFont} onValueChange={setTextFont}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                      <SelectItem value="Courier New">Courier New</SelectItem>
                      <SelectItem value="Verdana">Verdana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Font Size</Label>
                    <span className="text-xs text-muted-foreground font-mono">{textSize}px</span>
                  </div>
                  <Slider value={[textSize]} onValueChange={v => setTextSize(v[0])} min={12} max={72} step={1} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Text Color</Label>
                  <div className="flex items-center gap-2">
                    {presetColors.map(color => (
                      <button key={color.name} onClick={() => setTextColor(color.hex)} className={`w-7 h-7 rounded-full transition-all ${textColor === color.hex ? `ring-2 ${color.ring} ring-offset-2 ring-offset-background scale-110` : 'hover:scale-110'}`} style={{ backgroundColor: color.hex }} title={color.name} />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Position</Label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['top', 'center', 'bottom'] as const).map(pos => (
                      <Button key={pos} variant={textPosition === pos ? 'default' : 'outline'} size="sm" className="h-8 text-xs capitalize" onClick={() => setTextPosition(pos)}>{pos}</Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Animation</Label>
                  <Select value={textAnimation} onValueChange={setTextAnimation}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="fade-in">Fade In</SelectItem>
                      <SelectItem value="slide-up">Slide Up</SelectItem>
                      <SelectItem value="typewriter">Typewriter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Active overlays list */}
                {textOverlays.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Active Overlays ({textOverlays.length})</Label>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {textOverlays.map(overlay => (
                          <div key={overlay.id} className="flex items-center justify-between rounded-md border bg-muted/30 p-2">
                            <span className="text-xs truncate flex-1 mr-2">{overlay.content}</span>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-[10px] capitalize">{overlay.position}</Badge>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveTextOverlay(overlay.id)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* ── Audio Tab ── */}
              <TabsContent value="audio" className="p-4 mt-0 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Background Music</Label>
                  <Select value={bgMusic} onValueChange={setBgMusic}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {backgroundMusic.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          <span className="flex items-center justify-between gap-4">
                            <span>{m.name}</span>
                            {m.duration && <span className="text-xs text-muted-foreground">{m.duration}</span>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Volume</Label>
                    <span className="text-xs text-muted-foreground font-mono">{volume}%</span>
                  </div>
                  <Slider value={[volume]} onValueChange={v => setVolume(v[0])} min={0} max={100} step={1} />
                </div>

                <Separator />

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Fade In</p>
                    <p className="text-xs text-muted-foreground">Gradually increase volume</p>
                  </div>
                  <Switch checked={fadeIn} onCheckedChange={setFadeIn} />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Fade Out</p>
                    <p className="text-xs text-muted-foreground">Gradually decrease volume</p>
                  </div>
                  <Switch checked={fadeOut} onCheckedChange={setFadeOut} />
                </div>

                {bgMusic !== 'none' && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{backgroundMusic.find(m => m.id === bgMusic)?.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Duration: {backgroundMusic.find(m => m.id === bgMusic)?.duration ?? 'N/A'}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </aside>
      </div>

      {/* ── New Project Dialog ── */}
      <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>Create a new media project for editing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input id="project-name" placeholder="e.g. Product Showcase" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newProjectType} onValueChange={setNewProjectType}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-duration">Duration (seconds)</Label>
              <Input id="project-duration" type="number" placeholder="60" min={1} value={newProjectDuration} onChange={e => setNewProjectDuration(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewProjectOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || submitting}>
              {submitting ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
