# SocialPilot — Social Media Management Platform

> A comprehensive, AI-powered social media management platform for scheduling posts, analyzing competitors, discovering trends, automating engagement, and generating content — all from a single dashboard.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?logo=tailwindcss)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-New%20York-18181B)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Database Setup](#database-setup)
  - [Running the App](#running-the-app)
  - [Seeding Demo Data](#seeding-demo-data)
- [Platform Pages](#platform-pages)
- [AI-Powered Features](#ai-powered-features)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Posts](#posts)
  - [Accounts](#accounts)
  - [Comments](#comments)
  - [Campaigns](#campaigns)
  - [Trends & Discovery](#trends--discovery)
  - [AI Tools](#ai-tools)
  - [Content Protection](#content-protection)
  - [Scheduler](#scheduler)
  - [Settings & Notifications](#settings--notifications)
  - [File Upload](#file-upload)
- [Database Schema](#database-schema)
  - [Entity Relationship Overview](#entity-relationship-overview)
  - [Models](#models)
- [State Management](#state-management)
- [Authentication & Authorization](#authentication--authorization)
- [Theming](#theming)
- [Deployment](#deployment)
- [Scripts Reference](#scripts-reference)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

SocialPilot is a full-stack social media management platform built with modern web technologies. It provides a unified interface for managing multiple social media accounts, scheduling and publishing content, discovering trends, analyzing competitors, automating engagement campaigns, and leveraging AI to generate high-quality content and optimize posting strategies.

The platform is designed as a **single-page application (SPA)** within a Next.js framework, using client-side page routing via Zustand state management for instant navigation between sections. It combines the SEO benefits of server-side rendering with the fluid UX of a traditional SPA.

### Highlights

- **14 feature-rich pages** covering every aspect of social media management
- **Real AI integration** via `z-ai-web-dev-sdk` for content generation, sentiment analysis, scheduling optimization, image generation, and video thumbnails
- **Real web search** for trend discovery, competitor analysis, and copyright scanning
- **NextAuth.js** authentication with JWT sessions and bcrypt password hashing
- **Prisma ORM** with SQLite for reliable data persistence
- **24 API routes** providing full CRUD operations plus AI-powered endpoints
- **Responsive design** with a collapsible sidebar on desktop and bottom navigation on mobile
- **Dark/light theme** with a complete oklch color system
- **Global search** (Cmd+K) across posts, campaigns, competitors, and hashtags
- **Real-time notifications** with auto-refresh and categorized alert system

---

## Key Features

### Content Management

| Feature | Description |
|---------|-------------|
| **Auto Poster** | Compose, schedule, and publish posts to multiple social media platforms. Supports rich text editing, media uploads (images/videos), platform selection, tag management, and status tracking (draft / scheduled / published / failed). |
| **Content Calendar** | Visual drag-and-drop calendar view of all scheduled and published posts. Filter by platform, view daily/weekly/monthly layouts, and manage post scheduling at a glance. |
| **AI Writer Studio** | Generate multiple social media content variations using AI. Supports tone adjustment, platform-specific formatting, content length control, and one-click copy-to-clipboard. Produces 3 variations per request for A/B testing. |
| **AI Video Generator** | Generate video thumbnails and concept visuals using AI image generation. Manage media projects with status tracking and preview capabilities. |

### Engagement & Automation

| Feature | Description |
|---------|-------------|
| **Comments Manager** | Centralized inbox for all social media comments. Features AI sentiment analysis, AI-powered reply generation, read/replied status tracking, and batch archive capabilities. |
| **Auto Liker** | Create and manage engagement automation campaigns (auto-like, auto-follow, auto-comment, auto-view). Configure target counts, platform filters, and real-time progress tracking. |
| **Scheduler** | Background job processing system with manual and cron-based triggers. Handles scheduled post publishing, campaign execution, and trend data refresh with rate limiting. |

### Discovery & Intelligence

| Feature | Description |
|---------|-------------|
| **Trend Discovery** | Real-time web search integration for discovering viral trends, popular topics, and emerging content. Save and organize trend results by query and platform. |
| **Competitor Analysis** | Track competitor social media accounts with metrics including followers, engagement rate, growth rate, posting frequency, and optimal posting times. Enriches data via web search. |
| **Hashtag Research** | Research hashtags by category, check for banned/restricted hashtags, and save curated hashtag sets. Provides reach estimates and platform-specific recommendations. |

### Protection & Security

| Feature | Description |
|---------|-------------|
| **Content Shield** | Register original content and scan the web for copyright violations. Uses web search to find matching content, calculates similarity scores, and tracks match status (pending / confirmed / dismissed). |

### Account & System

| Feature | Description |
|---------|-------------|
| **Account Management** | Connect and manage social media accounts across Instagram, Twitter, Facebook, TikTok, YouTube, and LinkedIn. View follower counts, engagement metrics, and connection status. |
| **Settings** | User profile management, notification preferences, appearance settings (theme), API key configuration, and data management (clear all data). |
| **Dashboard** | Real-time analytics overview with total followers, posts, engagement rate, and growth metrics across all connected accounts. Includes platform breakdown charts and recent activity feed. |
| **Video Editor** | Media project management for video editing workflows. Upload, organize, and track video content with status indicators and thumbnail previews. |
| **Global Search** | Command palette (Cmd+K) for instant search across posts, campaigns, competitors, and hashtags. Maintains recent search history in localStorage. |
| **Notifications** | Real-time notification system with color-coded categories (post, comment, campaign, trend, system). Auto-refreshes every 30 seconds with unread badge counts. |

---

## Tech Stack

### Core Framework

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16.x | React framework with App Router, API routes, standalone output |
| **React** | 19.x | UI library with concurrent features |
| **TypeScript** | 5.x | Type-safe JavaScript |

### Database & ORM

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Prisma** | 6.x | Type-safe ORM with schema-first approach |
| **SQLite** | — | Embedded database (file-based, zero config) |

### Styling & UI

| Technology | Purpose |
|-----------|---------|
| **Tailwind CSS** v4 | Utility-first CSS framework |
| **shadcn/ui** | 30+ accessible UI components (Radix UI primitives) |
| **Lucide React** | Icon library (500+ icons) |
| **Framer Motion** | Smooth animations and transitions |
| **next-themes** | Dark/light theme management |
| **Geist Fonts** | Modern sans-serif and monospace typefaces |

### State & Data

| Technology | Purpose |
|-----------|---------|
| **Zustand** | Lightweight state management (SPA page routing, app state) |
| **React Query** | Server state management, caching, background refetch |
| **date-fns** | Date manipulation and formatting |

### AI & Search

| Technology | Purpose |
|-----------|---------|
| **z-ai-web-dev-sdk** | AI chat completions, image generation, web search |
| **Sharp** | Image processing and thumbnail generation |

### Forms & Validation

| Technology | Purpose |
|-----------|---------|
| **React Hook Form** | Performant form management |
| **Zod** | Schema-based validation |
| **Hookform Resolvers** | Zod integration for React Hook Form |

### Developer Tools

| Technology | Purpose |
|-----------|---------|
| **Bun** | Fast JavaScript package manager and runtime |
| **ESLint** | Code linting |
| **CMDK** | Command palette component (used for global search) |
| **dnd-kit** | Drag and drop functionality |
| **Sonner** | Toast notification system |
| **Recharts** | Charting library for dashboard analytics |
| **MDXEditor** | Rich text / markdown editor |
| **Embla Carousel** | Carousel/slider component |

---

## Architecture

### Design Patterns

SocialPilot uses a **hybrid SPA + SSR architecture** within Next.js:

1. **Server-Side**: Next.js App Router provides the initial HTML shell, authentication middleware, and all API route handlers.

2. **Client-Side SPA**: Once loaded, the application navigates between pages using Zustand's `currentPage` state — no full page reloads, no URL changes. The `HomeContent` component acts as a client-side router with a `switch` statement that renders the appropriate page component.

3. **Data Flow**: Pages fetch data from API routes using React Query or direct `fetch()` calls. API routes interact with the database via Prisma ORM and with AI services via `z-ai-web-dev-sdk`.

### Request Flow

```
Browser
  │
  ├── Initial Load ──→ Next.js SSR ──→ layout.tsx (Providers, Fonts, Theme)
  │                                        │
  │                                        ▼
  │                                   HomeContent (SPA Router)
  │                                        │
  │                                        ├── Zustand: currentPage state
  │                                        ├── Renders page component
  │                                        └── Page fetches from API routes
  │                                              │
  │                                              ├── API Route ──→ Prisma ──→ SQLite
  │                                              ├── API Route ──→ z-ai-web-dev-sdk ──→ AI/LLM
  │                                              └── API Route ──→ z-ai-web-dev-sdk ──→ Web Search
  │
  └── API Calls ──→ Next.js API Routes ──→ (same as above)
```

### Authentication Flow

```
Login Request
  │
  ▼
POST /api/auth/[...nextauth]
  │
  ├── Credentials Provider validates email/password
  │     │
  │     ├── bcrypt.compare(password, hash)
  │     └── Returns user object (without password)
  │
  ├── JWT Strategy creates session token
  │
  └── Client stores session (HTTP-only cookie)

Protected Route Access
  │
  ▼
middleware.ts (NextAuth withAuth)
  │
  ├── Checks session validity
  │     ├── Valid → Allow access
  │     └── Invalid → Redirect to /auth/login
  │
  └── API routes use withAuth() helper
        └── Verifies session, attaches user to request
```

### Layer Architecture

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **Presentation** | React Components + shadcn/ui | UI rendering, user interactions, animations |
| **State** | Zustand + React Query | Client state (navigation), server state caching |
| **API** | Next.js Route Handlers | Business logic, validation, auth checks |
| **Data Access** | Prisma ORM | Type-safe database queries, migrations |
| **Storage** | SQLite | Persistent data storage |
| **External** | z-ai-web-dev-sdk | AI completions, image generation, web search |

---

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts, Providers, Toaster)
│   ├── page.tsx                  # SPA entry point (dynamic import HomeContent)
│   ├── globals.css               # Global styles (Tailwind v4, oklch colors)
│   ├── auth/
│   │   ├── login/page.tsx        # Login page (credentials, password toggle)
│   │   └── register/page.tsx     # Registration page (name/email/password)
│   └── api/                      # API route handlers (24 routes)
│       ├── auth/
│       │   ├── [...nextauth]/route.ts   # NextAuth handler (JWT + Credentials)
│       │   ├── register/route.ts        # User registration
│       │   └── profile/route.ts         # Profile CRUD
│       ├── posts/route.ts               # Post CRUD
│       ├── accounts/route.ts            # Social account CRUD
│       ├── comments/route.ts            # Comments + AI sentiment
│       ├── campaigns/route.ts           # Campaign CRUD
│       ├── notifications/route.ts       # Notification management
│       ├── stats/route.ts               # Dashboard analytics
│       ├── media/route.ts               # Media project listing
│       ├── settings/route.ts            # User settings
│       ├── seed/route.ts                # Database seeder
│       ├── ai-writer/route.ts           # AI content generation
│       ├── ai-reply/route.ts            # AI comment reply
│       ├── ai-video/route.ts            # AI video thumbnail
│       ├── ai-schedule/route.ts         # AI scheduling suggestions
│       ├── generate-image/route.ts      # AI image generation
│       ├── trends/route.ts              # Web search trends
│       ├── hashtags/route.ts            # Hashtag research
│       ├── competitors/route.ts         # Competitor tracking
│       ├── copyright/route.ts           # Content Shield
│       ├── upload/route.ts              # File upload handler
│       ├── scheduler/route.ts           # Manual scheduler trigger
│       └── scheduler/cron/route.ts      # External cron endpoint
│
├── components/
│   ├── app-sidebar.tsx           # Main sidebar navigation (collapsible, 4 sections)
│   ├── page-header.tsx           # Breadcrumb header + search trigger
│   ├── home-content.tsx          # SPA page router (switch on currentPage)
│   ├── mobile-nav.tsx            # Bottom tab bar (mobile < 768px)
│   ├── global-search.tsx         # Cmd+K command palette
│   ├── notification-bell.tsx     # Notification popover (color-coded, auto-refresh)
│   ├── auth-guard.tsx            # Client-side auth redirect
│   ├── error-boundary.tsx        # Error boundary with retry
│   ├── providers.tsx             # SessionProvider + ThemeProvider wrapper
│   ├── theme-provider.tsx        # next-themes wrapper
│   ├── ui/                       # 30+ shadcn/ui components
│   │   ├── accordion.tsx
│   │   ├── alert.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── aspect-ratio.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── breadcrumb.tsx
│   │   ├── button.tsx
│   │   ├── calendar.tsx
│   │   ├── card.tsx
│   │   ├── carousel.tsx
│   │   ├── chart.tsx
│   │   ├── checkbox.tsx
│   │   ├── collapsible.tsx
│   │   ├── command.tsx
│   │   ├── context-menu.tsx
│   │   ├── dialog.tsx
│   │   ├── drawer.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── form.tsx
│   │   ├── hover-card.tsx
│   │   ├── input.tsx
│   │   ├── input-otp.tsx
│   │   ├── label.tsx
│   │   ├── menubar.tsx
│   │   ├── navigation-menu.tsx
│   │   ├── pagination.tsx
│   │   ├── popover.tsx
│   │   ├── progress.tsx
│   │   ├── resizable.tsx
│   │   ├── scroll-area.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   ├── sidebar.tsx
│   │   ├── skeleton.tsx
│   │   ├── slider.tsx
│   │   ├── sonner.tsx
│   │   ├── switch.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── toggle.tsx
│   │   ├── toggle-group.tsx
│   │   ├── toast.tsx
│   │   ├── toaster.tsx
│   │   └── tooltip.tsx
│   │
│   ├── dashboard/                # Dashboard analytics page
│   │   └── dashboard-page.tsx
│   ├── poster/                   # Auto Poster page
│   │   └── poster-page.tsx
│   ├── calendar/                 # Content Calendar page
│   │   └── calendar-page.tsx
│   ├── comments/                 # Comments Manager page
│   │   └── comments-page.tsx
│   ├── liker/                    # Auto Liker page
│   │   └── liker-page.tsx
│   ├── video-editor/             # Video Editor page
│   │   └── video-page.tsx
│   ├── ai-video/                 # AI Video Generator page
│   │   └── ai-video-page.tsx
│   ├── accounts/                 # Account Management page
│   │   └── accounts-page.tsx
│   ├── competitor/               # Competitor Analysis page
│   │   └── competitor-page.tsx
│   ├── copyright/                # Content Shield page
│   │   └── copyright-page.tsx
│   ├── trends/                   # Trend Discovery page
│   │   └── trends-page.tsx
│   ├── hashtags/                 # Hashtag Research page
│   │   └── hashtags-page.tsx
│   ├── ai-writer/                # AI Writer Studio page
│   │   └── ai-writer-page.tsx
│   └── settings/                 # Settings page
│       └── settings-page.tsx
│
├── lib/
│   ├── db.ts                     # Prisma singleton client
│   ├── auth.ts                   # NextAuth configuration (JWT + Credentials)
│   ├── store.ts                  # Zustand store (page state + TypeScript interfaces)
│   ├── api-helpers.ts            # tryCatch, validateBody, withAuth, rateLimit
│   └── utils.ts                  # cn() utility (clsx + tailwind-merge)
│
├── hooks/
│   ├── use-toast.ts              # Toast hook with reducer pattern
│   └── use-mobile.ts             # Mobile breakpoint detection (768px)
│
└── middleware.ts                 # NextAuth route protection middleware

prisma/
└── schema.prisma                 # Database schema (14 models)

public/
├── logo.svg                      # Application logo
└── robots.txt                    # Search engine directives

db/
└── custom.db                     # SQLite database file (auto-generated)
```

---

## Getting Started

### Prerequisites

| Requirement | Minimum Version |
|------------|----------------|
| **Node.js** | 18.x or later |
| **Bun** | Latest (recommended) or npm/yarn/pnpm |
| **Git** | For cloning the repository |

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd socialpilot

# 2. Install dependencies
bun install
# or: npm install

# 3. Generate Prisma client
bun run db:generate
# or: npx prisma generate

# 4. Push database schema
bun run db:push
# or: npx prisma db push

# 5. Start the development server
bun run dev
# or: npm run dev
```

The application will be available at **http://localhost:3000**.

### Environment Configuration

Create a `.env` file in the project root (if not already present):

Copy `.env.example` to `.env` and fill in the secrets:

```bash
cp .env.example .env
```

```env
# Database
DATABASE_URL="file:./db/custom.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate-with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\">"

# Scheduler cron (external cron services calling GET /api/scheduler/cron)
CRON_SECRET="<generate-another-32-byte-hex>"

# AI SDK (z-ai-web-dev-sdk — auto-configured)
# No additional environment variables required for the AI SDK.
# The SDK handles authentication internally.
```

> **Note:** The `z-ai-web-dev-sdk` is pre-installed and auto-configured. No API keys are needed for AI features to work in the development environment.

### Database Setup

SocialPilot uses **SQLite** with Prisma ORM. The database file is stored at `db/custom.db`.

```bash
# Push the Prisma schema to the database (creates tables)
bun run db:push

# Generate the Prisma client (TypeScript types)
bun run db:generate

# Run migrations (alternative to db:push for production)
bun run db:migrate

# Reset the database (WARNING: deletes all data)
bun run db:reset
```

### Running the App

```bash
# Development mode (hot reload)
bun run dev

# Production build
bun run build

# Start production server
bun run start
```

### Seeding Demo Data

To populate the database with demo data for testing and development:

```bash
# Unauthenticated only on a fresh database (zero users) to bootstrap the demo
# account; afterwards it requires a signed-in session. Safe to re-run
# (idempotent — existing rows are reused, never duplicated).
curl -X POST http://localhost:3000/api/seed
```

This creates (demo password: `Demo1234!`):

| Entity | Count | Details |
|--------|-------|---------|
| **User** | 1 | `demo@socialtool.com` / "Demo User" |
| **Social Accounts** | 6 | Instagram (125.4K), Twitter (83.2K), Facebook (45.6K), TikTok (312K), YouTube (27.8K), LinkedIn (15.4K) |
| **Posts** | 6 | Various statuses: draft, scheduled, published, failed |
| **Comments** | 5 | Mixed read/unread/replied states with sentiment labels |
| **Campaigns** | 3 | 2 active (auto-like, auto-follow), 1 completed |
| **Notifications** | 7 | Post, comment, campaign, trend, and system types |
| **Settings** | 1 | Default user settings profile |
| **API Key** | 1 | Development API key |

---

## Platform Pages

The application consists of **14 pages** organized into 5 navigation sections:

### Main

| Page | Route Key | Description |
|------|-----------|-------------|
| **Dashboard** | `dashboard` | Analytics overview — total followers, posts, engagement rate, growth metrics, platform breakdown, recent activity feed, and trend charts |
| **Auto Poster** | `poster` | Compose and manage social media posts — rich text editor, media upload, platform selection, scheduling, status tracking, tag management |
| **Content Calendar** | `calendar` | Visual calendar of all posts — daily/weekly/monthly views, drag-and-drop scheduling, platform filtering |
| **Comments** | `comments` | Centralized comment inbox — AI sentiment analysis, AI reply generation, read/replied status, batch archive |

### Engage & Discover

| Page | Route Key | Description |
|------|-----------|-------------|
| **Auto Liker** | `liker` | Engagement automation — create campaigns for auto-like, auto-follow, auto-comment, auto-view with progress tracking |
| **Trend Discovery** | `trends` | Real-time trend search — web search for viral content, save and organize results by platform |
| **Competitor Analysis** | `competitor` | Competitor tracking — follower metrics, engagement rates, growth analysis, web-enriched data |
| **Hashtag Research** | `hashtags` | Hashtag discovery — search by category, banned hashtag checker, save curated sets with reach estimates |

### AI Tools

| Page | Route Key | Description |
|------|-----------|-------------|
| **AI Writer Studio** | `ai-writer` | AI content generation — generates 3 content variations per request, tone adjustment, platform-specific formatting |
| **AI Video Generator** | `ai-video` | AI-powered visuals — generate thumbnails and concept images, media project management |
| **Video Editor** | `video` | Video project management — upload, organize, and track video content with thumbnails |

### Manage

| Page | Route Key | Description |
|------|-----------|-------------|
| **Accounts** | `accounts` | Social account management — connect/disconnect platforms, view metrics (followers, following, posts) |
| **Content Shield** | `copyright` | Copyright protection — register content, scan web for violations, similarity scoring |

### System

| Page | Route Key | Description |
|------|-----------|-------------|
| **Settings** | `settings` | User configuration — profile, notifications, appearance, API keys, data management |

---

## AI-Powered Features

SocialPilot integrates AI capabilities through the `z-ai-web-dev-sdk` package. All AI features run server-side in API routes.

### AI Content Generation (AI Writer)

**Endpoint:** `POST /api/ai-writer`

Generates three unique social media content variations based on the user's topic, platform, and tone preferences. The AI adapts writing style to the target platform (Instagram captions, Twitter threads, LinkedIn articles, etc.) and supports tones like professional, casual, humorous, inspirational, and urgent.

### AI Comment Replies

**Endpoint:** `POST /api/ai-reply`

Analyzes incoming comments and generates contextually appropriate replies. Considers the comment's sentiment (positive, negative, neutral) and the original post content to craft responses that maintain brand voice.

### AI Sentiment Analysis

**Endpoint:** `PATCH /api/comments` (includes sentiment in response)

Automatically analyzes comment sentiment using AI language understanding. Labels include: positive, negative, neutral, and mixed. Enables bulk sentiment classification across all comments.

### AI Scheduling Optimization

**Endpoint:** `POST /api/ai-schedule`

Recommends optimal posting times based on account data, platform patterns, and content type. Provides reasoning for each suggestion to help users make informed scheduling decisions.

### AI Image Generation

**Endpoint:** `POST /api/generate-image`

Generates images from text prompts using AI. Supports social media post images, thumbnails, and visual content. Images are processed with Sharp for optimization and thumbnail creation.

### AI Video Thumbnails

**Endpoint:** `POST /api/ai-video`

Generates video thumbnail concepts using AI image generation. Creates visually appealing thumbnails optimized for video platform requirements.

### Web Search Integration

**Endpoints:** `POST /api/trends`, `POST /api/hashtags`, `POST /api/competitors`, `POST /api/copyright`

Uses real-time web search to discover trends, research hashtags, enrich competitor data, and scan for copyright violations. Returns structured search results with URLs, titles, and snippets.

---

## API Reference

All API routes are prefixed with `/api/`. A signed-in session is required for every
endpoint except `/api/auth/*` (login/register), `GET /api` (health check), and
`POST /api/seed` (public only while the database has zero users; authenticated
after that). Mutating schedulers additionally accept the `CRON_SECRET`.

### Authentication

#### `POST /api/auth/[...nextauth]`

NextAuth handler for login, session management, and logout.

**Login Request:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response:** Sets HTTP-only session cookie. Returns user object (without password).

#### `POST /api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "id": "clx...",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "createdAt": "2025-01-15T10:30:00Z"
}
```

#### `GET /api/auth/profile`

Get the authenticated user's profile.

#### `PATCH /api/auth/profile`

Update the authenticated user's profile (name, bio, avatar, timezone).

---

### Posts

#### `GET /api/posts`

List all posts with optional filtering.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | `string` | Filter by status: `draft`, `scheduled`, `published`, `failed` |
| `platform` | `string` | Filter by platform name |

#### `POST /api/posts`

Create a new post.

**Request Body:**
```json
{
  "content": "Your post content here...",
  "platforms": ["instagram", "twitter"],
  "mediaUrl": "/uploads/image-123.jpg",
  "mediaType": "image",
  "status": "draft",
  "scheduledAt": "2025-01-20T14:00:00Z",
  "tags": ["marketing", "socialmedia"]
}
```

#### `PUT /api/posts`

Update an existing post.

#### `DELETE /api/posts?id=<postId>`

Delete a post and its associated tags and comments (cascade).

---

### Accounts

#### `GET /api/accounts`

List all connected social media accounts.

#### `POST /api/accounts`

Connect a new social media account.

**Request Body:**
```json
{
  "platform": "instagram",
  "username": "mybrand",
  "displayName": "My Brand",
  "avatar": "https://example.com/avatar.jpg",
  "accessToken": "platform_oauth_token"
}
```

#### `PUT /api/accounts`

Update account details or connection status.

#### `DELETE /api/accounts?id=<accountId>`

Disconnect a social media account.

---

### Comments

#### `GET /api/comments`

List comments with optional filtering.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `postId` | `string` | Filter by post ID |
| `platform` | `string` | Filter by platform |
| `isRead` | `boolean` | Filter by read status |

#### `POST /api/comments`

Create a new comment (or add a comment to a post).

#### `PATCH /api/comments`

Reply to a comment. Sends the comment to AI for sentiment analysis and generates a suggested reply.

**Request Body:**
```json
{
  "id": "comment_id",
  "reply": "Thank you for your feedback!"
}
```

**Response includes:**
- `sentiment`: AI-detected sentiment (positive/negative/neutral)
- `aiReply`: AI-suggested reply

#### `DELETE /api/comments?id=<commentId>`

Delete a comment.

---

### Campaigns

#### `GET /api/campaigns`

List all engagement campaigns.

#### `POST /api/campaigns`

Create a new campaign.

**Request Body:**
```json
{
  "name": "Instagram Growth Campaign",
  "type": "like",
  "platforms": ["instagram"],
  "targetCount": 500,
  "rules": {
    "maxPerDay": 100,
    "minFollowers": 100,
    "excludePrivate": true
  }
}
```

**Campaign Types:** `like`, `follow`, `comment`, `view`

#### `PATCH /api/campaigns`

Update campaign settings or manually adjust progress.

#### `DELETE /api/campaigns?id=<campaignId>`

Delete a campaign.

---

### Trends & Discovery

#### `POST /api/trends`

Search for trending topics using web search.

**Request Body:**
```json
{
  "query": "social media marketing trends 2025",
  "platform": "all"
}
```

**Response:** Array of search results saved to `TrendResult` in the database.

#### `GET /api/hashtags?search=<query>`

Search for hashtags and check for banned/restricted ones.

#### `POST /api/hashtags`

Save a curated hashtag set.

**Request Body:**
```json
{
  "name": "Marketing Set",
  "hashtags": "#marketing #socialmedia #digitalmarketing #growthhacking",
  "platform": "instagram"
}
```

#### `DELETE /api/hashtags?id=<setId>`

Delete a saved hashtag set.

#### `GET /api/competitors`

List all tracked competitors.

#### `POST /api/competitors`

Add a new competitor to track. Uses web search to enrich data.

**Request Body:**
```json
{
  "name": "Competitor Brand",
  "platform": "instagram",
  "handle": "@competitorbrand"
}
```

#### `DELETE /api/competitors?id=<competitorId>`

Stop tracking a competitor.

---

### AI Tools

#### `POST /api/ai-writer`

Generate AI social media content.

**Request Body:**
```json
{
  "topic": "Product launch announcement",
  "platform": "instagram",
  "tone": "professional",
  "length": "medium"
}
```

**Response:** Returns 3 content variations.

#### `POST /api/ai-reply`

Generate an AI reply to a comment.

**Request Body:**
```json
{
  "comment": "This product looks amazing! When does it launch?",
  "postContent": "We're excited to announce our new product...",
  "sentiment": "positive"
}
```

#### `POST /api/ai-schedule`

Get AI-powered posting time suggestions.

**Request Body:**
```json
{
  "platform": "instagram",
  "contentType": "image",
  "audience": "global"
}
```

**Response:** Array of suggested posting times with reasoning.

#### `POST /api/generate-image`

Generate an AI image.

**Request Body:**
```json
{
  "prompt": "A professional product photo of a smartphone on a clean desk",
  "width": 1024,
  "height": 1024
}
```

**Response:** Returns the image URL and thumbnail path. Image is saved to disk and processed with Sharp.

#### `POST /api/ai-video`

Generate an AI video thumbnail.

**Request Body:**
```json
{
  "prompt": "Cinematic thumbnail for a tech review video",
  "projectName": "iPhone 16 Review"
}
```

**Response:** Creates a `MediaProject` with the generated thumbnail.

---

### Content Protection

#### `GET /api/copyright`

List all registered copyright content and matches.

#### `POST /api/copyright`

Register new content for copyright protection.

**Request Body:**
```json
{
  "name": "Brand Campaign Video",
  "type": "video",
  "content": "Original content text or URL to register...",
  "sourceUrl": "https://example.com/original-content"
}
```

#### `PATCH /api/copyright`

Trigger a web search scan for a registered content. Updates match records with similarity scores.

#### `DELETE /api/copyright?id=<contentId>`

Remove registered content and its matches.

---

### Scheduler

#### `POST /api/scheduler`

Manually trigger the scheduler to process pending jobs.

**Request Body:**
```json
{
  "type": "posts"
}
```

**Job Types:** `posts` (publish scheduled posts), `campaigns` (run active campaigns), `trends` (refresh trend data)

#### `GET /api/scheduler/cron`

External cron endpoint. Processes all job types sequentially with rate limiting and error handling. Designed to be called by external cron services (e.g., Vercel Cron, AWS EventBridge).

---

### Settings & Notifications

#### `GET /api/stats?period=<period>`

Get dashboard statistics.

**Period Options:** `7d`, `30d`, `90d`

**Response:**
```json
{
  "totalFollowers": 609400,
  "totalPosts": 47,
  "engagementRate": 4.7,
  "followerGrowth": 12.3,
  "platformBreakdown": [
    { "platform": "instagram", "followers": 125400, "posts": 12, "engagement": 5.2 },
    { "platform": "twitter", "followers": 83200, "posts": 18, "engagement": 3.8 }
  ],
  "recentActivity": [...]
}
```

#### `GET /api/notifications`

List notifications for the authenticated user. Includes read/unread status and categorization.

#### `POST /api/notifications`

Create a new notification.

#### `PATCH /api/notifications`

Mark a notification as read, or mark all as read.

#### `GET /api/settings`

Get all user settings (profile, notifications, appearance, API keys).

#### `POST /api/settings`

Update user settings.

#### `DELETE /api/settings`

Clear all user data (posts, comments, campaigns, accounts, etc.).

#### `GET /api/media`

List all media projects.

---

### File Upload

#### `POST /api/upload`

Upload a file (image or video).

**Accepted Formats:** PNG, JPG, GIF, WebP, MP4, MOV, WebM
**Maximum Size:** 50MB
**Processing:** Images are processed with Sharp to generate thumbnails. Videos store metadata.

**Request:** `multipart/form-data` with a `file` field.

**Response:**
```json
{
  "url": "/uploads/image-abc123.jpg",
  "thumbnailUrl": "/uploads/thumbs/image-abc123.jpg",
  "type": "image",
  "size": 245678
}
```

---

## Database Schema

### Entity Relationship Overview

```
User ─────────┬──────── SocialAccount ────── Post ────── PostTag
              │                                      │
              │                                      └───── Comment
              │
              ├──────── Post
              │
              └──────── Notification

CopyrightContent ────── CopyrightMatch
Campaign (standalone)
MediaProject (standalone)
Competitor (standalone)
HashtagSet (standalone)
TrendResult (standalone)
ScheduledJob (standalone)
```

### Models

#### User

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `email` | `String` | `@unique` | User email |
| `name` | `String` | | Display name |
| `password` | `String` | | Bcrypt-hashed password |
| `avatar` | `String?` | | Profile image URL |
| `role` | `String` | `@default("user")` | User role |
| `apiKey` | `String?` | | API key for external access |
| `bio` | `String?` | | User biography |
| `timezone` | `String` | `@default("UTC")` | Timezone |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Last update timestamp |

**Relations:** `SocialAccount[]`, `Post[]`, `Notification[]`

#### SocialAccount

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `userId` | `String` | | Owner user ID |
| `platform` | `String` | | Platform name (instagram, twitter, etc.) |
| `username` | `String` | | Platform username/handle |
| `displayName` | `String` | | Display name on platform |
| `avatar` | `String` | | Profile image URL |
| `accessToken` | `String?` | | OAuth access token |
| `followers` | `Int` | `@default(0)` | Follower count |
| `following` | `Int` | `@default(0)` | Following count |
| `isActive` | `Boolean` | `@default(true)` | Connection active |
| `autoPost` | `Boolean` | `@default(false)` | Auto-posting enabled |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |

**Relations:** `User`, `Post[]`

#### Post

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `userId` | `String` | | Author user ID |
| `accountId` | `String?` | | Linked social account ID |
| `platforms` | `String` | | Comma-separated platform list |
| `content` | `String` | | Post text content |
| `mediaUrl` | `String?` | | Attached media URL |
| `mediaType` | `String?` | | Media type (image, video) |
| `status` | `String` | `@default("draft")` | draft / scheduled / published / failed |
| `scheduledAt` | `DateTime?` | | Scheduled publish time |
| `publishedAt` | `DateTime?` | | Actual publish time |
| `likes` | `Int` | `@default(0)` | Like count |
| `comments` | `Int` | `@default(0)` | Comment count |
| `shares` | `Int` | `@default(0)` | Share count |
| `views` | `Int` | `@default(0)` | View count |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Last update timestamp |

**Relations:** `User`, `SocialAccount?`, `PostTag[]`, `Comment[]`

#### Comment

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `postId` | `String` | | Parent post ID |
| `author` | `String` | | Comment author name |
| `avatar` | `String` | | Author avatar URL |
| `content` | `String` | | Comment text |
| `platform` | `String` | | Source platform |
| `isRead` | `Boolean` | `@default(false)` | Read status |
| `isReplied` | `Boolean` | `@default(false)` | Reply status |
| `reply` | `String?` | | Reply text |
| `sentiment` | `String?` | | AI-detected sentiment |
| `archived` | `Boolean` | `@default(false)` | Archived status |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |

**Relations:** `Post` (cascade delete)

#### Campaign

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `name` | `String` | | Campaign name |
| `type` | `String` | | like / follow / comment / view |
| `platforms` | `String` | | Target platforms |
| `targetCount` | `Int` | | Target engagement count |
| `currentCount` | `Int` | `@default(0)` | Current progress |
| `status` | `String` | `@default("active")` | active / paused / completed |
| `rules` | `String` | | JSON string of campaign rules |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Last update timestamp |

#### CopyrightContent

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `name` | `String` | | Content identifier |
| `type` | `String` | | text / image / video |
| `fingerprint` | `String` | | Content fingerprint/hash |
| `sourceUrl` | `String?` | | Original content URL |
| `status` | `String` | `@default("active")` | active / archived |
| `lastScanned` | `DateTime?` | | Last scan timestamp |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |

**Relations:** `CopyrightMatch[]` (cascade delete)

#### Notification

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `userId` | `String` | | Target user ID |
| `type` | `String` | | post / comment / campaign / trend / system |
| `title` | `String` | | Notification title |
| `message` | `String` | | Notification body |
| `read` | `Boolean` | `@default(false)` | Read status |
| `link` | `String?` | | Deep link to relevant page |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |

**Relations:** `User`

#### Competitor, HashtagSet, TrendResult, ScheduledJob, MediaProject, PostTag, CopyrightMatch

These are supporting models with specialized fields for their respective features. Refer to `prisma/schema.prisma` for complete field definitions.

---

## State Management

SocialPilot uses **Zustand** for client-side state management with a minimal, focused store.

### Store Structure

```typescript
interface AppState {
  // Navigation
  currentPage: Page;
  setCurrentPage: (page: Page) => void;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}
```

### Page Type

```typescript
type Page =
  | 'dashboard'
  | 'poster'
  | 'calendar'
  | 'comments'
  | 'liker'
  | 'video'
  | 'ai-video'
  | 'accounts'
  | 'competitor'
  | 'copyright'
  | 'trends'
  | 'hashtags'
  | 'ai-writer'
  | 'settings';
```

### Exported Interfaces

The store also exports TypeScript interfaces used across the application:

- **`SocialAccount`** — Platform account data (id, platform, username, avatar, followers, etc.)
- **`Post`** — Post data (id, content, mediaUrl, status, metrics, timestamps)
- **`CommentItem`** — Comment data (id, author, content, sentiment, reply, isRead)
- **`Campaign`** — Campaign data (id, name, type, targetCount, currentCount, status)

### SPA Routing

The `HomeContent` component (`src/components/home-content.tsx`) reads `useAppStore().currentPage` and renders the corresponding page component via a `switch` statement. Navigation is triggered by sidebar clicks and mobile nav taps, which call `setCurrentPage()`.

---

## Authentication & Authorization

### Strategy

SocialPilot uses **NextAuth.js v4** with:

- **JWT Session Strategy** — Sessions are stored in encrypted HTTP-only cookies (no server-side session storage required)
- **Credentials Provider** — Email/password authentication with bcrypt hashing (12 salt rounds)

### Route Protection

| Layer | Mechanism | Coverage |
|-------|-----------|----------|
| **Server middleware** | `src/middleware.ts` — `withAuth()` from NextAuth | All routes except `/auth/*`, `/api/auth/*`, static assets |
| **Client component** | `src/components/auth-guard.tsx` | SPA pages (redirects to `/auth/login`) |
| **API helper** | `withAuth()` in `src/lib/api-helpers.ts` | API routes that require authentication |

### Registration & Login Flow

1. User registers via `POST /api/auth/register` (name, email, password)
2. Password is hashed with bcrypt (12 rounds) before storage
3. User logs in via `POST /api/auth/[...nextauth]` with credentials
4. NextAuth validates credentials against the database
5. On success, a JWT is created and stored in an HTTP-only cookie
6. Subsequent requests include the session cookie automatically

### Demo Access

After seeding the database (`POST /api/seed`), you can log in with:

```
Email: demo@socialtool.com
Password: Demo1234!
```

---

## Security & Operations

### Data isolation

Every data model (`Post`, `SocialAccount`, `Campaign`, `Comment`, `Notification`,
`Setting`) carries a `userId` foreign key and all API queries are scoped to the
signed-in user — users can never read or mutate each other's data. Deleting a
user cascades to their rows; deleting a social account detaches (not deletes)
its posts by design.

### Rate limits

| Surface | Limit |
|---------|-------|
| Login (Credentials `authorize()`) | 10 req / min / IP+email, plus 60 req / min / IP flood cap |
| Registration | 10 req / 10 min / IP |
| AI generation (writer/schedule/video) | 10–20 req / hour / user |
| AI reply / image generation | 30 / 10 req / hour / user |
| Trends / hashtags / copyright / competitors | 5–15 req / 5 min / user |
| Media / settings / scheduler | 20–60 req / min / user |

### API errors & health

- All API routes return a uniform `{ error: string }` envelope with correct HTTP
  status codes (400 validation, 401 auth, 404 not found, 409 conflict, 429 rate
  limit, 500 server). Internal SDK/database details are never leaked to clients.
- `GET /api` is an unauthenticated health check (`SELECT 1` against the DB,
  `200 { status: "ok" }` or `503 { status: "error" }`) suitable for uptime
  monitors and load-balancer probes.

### Honest metrics

Dashboard and analytics never fabricate data: missing follower history renders
`n/a` instead of `0%`, unverifiable competitor figures are labelled
*Estimated*, unknown hashtag reach shows *reach unknown*, and campaign metrics
only change when real events occur.

### Quality gates

```bash
npx tsc --noEmit   # type check — must be clean
npm run lint       # eslint — 0 errors (warnings are tolerated tech debt)
npm audit          # dependency audit — 0 vulnerabilities
```

### SQLite backups

The database is a single file at `db/custom.db` (gitignored). Back it up with:

```bash
sqlite3 db/custom.db ".backup 'db/backup-$(date +%F).db'"
```

---

## Theming

### Color System

SocialPilot uses a comprehensive **oklch color system** with CSS custom properties defined in `globals.css`. Both light and dark themes are fully supported.

| Token Category | Description |
|---------------|-------------|
| **Base** | background, foreground (text) |
| **Card** | card background, card foreground |
| **Popover** | popover background, foreground |
| **Primary** | Primary action color (buttons, links, active states) |
| **Secondary** | Secondary action color |
| **Muted** | Muted backgrounds and text |
| **Accent** | Accent highlights |
| **Destructive** | Error/danger states |
| **Border, Input, Ring** | Borders, input fields, focus rings |
| **Chart (1-5)** | Five distinct chart colors |
| **Sidebar** | Dedicated sidebar color tokens |
| **Radius** | Base and variant border radii |

### Dark Mode

Dark mode is managed by `next-themes` and defaults to the system preference. Users can toggle between light, dark, and system modes in the Settings page. The `class` strategy is used, adding/removing the `dark` class on the `<html>` element.

### Fonts

- **Body Text:** Geist Sans (variable weight)
- **Code/Mono:** Geist Mono
- Both loaded from Google Fonts in the root layout

---

## Deployment

### Production Build

```bash
# 1. Install dependencies
bun install

# 2. Set environment variables
cp .env.example .env
# Edit .env with production values

# 3. Set up database
bun run db:push

# 4. Build for production
bun run build
```

The build outputs a **standalone** Next.js server at `.next/standalone/` with static assets copied in.

### Running in Production

```bash
# Start the production server
bun run start

# Server runs on port 3000 by default
# Logs output to server.log
```

### Reverse Proxy (Caddy)

A `Caddyfile` is included for reverse proxy configuration:

```
:81 {
    # Dynamic port forwarding via XTransformPort query parameter
    # Default: proxies to localhost:3000
    reverse_proxy localhost:3000
}
```

### Environment Checklist

Before deploying, ensure these environment variables are set:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite path: `file:./db/custom.db` |
| `NEXTAUTH_URL` | Yes | Application URL (e.g., `https://your-domain.com`) |
| `NEXTAUTH_SECRET` | Yes | Random string for JWT encryption (min 32 chars) |
| `CRON_SECRET` | Yes (if using cron) | 32-byte hex; sent as `x-cron-secret` header or `?secret=` query |

### Cron Setup

For scheduled post publishing and campaign execution, set up an external cron job to call:

```bash
# Header form (preferred — keeps the secret out of access logs)
curl -H "x-cron-secret: $CRON_SECRET" https://your-domain.com/api/scheduler/cron
# Query form also accepted: /api/scheduler/cron?secret=$CRON_SECRET
```

Recommended intervals:
- **Post publishing:** Every 5 minutes
- **Campaign execution:** Every 15 minutes
- **Trend refresh:** Every 6 hours

---

## Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev -p 3000` | Start development server with logging |
| `build` | `next build && cp -r ...` | Production build with standalone output |
| `start` | `bun .next/standalone/server.js` | Start production server |
| `lint` | `eslint .` | Run ESLint on all files |
| `db:push` | `prisma db push` | Push schema changes to database |
| `db:generate` | `prisma generate` | Generate Prisma client types |
| `db:migrate` | `prisma migrate dev` | Run database migrations |
| `db:reset` | `prisma migrate reset` | Reset database (destructive) |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Create a Pull Request

### Development Guidelines

- Use **TypeScript** for all new files
- Follow the existing code style (ESLint configured)
- Use **shadcn/ui** components for consistency
- Write API routes with `tryCatch()` wrapper for error handling
- Use `validateBody()` with Zod schemas for request validation
- Use `withAuth()` for protected API routes
- Test with the demo seed data before submitting PRs

---

## License

This project is licensed under the MIT License.
