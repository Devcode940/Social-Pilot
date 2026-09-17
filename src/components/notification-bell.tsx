'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Bell,
  FileText,
  MessageSquare,
  Target,
  TrendingUp,
  Settings,

  CheckCheck,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  // Raw API field (the server calls it `read`); normalized on fetch.
  read?: boolean
  createdAt: string
}

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  post: FileText,
  comment: MessageSquare,
  campaign: Target,
  trend: TrendingUp,
  system: Settings,
}

const NOTIFICATION_COLORS: Record<string, string> = {
  post: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  comment: 'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
  campaign: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  trend: 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
  system: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      const items: NotificationItem[] = (data.notifications || []).map(
        (n: NotificationItem) => ({ ...n, isRead: n.isRead ?? n.read ?? false })
      )
      setNotifications(items)
      setUnreadCount(data.unreadCount || 0)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    intervalRef.current = setInterval(fetchNotifications, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchNotifications])

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      // silently fail
    }
  }

  const markAllAsRead = async () => {
    setMarkingAll(true)
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch {
      // silently fail
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-9">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4.5 min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
              disabled={markingAll}
            >
              {markingAll ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : (
                <CheckCheck className="mr-1 size-3" />
              )}
              Mark all read
            </Button>
          )}
        </div>

        <Separator />

        {/* Notifications list */}
        <ScrollArea className="h-[360px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Bell className="size-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                You&apos;re all caught up!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = NOTIFICATION_ICONS[notification.type] || Settings
                const colorClass = NOTIFICATION_COLORS[notification.type] || NOTIFICATION_COLORS.system

                return (
                  <button
                    key={notification.id}
                    className={cn(
                      'flex items-start gap-3 w-full px-4 py-3 text-left hover:bg-accent/50 transition-colors',
                      !notification.isRead && 'bg-primary/[0.03]'
                    )}
                    onClick={() => {
                      if (!notification.isRead) markAsRead(notification.id)
                    }}
                  >
                    <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-full mt-0.5', colorClass)}>
                      <Icon className="size-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          'text-sm leading-tight',
                          !notification.isRead ? 'font-semibold' : 'font-medium text-muted-foreground'
                        )}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <Separator />

        {/* Footer */}
        <div className="px-4 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-xs text-muted-foreground hover:text-foreground"
            onClick={() => {
              setOpen(false)
              setCurrentPage('settings')
            }}
          >
            <ExternalLink className="mr-1.5 size-3" />
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
