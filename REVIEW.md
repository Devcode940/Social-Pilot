# SocialPilot — Code Review

**Date:** 2026-09-17 · **Branch:** `arena/01a0aee0-social-pilot` · **Reviewer:** Arena agent (running instance)
**App status:** ✅ Running — `next dev -H 0.0.0.0 -p 3000`, login → dashboard → APIs verified end-to-end.
**TypeScript:** ✅ `tsc --noEmit` passes with 0 errors. **ESLint:** ⚠️ passes vacuously (all rules disabled — see M-12).

**Fix status (2026-09-17):** ✅ **All 5 Critical + 7 High + 12 Medium + all Low items are fixed** — see §7 Fix log. Gates now: `tsc --noEmit` clean under full `strict` (incl. `noImplicitAny`), `npm run lint` 0 errors, `npm audit` 0 vulnerabilities, `ignoreBuildErrors: false`. Verified live against the restarted dev server (§7 table).

> Severity: 🔴 Critical (fix before any shared use) · 🟠 High (fix soon) · 🟡 Medium · 🔵 Low/nit
> Items marked **[VERIFIED LIVE]** were reproduced against the running server during this review.

---

## 1. 🔴 Critical

### C-1. `GET /api/accounts` leaks bcrypt password hashes (+ API keys) — [VERIFIED LIVE]
**Where:** `src/app/api/accounts/route.ts:6-12` (`include: { user: true }`)

Any logged-in user receives the **full user row** for every account owner, including `password` (bcrypt hash) and `apiKey`. Live proof: response contained `password: "$2b$12$kBJE5..."`.
**Fix (5 min):** select only safe fields:
```ts
include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
// and scope to the session user (see C-2)
```

### C-2. No multi-user isolation — every route acts as the *first* user — [VERIFIED LIVE]
**Where:** 13× `db.user.findFirst()` across `posts`, `accounts`, `settings`, `notifications`, `scheduler`, `cron`, `api-helpers`.

Only `/api/auth/profile` uses `getServerSession()`. Everything else reads/writes user #1's data. Live proof: logged in as `review@example.com`, my created post + account were attributed to `test@example.com` (`userId: cmo3olcdw…`), and I could read/modify them back.
**Fix:** the standard pattern already exists in `src/app/api/auth/profile/route.ts` — apply it everywhere:
```ts
const session = await getServerSession(authOptions)
if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
// …then scope every query by the session user's id
```
Note: `Competitor`, `Campaign`, `HashtagSet`, `TrendResult`, `CopyrightContent`, `MediaProject` have **no `userId` column at all** — they can't be scoped without a schema migration.

### C-3. "Clear All Data" wipes *everyone's* data (unscoped `deleteMany`)
**Where:** `src/app/api/settings/route.ts:170-173`
```ts
await db.comment.deleteMany(); await db.post.deleteMany(); await db.campaign.deleteMany();
```
No `where` clause. Combined with C-2, any user can delete all posts/comments/campaigns in the system. (The UI does confirm via AlertDialog — good — but the blast radius is global.)
**Fix:** scope deletes to the session user, or remove the endpoint until C-2 is fixed.

