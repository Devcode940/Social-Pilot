'use client'

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { PageHeader } from '@/components/page-header'
import { GlobalSearch } from '@/components/global-search'
import { NotificationBell } from '@/components/notification-bell'
import dynamic from 'next/dynamic'
import { useAppStore } from '@/lib/store'
import MobileNav from '@/components/mobile-nav'
const DashboardPage = dynamic(() => import('@/components/dashboard/dashboard-page'), { loading: () => <PageLoader /> })
const PosterPage = dynamic(() => import('@/components/poster/poster-page'), { loading: () => <PageLoader /> })
const CalendarPage = dynamic(() => import('@/components/calendar/calendar-page'), { loading: () => <PageLoader /> })
const CommentsPage = dynamic(() => import('@/components/comments/comments-page'), { loading: () => <PageLoader /> })
const LikerPage = dynamic(() => import('@/components/liker/liker-page'), { loading: () => <PageLoader /> })
const VideoPage = dynamic(() => import('@/components/video-editor/video-page'), { loading: () => <PageLoader /> })
const AIVideoPage = dynamic(() => import('@/components/ai-video/ai-video-page'), { loading: () => <PageLoader /> })
const AccountsPage = dynamic(() => import('@/components/accounts/accounts-page'), { loading: () => <PageLoader /> })
const CompetitorPage = dynamic(() => import('@/components/competitor/competitor-page'), { loading: () => <PageLoader /> })
const CopyrightPage = dynamic(() => import('@/components/copyright/copyright-page'), { loading: () => <PageLoader /> })
const TrendsPage = dynamic(() => import('@/components/trends/trends-page'), { loading: () => <PageLoader /> })
const HashtagsPage = dynamic(() => import('@/components/hashtags/hashtags-page'), { loading: () => <PageLoader /> })
const AIWriterPage = dynamic(() => import('@/components/ai-writer/ai-writer-page'), { loading: () => <PageLoader /> })
const SettingsPage = dynamic(() => import('@/components/settings/settings-page'), { loading: () => <PageLoader /> })

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export default function HomeContent() {
  const state = useAppStore()
  const currentPage = state.currentPage

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />
      case 'poster':
        return <PosterPage />
      case 'calendar':
        return <CalendarPage />
      case 'comments':
        return <CommentsPage />
      case 'liker':
        return <LikerPage />
      case 'video':
        return <VideoPage />
      case 'ai-video':
        return <AIVideoPage />
      case 'accounts':
        return <AccountsPage />
      case 'competitor':
        return <CompetitorPage />
      case 'copyright':
        return <CopyrightPage />
      case 'trends':
        return <TrendsPage />
      case 'hashtags':
        return <HashtagsPage />
      case 'ai-writer':
        return <AIWriterPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <DashboardPage />
    }
  }

  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <PageHeader />
            <div className="flex items-center gap-1 ml-auto">
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
            {renderPage()}
          </main>
        </SidebarInset>
      </SidebarProvider>
      <MobileNav />
      <GlobalSearch />
    </>
  )
}
