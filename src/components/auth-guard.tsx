'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { isBypassMode } from '@/lib/bypass'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isBypassMode() && status === 'unauthenticated') {
      router.replace('/auth/login')
    }
  }, [status, router])

  // Temporary demo mode: no login required, render straight through.
  if (isBypassMode()) {
    return <>{children}</>
  }

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return <>{children}</>
}
