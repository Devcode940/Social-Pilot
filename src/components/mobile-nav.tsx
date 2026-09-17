'use client'

import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { useAppStore, type Page } from '@/lib/store'
import {
  LayoutDashboard,
  Send,
  Wand2,
  TrendingUp,
  MoreHorizontal,
  CalendarDays,
  MessageSquare,
  Heart,
  Film,
  Video,
  Users,
  BarChart3,
  Hash,
  Shield,
  Settings,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'

const MAIN_TABS: { label: string; page: Page; icon: React.ElementType }[] = [
  { label: 'Dashboard', page: 'dashboard', icon: LayoutDashboard },
  { label: 'Poster', page: 'poster', icon: Send },
  { label: 'AI Writer', page: 'ai-writer', icon: Wand2 },
  { label: 'Trends', page: 'trends', icon: TrendingUp },
]

const MORE_ITEMS: { label: string; page: Page; icon: React.ElementType; section?: string }[] = [
  { label: 'Calendar', page: 'calendar', icon: CalendarDays, section: 'Main' },
  { label: 'Comments', page: 'comments', icon: MessageSquare, section: 'Main' },
  { label: 'Auto Liker', page: 'liker', icon: Heart, section: 'Engage' },
  { label: 'Competitor Analysis', page: 'competitor', icon: BarChart3, section: 'Engage' },
  { label: 'Hashtag Research', page: 'hashtags', icon: Hash, section: 'Engage' },
  { label: 'AI Video Generator', page: 'ai-video', icon: Video, section: 'AI Tools' },
  { label: 'Video Editor', page: 'video', icon: Film, section: 'AI Tools' },
  { label: 'Accounts', page: 'accounts', icon: Users, section: 'Manage' },
  { label: 'Content Shield', page: 'copyright', icon: Shield, section: 'Manage' },
  { label: 'Settings', page: 'settings', icon: Settings, section: 'System' },
]

function MoreSheet({ currentPage, onNavigate }: { currentPage: Page; onNavigate: (page: Page) => void }) {
  const [open, setOpen] = useState(false)

  // Group items by section
  const sections: Record<string, typeof MORE_ITEMS> = {}
  for (const item of MORE_ITEMS) {
    const section = item.section ?? 'Other'
    if (!sections[section]) sections[section] = []
    sections[section].push(item)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors w-16 py-1">
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-base">All Pages</SheetTitle>
          <SheetDescription className="text-xs">
            Navigate to any section of SocialPilot
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto pb-safe">
          {Object.entries(sections).map(([section, items], sectionIndex) => (
            <div key={section}>
              {sectionIndex > 0 && <Separator className="my-2" />}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                {section}
              </p>
              <div className="grid grid-cols-2 gap-1">
                {items.map((item) => {
                  const Icon = item.icon
                  const isActive = currentPage === item.page
                  return (
                    <button
                      key={item.page}
                      onClick={() => {
                        onNavigate(item.page)
                        setOpen(false)
                      }}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors text-left ${
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default function MobileNav() {
  const isMobile = useIsMobile()
  const { currentPage, setCurrentPage } = useAppStore()

  if (!isMobile) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom)] pt-1">
        {MAIN_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = currentPage === tab.page

          return (
            <button
              key={tab.page}
              onClick={() => setCurrentPage(tab.page)}
              className={`flex flex-col items-center gap-0.5 py-1 w-16 transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                isActive ? 'bg-primary/10' : ''
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && (
                <span className="absolute -bottom-0 h-0.5 w-8 rounded-full bg-primary" />
              )}
            </button>
          )
        })}

        <MoreSheet currentPage={currentPage} onNavigate={setCurrentPage} />
      </div>
    </nav>
  )
}
