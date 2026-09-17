# Task: Background Scheduler + Calendar Improvements + Error Handling

## Files Created

### 1. `/src/lib/api-helpers.ts`
- **tryCatch()**: Higher-order function that wraps async API handlers with standardized error responses. Handles Zod validation errors, SyntaxError (invalid JSON), and generic errors.
- **validateBody()**: Validates request body against a Zod schema. Returns typed data on success or a 400 error response.
- **withAuth()**: Higher-order function that checks for authenticated user before proceeding. Uses the first DB user as demo auth.
- **rateLimit()**: In-memory rate limiter using IP-based keys. Configurable maxRequests and windowSeconds. Auto-cleans old entries every 5 minutes.
- **successResponse() / errorResponse()**: Convenience helpers for consistent JSON responses.
- **schedulerBodySchema**: Zod schema for scheduler API validation.

### 2. `/src/app/api/scheduler/route.ts`
- **POST**: Accepts `{ type: "process_scheduled_posts" | "process_campaigns" | "check_trends" }`.
  - `process_scheduled_posts`: Finds scheduled posts where scheduledAt <= now, updates to "published", sets publishedAt, creates notification.
  - `process_campaigns`: Finds active campaigns, increments currentCount by random 1-5, completes if target reached, creates notification.
  - `check_trends`: Finds recent trend queries (last 7 days), creates notifications for stale ones (>24h).
  - All results saved to ScheduledJob table. Rate limited to 30 req/min.
- **GET**: Returns scheduler status info, recent jobs, and aggregate stats.

### 3. `/src/app/api/scheduler/cron/route.ts`
- **GET**: External cron endpoint (callable by cron-job.org). Runs all three scheduler job types in sequence. Returns simple status response with details per job type.

### 4. `/src/components/error-boundary.tsx`
- React class component ErrorBoundary with `getDerivedStateFromError` and `componentDidCatch`.
- Shows friendly error UI with error message, retry button, and "Report Issue" button.
- Logs errors to console. Supports custom fallback, title, description, and error callback.

### 5. `/src/components/error-page.tsx`
- Standalone error page component for programmatic use (not a boundary).
- Supports 5 error types: `404`, `500`, `network`, `auth`, `generic`.
- Each type has unique icon, colors, title, and description.
- Retry and Go Back buttons with customizable callbacks.

### 6. `.env.example`
- Template environment file with DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET.
- Placeholder keys for all social media platforms (Instagram, Twitter, TikTok, YouTube, LinkedIn, Facebook).

## Files Modified

### 7. `/src/components/calendar/calendar-page.tsx`
Enhanced with:
- **Month/Week view toggle**: ToggleGroup to switch between month grid and week view.
- **Week view**: 7-column grid showing current week with post previews, color-coded by status.
- **Navigation**: Previous/Next buttons adapt to current view (month or week), plus Today button.
- **Color-coded posts**: Published (green), Scheduled (blue), Draft (gray), Failed (red) — using background colors on post indicators.
- **Post count per day**: PostCountIndicator component showing count by status with colored dots.
- **Day click dialog**: Shows posts grouped by status with status headers.
- **"Schedule Post" button**: In dialog footer, navigates to poster page with date pre-filled via sessionStorage.
- **Content preview on hover**: Tooltip on each calendar cell showing truncated post content, status labels, and count.
- **Status Legend card**: Replaces Platform Legend in sidebar, shows all 4 status types with colored dots.
- **Updated Quick Stats**: Shows Total, Scheduled, Published, and Failed counts.

## Verification
- ESLint passes with zero errors.
- Dev server compiles successfully.
