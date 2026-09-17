'use client'

import dynamic from 'next/dynamic'
import { AuthGuard } from '@/components/auth-guard'

const HomeContent = dynamic(() => import('@/components/home-content'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading SocialPilot...</p>
      </div>
    </div>
  ),
})

export default function Home() {
  return (
    <AuthGuard>
      <HomeContent />
    </AuthGuard>
  )
}
