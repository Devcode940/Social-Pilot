'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search,
  FileText,
  MessageSquare,
  Target,
  Users,
  Hash,
  Plus,
  Wand2,
  Clock,
  X,
  ArrowRight,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useAppStore, type Page } from '@/lib/store'

interface SearchResult {
  id: string
  title: string
  description: string
  category: string
  page: Page
  icon: React.ElementType
}

const QUICK_ACTIONS: { label: string; page: Page; icon: React.ElementType }[] = [
  { label: 'New Post', page: 'poster', icon: Plus },
  { label: 'New Campaign', page: 'liker', icon: Target },
  { label: 'AI Writer', page: 'ai-writer', icon: Wand2 },
]

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Posts: FileText,
  Comments: MessageSquare,
  Campaigns: Target,
  Competitors: Users,
  Hashtags: Hash,
}

const STORAGE_KEY = 'socialpilot-recent-searches'

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function addRecentSearch(query: string) {
  if (!query.trim()) return
  try {
    const recent = getRecentSearches().filter((s) => s.toLowerCase() !== query.toLowerCase())
    recent.unshift(query)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, 8)))
  } catch {
    // ignore
  }
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)

  // Sole entry point for opening the dialog: resets search state up front
  // (event context) instead of syncing it in an effect keyed on `open`.
  const openDialog = useCallback(() => {
    setRecentSearches(getRecentSearches())
    setQuery('')
    setResults([])
    setOpen(true)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) setOpen(false)
        else openDialog()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, openDialog])

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      // Single server-side query (bounded, no AI side effects).
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      const items: SearchResult[] = (data.results || []).map(
        (r: { id: string; title: string; description: string; category: string; page: Page }) => ({
          ...r,
          icon: CATEGORY_ICONS[r.category] || FileText,
        })
      )
      setResults(items)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, performSearch])

  const handleSelect = (page: Page) => {
    setCurrentPage(page)
    setOpen(false)
    if (query.trim()) {
      addRecentSearch(query)
    }
  }

  const handleRecentClick = (term: string) => {
    setQuery(term)
  }

  const groupedResults = results.reduce<Record<string, SearchResult[]>>((acc, result) => {
    if (!acc[result.category]) acc[result.category] = []
    acc[result.category].push(result)
    return acc
  }, {})

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center border-b px-4">
          <Search className="mr-2 size-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, campaigns, competitors, hashtags..."
            className="border-0 focus-visible:ring-0 h-12 text-sm bg-transparent px-0"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={() => { setQuery(''); inputRef.current?.focus() }}
            >
              <X className="size-3.5" />
            </Button>
          )}
          <kbd className="pointer-events-none ml-2 hidden select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            ESC
          </kbd>
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="p-2">
            {/* Empty state / initial view */}
            {!query && !searching && (
              <div className="space-y-4 py-2">
                {/* Quick actions */}
                <div>
                  <p className="px-2 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Quick Actions
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {QUICK_ACTIONS.map((action) => {
                      const Icon = action.icon
                      return (
                        <button
                          key={action.page}
                          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left w-full"
                          onClick={() => handleSelect(action.page)}
                        >
                          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                            <Icon className="size-4 text-primary" />
                          </div>
                          <span className="font-medium">{action.label}</span>
                          <ArrowRight className="ml-auto size-3.5 text-muted-foreground" />
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Recent searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-2 pb-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Recent Searches
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto py-0 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          clearRecentSearches()
                          setRecentSearches([])
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {recentSearches.map((term) => (
                        <button
                          key={term}
                          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors text-left w-full"
                          onClick={() => handleRecentClick(term)}
                        >
                          <Clock className="size-4 text-muted-foreground" />
                          <span>{term}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Loading */}
            {searching && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                  Searching...
                </div>
              </div>
            )}

            {/* No results */}
            {!searching && query && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="size-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No results found</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Try searching for a different term
                </p>
              </div>
            )}

            {/* Results grouped by category */}
            {!searching && query && results.length > 0 && (
              <div className="space-y-4 py-2">
                {Object.entries(groupedResults).map(([category, items]) => {
                  const CategoryIcon = CATEGORY_ICONS[category] || FileText
                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 px-2 pb-2">
                        <CategoryIcon className="size-3.5 text-muted-foreground" />
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {category}
                        </p>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {items.length}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {items.map((item) => {
                          const Icon = item.icon
                          return (
                            <button
                              key={item.id}
                              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left w-full"
                              onClick={() => handleSelect(item.page)}
                            >
                              <Icon className="size-4 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{item.title}</p>
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                              </div>
                              <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-4 py-2">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">↵</kbd>
              Select
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">Esc</kbd>
            {' '}to close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
