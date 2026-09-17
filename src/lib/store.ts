import { create } from 'zustand'

export type Page = 'dashboard' | 'poster' | 'calendar' | 'comments' | 'liker' | 'video' | 'ai-video' | 'accounts' | 'competitor' | 'copyright' | 'trends' | 'hashtags' | 'ai-writer' | 'settings'

interface AppState {
  currentPage: Page
  setCurrentPage: (page: Page) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))

export interface SocialAccount {
  id: string
  platform: string
  username: string
  displayName: string | null
  avatar: string | null
  followers: number
  following: number
  isActive: boolean
  connectedAt: string
}

export interface Post {
  id: string
  platforms: string
  content: string
  mediaUrl: string | null
  mediaType: string | null
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  scheduledAt: string | null
  publishedAt: string | null
  likes: number
  comments: number
  shares: number
  views: number
  createdAt: string
}

export interface CommentItem {
  id: string
  postId: string
  author: string
  avatar: string | null
  content: string
  platform: string
  isRead: boolean
  isReplied: boolean
  reply: string | null
  createdAt: string
}

export interface Campaign {
  id: string
  name: string
  type: 'like' | 'follow' | 'comment' | 'view'
  platforms: string
  targetCount: number
  currentCount: number
  status: 'active' | 'paused' | 'completed'
  startedAt: string
  endedAt: string | null
}

export interface MediaProject {
  id: string
  name: string
  type: string
  sourceUrl: string | null
  duration: number | null
  status: string
  thumbnail: string | null
  createdAt: string
}
