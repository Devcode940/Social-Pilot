'use client'

import React, { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode
  /** Optional fallback UI to display instead of the default error display */
  fallback?: ReactNode
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** Title shown in the error UI (default: "Something went wrong") */
  title?: string
  /** Description shown in the error UI */
  description?: string
  /** Whether to show the "Report Issue" button (default: true) */
  showReportButton?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

// ─── ErrorBoundary Component ─────────────────────────────────────────────────

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo })

    // Log error to console
    console.error('[ErrorBoundary] Caught an error:', error)
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)

    // Call optional error callback
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleReportIssue = (): void => {
    const { error, errorInfo } = this.state
    console.log('[ErrorBoundary] Issue Report:', {
      errorMessage: error?.message,
      errorStack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      url: typeof window !== 'undefined' ? window.location.href : 'N/A',
    })
    alert('Issue logged to console. Check developer tools for details.')
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Card className="w-full max-w-md border-destructive/30 bg-destructive/5">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
              <CardTitle className="text-lg">
                {this.props.title || 'Something went wrong'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                {this.props.description ||
                  'An unexpected error occurred while rendering this component. This has been logged for review.'}
              </p>

              {/* Error details (collapsible in production) */}
              {this.state.error && (
                <div className="rounded-lg bg-muted/50 p-3 text-left">
                  <p className="text-xs font-mono text-destructive break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleRetry}
                  className="gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try Again
                </Button>

                {this.props.showReportButton !== false && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={this.handleReportIssue}
                    className="gap-1.5 text-muted-foreground"
                  >
                    <Bug className="h-3.5 w-3.5" />
                    Report Issue
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
