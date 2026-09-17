'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertTriangle,
  RefreshCw,
  WifiOff,
  SearchX,
  Lock,
  ServerCrash,
  ArrowLeft,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type ErrorType = '404' | '500' | 'network' | 'auth' | 'generic'

interface ErrorPageProps {
  /** Type of error to display (default: 'generic') */
  type?: ErrorType
  /** Custom title to override the default */
  title?: string
  /** Custom description to override the default */
  description?: string
  /** Callback when the retry button is clicked */
  onRetry?: () => void
  /** Callback when the back button is clicked */
  onBack?: () => void
  /** Whether to show the retry button (default: true) */
  showRetry?: boolean
  /** Whether to show the back button (default: true) */
  showBack?: boolean
  /** Optional extra content below the error message */
  children?: React.ReactNode
}

// ─── Error Config ────────────────────────────────────────────────────────────

const ERROR_CONFIG: Record<
  ErrorType,
  {
    icon: React.ReactNode
    title: string
    description: string
    color: string
    bgColor: string
    borderColor: string
  }
> = {
  '404': {
    icon: <SearchX className="h-8 w-8" />,
    title: 'Page Not Found',
    description:
      'The page you are looking for does not exist or has been moved. Please check the URL or navigate back.',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800/50',
  },
  '500': {
    icon: <ServerCrash className="h-8 w-8" />,
    title: 'Server Error',
    description:
      'Something went wrong on our end. Our team has been notified and is working on a fix. Please try again later.',
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800/50',
  },
  network: {
    icon: <WifiOff className="h-8 w-8" />,
    title: 'Connection Error',
    description:
      'Unable to reach the server. Please check your internet connection and try again.',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800/50',
  },
  auth: {
    icon: <Lock className="h-8 w-8" />,
    title: 'Authentication Required',
    description:
      'You need to be signed in to access this resource. Please log in and try again.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800/50',
  },
  generic: {
    icon: <AlertTriangle className="h-8 w-8" />,
    title: 'Something Went Wrong',
    description:
      'An unexpected error occurred. Please try again or contact support if the problem persists.',
    color: 'text-destructive',
    bgColor: 'bg-destructive/5',
    borderColor: 'border-destructive/30',
  },
}

// ─── ErrorPage Component ─────────────────────────────────────────────────────

export function ErrorPage({
  type = 'generic',
  title,
  description,
  onRetry,
  onBack,
  showRetry = true,
  showBack = true,
  children,
}: ErrorPageProps) {
  const config = ERROR_CONFIG[type]
  const displayTitle = title || config.title
  const displayDescription = description || config.description

  return (
    <div className="flex items-center justify-center min-h-[500px] p-6">
      <Card className={`w-full max-w-lg ${config.borderColor}`}>
        <CardHeader className="text-center pb-3">
          <div
            className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${config.bgColor}`}
          >
            <span className={config.color}>{config.icon}</span>
          </div>
          <CardTitle className="text-xl">{displayTitle}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-5">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            {displayDescription}
          </p>

          {/* Optional extra content */}
          {children && (
            <div className="pt-2">{children}</div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-3 pt-2">
            {showBack && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBack || (() => window.history.back())}
                className="gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Go Back
              </Button>
            )}

            {showRetry && (
              <Button
                size="sm"
                onClick={onRetry || (() => window.location.reload())}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try Again
              </Button>
            )}
          </div>

          {/* Error type indicator for debugging */}
          <p className="text-[11px] text-muted-foreground/50 pt-2">
            Error code: {type}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default ErrorPage
