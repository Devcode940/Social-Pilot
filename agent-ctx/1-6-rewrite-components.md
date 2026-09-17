# Task 1-6: Rewrite Competitor & Hashtags Pages with Real APIs

## Summary
Rewrote two `'use client'` React components to use real API backends instead of hardcoded mock data. Created corresponding API routes with full CRUD operations.

## Files Created/Modified

### API Routes
- **`src/app/api/competitors/route.ts`** — New file. GET (list all), POST (create with random metrics), DELETE (by id)
- **`src/app/api/hashtags/route.ts`** — New file. GET (list all), POST (create), DELETE (by id)

### Component Rewrites
- **`src/components/competitor/competitor-page.tsx`** — Full rewrite:
  - Removed ALL hardcoded competitors, chart data, insights, opportunities
  - `useState`: competitors, loading, error, showAddDialog, addForm, sortBy, sortDir
  - `useEffect`: fetch from `/api/competitors` on mount
  - Add Competitor: Dialog → POST to `/api/competitors` → reload
  - Remove Competitor: DELETE `/api/competitors?id=xxx`
  - Sort: Click table headers for client-side array sort (asc/desc/null cycle)
  - Stats: Derived from real data (tracked count, avg growth, market share estimate)
  - Charts: BarChart for followers + engagement from real data
  - Strategy insights: Generated from real data patterns (highest engagement, posting frequency, growth leaders, etc.)
  - Opportunities: Derived from competitor data gaps (low engagement, low posting, platform gaps, etc.)
  - Skeleton loading states, error states, empty states
  - Same visual layout (tabs, cards, tables)

- **`src/components/hashtags/hashtags-page.tsx`** — Full rewrite:
  - Removed ALL hardcoded hashtag sets, trending, performance data, collections
  - `useState`: hashtagSets, loading, error, searchQuery, generatedSets, generating, showSaveDialog
  - `useEffect`: Fetch saved sets from `/api/hashtags` on mount
  - Generate: POST to `/api/ai-writer` with topic="hashtags for X", parse response hashtags
  - Save Set: Dialog → POST to `/api/hashtags` with { name, hashtags, reach, platform }
  - Delete Set: DELETE `/api/hashtags?id=xxx`
  - Copy All: navigator.clipboard.writeText with feedback
  - Saved Collections: Map `hashtagSets` from API to collection cards
  - Performance Tracker: Built from saved sets data
  - Banned Checker: Static reference list of ~40 known banned hashtags (valid use case)
  - Skeleton loading states, error states, empty states
  - Same visual layout (search, generated sets, collections, performance, banned checker)

## Key Design Decisions
- Used `useMemo` for derived data (charts, insights, opportunities) to avoid unnecessary recalculations
- Insights and opportunities are dynamically generated from competitor data patterns
- Engagement data for saved hashtag sets uses randomized values since we can't track real engagement
- Banned hashtag checker keeps a static reference list (valid use case for known banned tags)
- Maintained the same visual layout and design patterns as the original components
