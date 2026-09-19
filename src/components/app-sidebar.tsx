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
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Shield,
  BarChart3,
  Hash,
  Wand2,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,

  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useState, useEffect } from 'react'
import { useAppStore, type Page } from '@/lib/store'
import { useSession, signOut } from 'next-auth/react'
import { isBypassMode } from '@/lib/bypass'

const mainNav: { label: string; page: Page; icon: React.ElementType }[] = [
  { label: 'Dashboard', page: 'dashboard', icon: LayoutDashboard },
  { label: 'Auto Poster', page: 'poster', icon: Send },
  { label: 'Calendar', page: 'calendar', icon: CalendarDays },
  { label: 'Comments', page: 'comments', icon: MessageSquare },
]

const engagementNav: { label: string; page: Page; icon: React.ElementType }[] = [
  { label: 'Auto Liker', page: 'liker', icon: Heart },
  { label: 'Trend Discovery', page: 'trends', icon: TrendingUp },
  { label: 'Competitor Analysis', page: 'competitor', icon: BarChart3 },
  { label: 'Hashtag Research', page: 'hashtags', icon: Hash },
]

const aiToolsNav: { label: string; page: Page; icon: React.ElementType }[] = [
  { label: 'AI Writer', page: 'ai-writer', icon: Wand2 },
  { label: 'AI Video Generator', page: 'ai-video', icon: Video },
  { label: 'Video Editor', page: 'video', icon: Film },
]

const managementNav: { label: string; page: Page; icon: React.ElementType }[] = [
  { label: 'Accounts', page: 'accounts', icon: Users },
  { label: 'Content Shield', page: 'copyright', icon: Shield },
]

function NavSection({ label, items, unreadComments }: { label: string; items: { label: string; page: Page; icon: React.ElementType }[]; unreadComments: number }) {
  const { currentPage, setCurrentPage } = useAppStore()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.page

          return (
            <SidebarMenuItem key={item.page}>
              <SidebarMenuButton
                tooltip={item.label}
                isActive={isActive}
                onClick={() => setCurrentPage(item.page)}
                className={isActive ? 'is-active' : ''}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </SidebarMenuButton>
              {item.page === 'comments' && unreadComments > 0 && (
                <span
                  className="pointer-events-none absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white group-data-[collapsible=icon]:right-0 group-data-[collapsible=icon]:top-0 group-data-[collapsible=icon]:size-4 group-data-[collapsible=icon]:text-[9px]"
                >
                  {unreadComments > 99 ? '99+' : unreadComments}
                </span>
              )}
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [unreadComments, setUnreadComments] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/comments?isRead=false')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && Array.isArray(data)) setUnreadComments(data.length)
      } catch {
        // badge stays hidden on error
      }
    }
    load()
    const timer = setInterval(load, 60000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const { state } = useSidebar()
  const { currentPage, setCurrentPage } = useAppStore()
  const { data: session } = useSession()
  const isExpanded = state === 'expanded'

  const bypassed = isBypassMode()
  const userName = session?.user?.name || (bypassed ? 'Demo User' : 'User')
  const userEmail = session?.user?.email || (bypassed ? 'demo@socialtool.com' : '')
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Header */}
      <SidebarHeader className="px-2 py-3">
        <div className="flex items-center gap-2 px-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="size-4" />
          </div>
          <span className="text-lg font-bold tracking-tight transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0">
            SocialPilot
          </span>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Navigation */}
      <SidebarContent>
        <NavSection unreadComments={unreadComments} label="Main" items={mainNav} />
        <SidebarSeparator />
        <NavSection unreadComments={unreadComments} label="Engage & Discover" items={engagementNav} />
        <SidebarSeparator />
        <NavSection unreadComments={unreadComments} label="AI Tools" items={aiToolsNav} />
        <SidebarSeparator />
        <NavSection unreadComments={unreadComments} label="Manage" items={managementNav} />

        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Settings"
                isActive={currentPage === 'settings'}
                onClick={() => setCurrentPage('settings')}
                className={currentPage === 'settings' ? 'is-active' : ''}
              >
                <Settings className="size-4" />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with user info */}
      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{userName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {userEmail}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronLeft className="ml-auto size-4 text-muted-foreground" />
                  ) : null}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                side="top"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem>
                  <Avatar className="size-6 mr-2">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-medium leading-none">{userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {userEmail}
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCurrentPage('settings')}>
                  <Settings className="mr-2 size-4" />
                  Settings
                </DropdownMenuItem>
                {/* Hidden in demo mode — there is no login, so no logout. */}
                {!bypassed && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => signOut({ callbackUrl: '/auth/login' })}
                    >
                      <LogOut className="mr-2 size-4" />
                      Log out
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

export function SidebarCollapseToggle() {
  const { state } = useSidebar()
  const isExpanded = state === 'expanded'

  return (
    <SidebarTrigger className="text-muted-foreground hover:text-foreground" asChild>
      <button
        aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        className="inline-flex size-7 items-center justify-center rounded-md hover:bg-accent"
      >
        {isExpanded ? (
          <ChevronLeft className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
      </button>
    </SidebarTrigger>
  )
}