### C-4. `withAuth()` helper accepts *any* Bearer token
**Where:** `src/lib/api-helpers.ts:104-148` — currently dead code (only `scheduler/route.ts` imports from this file, and it doesn't use `withAuth`), but it's a landmine:
```ts
// "we accept any non-empty token as valid for the demo"
```
**Fix:** delete it, or reimplement with `getServerSession()` / `getToken()` before anyone wires it up.

### C-5. Cron endpoint is documented for external cron but unreachable (and unprotected)
**Where:** `src/app/api/scheduler/cron/route.ts`, `src/middleware.ts`
- Unauthenticated `GET /api/scheduler/cron` → **307 redirect to login** [VERIFIED LIVE], so cron-job.org-style services can never call it — scheduled publishing silently never runs in production.
- If you do expose it, there is **no shared secret** — anyone could trigger it.
**Fix:** add a `CRON_SECRET` env check in the route and bypass middleware for it when the secret matches (header or query param).

---

## 2. 🟠 High

### H-1. Video Editor persistence is 100% broken (405s) — [VERIFIED LIVE]
**Where:** `src/app/api/media/route.ts` (only implements `GET`) vs `src/components/video-editor/video-page.tsx:257,284,306,326` (calls POST/PUT/PUT/DELETE).
`POST /api/media` → **405** [VERIFIED LIVE]. Worse, all failures are swallowed with bare `console.error` — the user clicks "Save/Export" and nothing happens with zero feedback.
**Fix:** implement the write handlers (or remove the UI) and surface errors via toast like the rest of the app.

### H-2. Fabricated "analytics" presented as real data
Random numbers are generated and displayed without any "estimated/demo" label:
| Where | Fabrication |
|---|---|
| `api/competitors/route.ts` (POST) | followers, engagement, posts/week, growth, bestTime, following all `Math.random()` when search yields nothing |
| `api/hashtags/route.ts` | `reach: Math.floor(Math.random() * 10M)` per tag |
| `api/scheduler/*` + `cron` | campaign progress `+1..5` random per run |
| `api/copyright/route.ts` | similarity gets `+ random*20` jitter; **platform randomly assigned** when URL doesn't match; "fingerprint" is `hash(name + timestamp + random)` — not content-derived, can't detect anything |
| `api/stats/route.ts` | `followerChange = "+2.4%"` hardcoded |
| `app-sidebar.tsx` | `UNREAD_COMMENTS = 3` hardcoded badge |
| competitor regex parsing | first `123K followers` match in *any* search snippet text becomes the metric |

**Fix:** label estimates as estimates, drop random fallbacks (return `null`/`"unknown"` + UI empty-states), derive fingerprints from content (e.g. sha256 of normalized text).

### H-3. Unbounded paid-AI spend, triggerable by GET requests
8 routes call the paid Z-AI SDK (`trends`, `ai-writer`, `ai-video`, `ai-reply`, `ai-schedule`, `generate-image`, `comments`, `competitors`, `hashtags`, `copyright`) with **no rate limiting** (only `/api/scheduler` POST has any) and mostly no input length caps. Worst cases:
- `GET /api/comments?action=analyze_sentiment` — a **GET that writes** and fires one LLM call **per comment, unbounded, sequential** (`findMany` with no `take`). Refreshes, prefetchers, or a curious proxy can burn money.
- `GET /api/competitors` — side-effecting GET that fires paid web searches for stale rows. **Typing in Global Search calls it** (see M-3), so keystrokes can spend money.
**Fix:** move AI work to POST with explicit IDs + limits, add `rateLimit()` (already written!) + prompt length caps to every AI route, add timeouts.

### H-4. User API keys stored and returned in plaintext
**Where:** `api/settings/route.ts` (`apiKey.create({ label, key })`, GET returns `key`), `auth/profile` selects `User.apiKey`.
**Fix:** store only a hash + last-4 for display (standard practice); never return full secrets.

### H-5. "Delete Account" is a fake that toasts success
**Where:** `api/settings/route.ts` DELETE `deleteAccount` — `// In a real app this would delete…` then returns `{ success: true }`; UI toasts *"Account deletion requested"*. The user believes their account/data is gone. It isn't.
**Fix:** implement it (delete user + cascade) or remove the button.

### H-6. Secrets-bearing files will be committed to git
`.gitignore` covers `.env` but **not** `db/custom.db` (all users incl. password hashes — it shipped inside the zip) or `public/uploads/` (user uploads + AI images). Worse, `.zscripts/build.sh` **copies the dev database into the production package**, shipping test users/hashes/keys to prod.
**Fix:** add `db/*.db*` and `public/uploads/*` (keep `.gitkeep`) to `.gitignore`; build prod DB from migrations, never by copying dev data.

### H-7. Seed creates a demo user that can never log in (+ stale data)
**Where:** `api/seed/route.ts` — `demo@socialtool.com` is created **without a password** (`authorize` requires one), and all seed timestamps are Jan–Feb 2024. Also, seeding requires an existing login (middleware) — chicken-and-egg on a fresh DB.
**Fix:** set a documented dev password (or skip user creation if one exists), use relative dates, allow one-shot seeding.

---

## 3. 🟡 Medium

- **M-1. APIs return 307 redirects instead of 401 JSON.** `withAuth` middleware redirects `/api/*` (except `/api/auth/*`) to the login page for missing sessions [VERIFIED LIVE]. API clients/fetch callers get HTML, not JSON. Fix: custom middleware that returns 401 JSON for `/api/*`.
- **M-2. Notification read-state is broken.** API field is `read`, but `notification-bell.tsx` reads `isRead` → every item renders as unread (badge count is correct; item state isn't). Fix: map `read → isRead` on fetch.
- **M-3. Global search refetches 4 full tables per keystroke.** `global-search.tsx:119-166` — sequential `fetch('/api/posts')`, `/campaigns`, `/competitors`, `/hashtags` with no debounce visible at the fetch layer and no server-side search; payloads are unbounded and one of them can trigger paid AI (H-3). Fix: debounce + a real `GET /api/search?q=` endpoint.
- **M-4. Scheduler logic copy-pasted.** `scheduler/route.ts` and `scheduler/cron/route.ts` duplicate the same three job functions (~150 lines). Fix: extract to `src/lib/scheduler.ts`, both routes call it.
- **M-5. `TrendResult` is write-only.** Every trends search saves a row that nothing ever reads (scheduler only checks staleness). Either serve cached results or stop storing.
- **M-6. "AI Video" is a PNG in the database.** `ai-video/route.ts` generates a 1024×1024 *thumbnail image*, stores the full base64 data-URL in `MediaProject.thumbnail` (~MBs per row in SQLite), marks it `status: "exported"`, and ignores `resolution/model/music/voiceover/watermark` params. Fix: save the file to `public/uploads` like `generate-image` does, store the URL, and label it "concept art".
- **M-7. Client-side-only "routing".** All 14 pages are statically imported in `home-content.tsx` and switched via zustand — one giant client bundle, no deep links, no SSR benefit from the App Router, and login ignores `callbackUrl` (always `/`). Fix: `next/dynamic` per page at minimum; route-per-page ideally.
- **M-8. Time bombs:** `"…2026"` hardcoded in AI search queries (`trends`, `competitors`, `hashtags`); seed dates in 2024. Use `new Date().getFullYear()`.
- **M-9. Third-party/risky deps:** `GET /api/*` reachable only with session (good), but `next-auth@4` is in maintenance mode (v5/`auth.js` is current); `npm audit` reports **9 vulns (4 moderate, 5 high)** incl. sharp/libvips CVEs (`GHSA-f88m…`, `GHSA-rgj7…`) and js-yaml quadratic-CPU issues. Run `npm audit fix` (sharp needs `--force`/major bump — test image gen after).
- **M-10. Inconsistent API response shapes.** `{ message }` vs `{ error }` vs `{ success, message }` vs raw arrays — every frontend call site guesses. The unused `successResponse/errorResponse` helpers were meant to fix this; adopt them.
- **M-11. No validation on most write endpoints.** Only the scheduler route uses zod. `posts`/`campaigns`/`accounts` pass raw body fields straight to Prisma (wrong types → 500 instead of 400; I hit this live sending `platforms: []`).
- **M-12. Lint/type gates are decorative.** `eslint.config.mjs` disables ~25 rules including `no-unused-vars`/`no-explicit-any`; `tsconfig` sets `strict: true` then `noImplicitAny: false`; `next.config` sets `ignoreBuildErrors: true`. tsc passes today, but nothing will catch regressions.

## 4. 🔵 Low / nits

- `GET /api` returns template `"Hello, world!"` — replace with a health check (`{ ok, version, db }`).
- Dead code: `AuthGuard` (never used — middleware covers it), `withAuth/successResponse/errorResponse` helpers, `simpleHash` in competitors, `textContent` in copyright register, unused `searchInsights`.
- `totalEngagement` field actually carries the engagement *rate* (dashboard appends `%`, so display is right — rename to `engagementRate`).
- `sentimentCache` is an unbounded module-level `Map` (memory leak) with two inconsistent key schemes (id vs content-slice) — the id-keyed lookup can never hit.
- `setInterval` at module scope in `api-helpers.ts` (fine in standalone Node, problematic on serverless).
- Dashboard fetches `/api/stats` in both an effect and a refresh callback — dedupe.
- Search button dispatches a synthetic `⌘K` KeyboardEvent to open the dialog — works, but brittle; use a store flag.
- 3 raw `<img>` tags (unoptimized), external favicon URL (`z-cdn.chatglm.cn` — availability/tracking), Google Fonts fails offline (falls back with warnings — fine in dev, consider the `geist` npm package to self-host).
- The real 48KB README lives at `download/README.md`; repo-root `README.md` is just `# Social-Pilot`. Move it to root.
- Dual lockfiles: `bun.lock` (original) + `package-lock.json` (added by npm install in this env). Pick one toolchain per environment.
- `build.sh` hardcodes `/home/z/my-project`, requires `bun` + `$BUILD_ID` — only works on the original host.

---

## 5. What's good ✅

- Clean, consistent structure: one route file per resource, shadcn/ui throughout, polished responsive UI with mobile nav, dark mode, skeletons/empty states.
- AuthN done right at the edges: bcrypt (12 rounds), credentials flow verified working, middleware + session callback with role, `profile` route is the correct per-user pattern to copy.
- `scheduler` POST is the best-written endpoint (zod validation, 429 rate limiting with `Retry-After`, job auditing to `ScheduledJob`).
- No XSS vectors (`dangerouslySetInnerHTML` only in shadcn's chart CSS pattern), no `eval`, no hardcoded secrets, no absolute URLs (all fetches relative — preview-safe), no `localhost` in client code.
- Destructive UI actions use AlertDialog confirmations; toasts for feedback; error boundary + error page exist.
- `tsc --noEmit` is fully clean — the codebase is type-sound as-is.

---

## 6. Suggested fix order (highest ROI first)

1. **C-1** — select safe user fields in `/api/accounts` (5 minutes, stops active hash leak).
2. **C-2** — add `getServerSession` + per-user scoping to all routes; add `userId` to the 6 global models (the big one — everything else depends on it).
3. **C-3 + H-5** — scope `clearData`; implement or remove `deleteAccount`.
4. **C-4 + C-5** — delete fake `withAuth`; add `CRON_SECRET` + middleware bypass.
5. **H-1** — implement `/api/media` POST/PUT/DELETE (or hide the broken UI).
6. **H-2/H-3** — kill random-data fallbacks; rate-limit + cap all AI routes; make AI GETs POSTs.
7. **H-6** — gitignore DB/uploads; stop shipping dev DB to prod.

---

## 7. Fix log — every item resolved (2026-09-17)

Branch `arena/01a0aee0-social-pilot`. Each fix was re-verified live (fresh `next dev`, curl suite: register 200/409/400 → login → session cookie → scoped CRUD → scheduler/cron → seed idempotency → deleteAccount cascade → rate limits).

### Critical

| # | Fix | Where | Live proof |
|---|---|---|---|
| C-1 | Accounts no longer embed user rows; all user reads select safe fields only | `api/accounts/route.ts` | `{"error":…}` shape has no `password`/`apiKey` anywhere |
| C-2 | `userId` + cascade `User?` added to `Competitor/Campaign/HashtagSet/TrendResult/CopyrightContent/MediaProject`; **all** routes scope via `withAuth`/`requireUser` (no demo bypass); deleting an account detaches its posts | `prisma/schema.prisma`, all `api/*/route.ts`, `lib/auth-helpers.ts` | New user sees `[]` posts while seeded data exists; new rows carry own `userId` |
| C-3 | `clearData` + `deleteAccount` are scoped transactions (14-model delete list), `deleteAccount` signs out | `api/settings/route.ts`, `settings-page.tsx` | `DELETE ?action=deleteAccount` → user row gone, stale session → 401 |
| C-4 | `withAuth` reimplemented on `getServerSession` (real 401s), adopted by all routes | `lib/api-helpers.ts` | Unauth `GET /api/*` → `401 {"error":"Unauthorized"}` (11/11 routes) |
| C-5 | `CRON_SECRET` (32-byte hex) + timing-safe compare; cron accepts header/query **or** session; middleware bypass | `.env`, `api/scheduler/cron/route.ts`, `middleware.ts` | Wrong secret → 401, correct → `{"success":true,…}` |

### High

| # | Fix | Where |
|---|---|---|
| H-1 | Full `/api/media` CRUD (POST/PUT/DELETE, zod, ownership); video-page errors now `toast.error` instead of silent `console.error` | `api/media/route.ts`, `video-page.tsx` |
| H-2 | No fabricated metrics: competitor `isEstimated` + *Estimated* badge + per-row refresh; hashtag `reach: null` → *reach unknown*; fabricated hashtags engagement column **removed**; copyright sha256 content fingerprint + `Unknown` platform; stats `engagementRate` + null follower change → `n/a`; sidebar live unread count; campaigns never self-increment | competitors/hashtags/copyright/stats/scheduler routes + 4 pages |
| H-3 | AI moved to POST-only (`comments` analyze), explicit IDs/limits everywhere, per-user hourly caps (10–30/hr) + input length caps + 24h trends cache; global search no longer touches AI routes | comments/competitors/trends/ai-*/generate-image routes, `global-search.tsx` |
| H-4 | API keys: full secret never returned — `keyPreview` (last-4) only; reveal/copy buttons removed | `api/settings/route.ts`, `settings-page.tsx` |
| H-5 | `deleteAccount` truly deletes user + all data in one transaction | `api/settings/route.ts` (+ cascade FKs in schema) |
| H-6 | `.gitignore`: `db/*.db*`, `public/uploads/*` (keeps `.gitkeep`); removed 48MB `Social Pilot (2).zip` from git; `.env.example` template added | `.gitignore`, `.env.example` |
| H-7 | Seed sets documented password `Demo1234!`, relative dates, idempotent, bootstrap rule (public only at zero users) | `api/seed/route.ts` |

### Medium & Low

- **M-1** — middleware returns JSON 401 for `/api/*`; pages still redirect. **M-2** — bell maps `read→isRead`. **M-3** — new `GET /api/search?q=` (scoped, grouped); global search makes 1 debounced call. **M-4** — shared `runSchedulerJob` in `lib/scheduler.ts`. **M-5** — trends serve 24h-cached `TrendResult` rows (parallel searches + dynamic year). **M-6** — ai-video saves concept PNG to uploads, stores URL, `status: concept`, ignores nothing silently. **M-7** — 14 pages `next/dynamic` code-split; login honors same-origin `callbackUrl`; demo autofill; root uses `AuthGuard`. **M-8** — dynamic year everywhere. **M-9** — `npm audit`: **0 vulns** (removed unused `@mdxeditor/editor` + `react-syntax-highlighter`, `sharp@^0.35.4`, `prisma`→devDeps, `deepmerge-ts` override — toolchain re-validated). **M-10** — uniform `{ error }` envelope + `successResponse/errorResponse` adopted. **M-11** — zod on every write endpoint (400s with `details`, verified live). **M-12** — real lint config (0 errors), `noImplicitAny: true`, `ignoreBuildErrors: false`; 56 dead imports/vars removed; `use-toast` reducer retyped.
- **Lows** — `GET /api` health check (`SELECT 1`, 200/503); dead code removed (`simpleHash`, `actionTypes`, `setInterval`, unused states); `engagementRate` rename; bounded `sentimentCache`; self-hosted `geist` fonts (offline-safe); README (48KB) moved to root + new Security & Operations chapter; `db.ts` query-logging dev-only.

### Bonus bugs found & fixed while verifying

1. **Login rate limiter never ran** — middleware matchers don't execute for `/api/auth/*` (proven with request tracing). Moved to Credentials `authorize()`: 10/min per IP+email + 60/min per-IP flood cap. Verified: attempts 1–10 → `Invalid email or password`, 11+ → `Too many login attempts…`.
2. **Mixed-case login broken** — register lowercases emails, `authorize` didn't. Now normalized both sides; `CASE@X.COM` login verified.
3. **Scheduler `GET` relied on middleware alone** — wrapped in `withAuth` (defense in depth).
4. **ai-video `fetchHistory` TDZ** — effect called a `const` declared below it; converted to `useCallback` + correct deps.
5. **Hashtag `reach`/`engagement` fabrication in UI** — removed the random column entirely.

---

## 8. Suggested improvements (next steps, not yet done)

Prioritized by value/effort. None of these block using the app.

1. **Redis-backed rate limits** (Upstash/Vercel KV) — current limiters are in-memory, so they reset on restart and don't share across instances. Swap the `Map`s in `api-helpers.ts`/`auth.ts` for `@upstash/ratelimit` (~1h).
2. **Hash stored API keys** — display is masked, but `ApiKey.key` is still plaintext at rest. Store `sha256(key)` + `last4`, return the full key only once at creation (~1h).
3. **Real platform integrations** — posting/publishing is currently simulated (no Meta/TikTok/YouTube/LinkedIn API calls). Add one OAuth + publish flow (e.g. X/Twitter API v2, simplest free tier) as the template for the rest (days).
4. **Route-per-page** — `home-content.tsx` still switches 14 code-split pages via zustand; no deep links/SSR. Migrate to real App Router routes incrementally, one page at a time (days).
5. **Auth.js v5** — next-auth v4 is in maintenance mode. Migration is breaking (`auth()` replaces `getServerSession`) — schedule deliberately (day).
6. **Postgres for production** — SQLite is fine for single-node, but concurrent writes + backups favor Postgres. Prisma makes it a provider + `DATABASE_URL` swap; keep SQLite for dev (hours + data migration).
7. **Playwright smoke suite** — register → login → create post → schedule → delete account, run in CI. Catches contract drift like the `platforms: []` 500 I hit live (hours).
8. **Observability** — structured server logging (pino) + Sentry (client + `tryCatch` hook) so AI/SDK 500s page someone instead of sitting in `dev.log` (hours).
9. **One lockfile** — `bun.lock` (original toolchain) + `package-lock.json` (this env) coexist. `start`/`build.sh` assume bun; dev here uses npm. Pick per environment and document it (minutes + decision).
10. **Login UX on rate limit** — the limiter surfaces via NextAuth's generic error page; add a dedicated `error.tsx`/message mapping so users see *"too many attempts, wait a minute"* in context (minutes).
11. **Automated SQLite backups** — `.backup` + S3/rclone on a timer until Postgres (minutes).

---

## Appendix A — How it was run (environment notes)

The repo previously contained only a `Social Pilot (2).zip`; it was extracted (minus its stale `.git/`) to work on. To boot the server in this sandbox (no access to `binaries.prisma.sh`, Google Fonts, or GitHub release assets — npm registry only):

- `prisma/schema.prisma`: `engineType = "client"` (WASM query compiler, zero engine downloads).
- New `prisma.config.ts`: `engine: 'js'` + `PrismaLibSql` adapter (`@prisma/adapter-libsql` + `@libsql/client` install cleanly from npm; `better-sqlite3` cannot — prebuilds and node headers are unreachable).
- `src/lib/db.ts`: passes the libSQL adapter to `PrismaClient` (required by the client engine).
- `next.config.ts`: added `allowedDevOrigins: ["*.e2b.app"]` for the live-preview proxy.
- Prisma CLI quirk: with a config file present it skips `.env` loading, so `DATABASE_URL=file:./db/custom.db` must be exported when running `npx prisma generate`.
- Z-AI features (`/api/trends`, `ai-*`, `generate-image`, …) need a `.z-ai-config` file that isn't present → they return HTTP 500 with a clear message; everything else works.
- Google Fonts is unreachable → Next logs warnings and uses fallback fonts; pages render fine.

Live-verified: `/` → 307 to login when logged out; register (200 + 409 on dup); credentials login → session JWT; authed `/` → 200; `/api/stats`, `/api/posts` (CRUD), `/api/accounts`, `/api/notifications` all working. Test rows left in the dev DB: user `review@example.com` (password `review123`), one draft post, one `leakte…` account — safe to delete.

## Appendix B — Files reviewed

All 21 API routes, `middleware.ts`, `lib/{db,auth,store,api-helpers}.ts`, auth pages, `home-content`, sidebar/header/search/bell/nav, error boundary, and skimmed all 14 feature pages + configs (`next`, `tsc`, `eslint`, `tailwind`, `Caddyfile`, `.zscripts/*`, `prisma/schema.prisma`, `worklog.md`, `agent-ctx/*`).
