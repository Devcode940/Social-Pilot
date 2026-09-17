'use client'

import {
  LayoutDashboard,
  Send,
  CalendarDays,
  MessageSquare,
  Heart,
  Film,
  Video,
  Users,
  Zap,
  TrendingUp,
  Hash,
  Wand2,
  BarChart3,
  Shield,
  Settings,
  Search,
} from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { useAppStore, type Page } from '@/lib/store'

interface PageMeta {
  title: string
  description: string
  icon: React.ElementType
}

const pageMetaMap: Record<Page, PageMeta> = {
  dashboard: {
    title: 'Dashboard',
    description: 'Overview of your social media performance',
    icon: LayoutDashboard,
  },
  poster: {
    title: 'Auto Poster',
    description: 'Schedule and manage your posts across platforms',
    icon: Send,
  },
  calendar: {
    title: 'Content Calendar',
    description: 'Plan and visualize your posting schedule',
    icon: CalendarDays,
  },
  comments: {
    title: 'Comments',
    description: 'Manage and respond to comments across platforms',
    icon: MessageSquare,
  },
  liker: {
    title: 'Auto Liker',
    description: 'Automate engagement with targeted content',
    icon: Heart,
  },
  video: {
    title: 'Video Editor',
    description: 'Create and edit videos for social media',
    icon: Film,
  },
  'ai-video': {
    title: 'AI Video Generator',
    description: 'Generate short videos using AI prompts',
    icon: Video,
  },
  accounts: {
    title: 'Accounts',
    description: 'Manage connected social media accounts',
    icon: Users,
  },
  trends: {
    title: 'Trend Discovery',
    description: 'Discover trending topics and viral content across platforms',
    icon: TrendingUp,
  },
  hashtags: {
    title: 'Hashtag Research',
    description: 'Find trending hashtags and generate optimized sets',
    icon: Hash,
  },
  'ai-writer': {
    title: 'AI Writer Studio',
    description: 'Generate AI-powered social media captions and content',
    icon: Wand2,
  },
  competitor: {
    title: 'Competitor Analysis',
    description: 'Track and compare competitor social media performance',
    icon: BarChart3,
  },
  copyright: {
    title: 'Content Shield',
    description: 'Protect your content from unauthorized use',
    icon: Shield,
  },
  settings: {
    title: 'Settings',
    description: 'Manage your account and preferences',
    icon: Settings,
  },
}

export function PageHeader() {
  const { currentPage } = useAppStore()
  const meta = pageMetaMap[currentPage]
  const Icon = meta.icon

  return (
    <div className="flex flex-1 items-center gap-3 overflow-hidden px-2">
      <SidebarTrigger className="-ml-1 shrink-0" />
      <Separator orientation="vertical" className="hidden h-5 sm:block" />
      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#" className="flex items-center gap-1.5">
              <Zap className="size-3.5" />
              <span className="hidden sm:inline">SocialPilot</span>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-1.5 font-medium">
              <Icon className="size-3.5" />
              {meta.title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Button
        variant="ghost"
        size="sm"
        className="hidden sm:flex items-center gap-1.5 text-muted-foreground h-8 px-2.5"
        onClick={() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
        }}
      >
        <Search className="size-3.5" />
        <span className="text-xs">Search...</span>
        <kbd className="pointer-events-none hidden select-none items-center gap-0.5 rounded border bg-muted px-1 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
    </div>
  )
}
