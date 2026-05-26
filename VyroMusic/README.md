<div align="center">

# 🎵 Vyro Music

**AI-powered music streaming platform — built with Next.js 15 + Fastify + PostgreSQL**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Fastify](https://img.shields.io/badge/Fastify-4-white?logo=fastify)](https://fastify.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-red?logo=redis)](https://redis.io)

</div>

---

## ✨ Features

### Phase 1 — MVP (✅ Complete)
- 🔐 **JWT Auth** — register, login, access + refresh token rotation, httpOnly cookies
- 🎧 **HLS Streaming** — HLS.js player with signed stream tokens, fallback preview URLs
- 📦 **Full Catalog** — artists, albums, tracks with real cover art from CDN
- 📚 **Library** — liked songs, playlist CRUD, play history
- 🔍 **Search** — full-text search + autocomplete across tracks, albums, artists
- 🎵 **Persistent Player** — AudioEngine never unmounts across page navigation
- 🎨 **Glassmorphism UI** — cyberpunk dark theme with neon accents, framer-motion animations

### Phase 2 — AI + Social (✅ Complete)
- 🤖 **AI Recommendations** — personalised "For You" feed using genre + artist scoring
- 📻 **Radio Mode** — infinite radio from any seed track (auto-loads 30 tracks at a time)
- 🌎 **Discover Weekly** — cross-genre exploration outside user's comfort zone
- 👥 **Artist Follow** — follow/unfollow artists, follower counts, sidebar "Following" section
- 👤 **User Profile** — stats dashboard (liked songs, plays, playlists, following), genre chart, top artists
- ❤️ **Track Likes** — inline heart button on every track row with optimistic UI
- 🎙️ **Radio Engine** — zero-UI component silently appending tracks before queue runs out
- 💾 **Recommendation Cache** — 1-hour server-side cache per user per context

### Phase 3 — Scale + Monetisation (✅ Complete)
- 💳 **Stripe Billing** — free/premium/family/student subscriptions, Checkout + Customer Portal, webhook handler
- 🎤 **Synced Lyrics** — LRC karaoke-style panel, auto-scroll + real-time line highlight
- 🍎 **iTunes Live Catalog** — 90M+ songs via Apple Music API, zero signup, always up to date
- 🔍 **Advanced Search** — unified iTunes + local DB search, genre/year/sort filters, filter drawer, recent + trending searches
- 📱 **Full Mobile Optimization** — bottom nav, floating mini player, full-screen now-playing, 44px touch targets
- 🎨 **Premium UI/UX** — shimmer skeletons, toast notifications, glassmorphism polish, micro-interactions
- ♿ **Accessibility** — focus-visible states, reduced-motion support, semantic HTML, aria labels
- 🔎 **Elasticsearch** — semantic search, genre filters, year range (🔄 Planned)
- 📊 **ClickHouse** — analytics pipeline (play events at scale) (🔄 Planned)
- ☁️ **S3 + CloudFront** — real HLS audio delivery pipeline (🔄 Planned)
- 📱 **React Native** — iOS + Android app sharing the same API (🔄 Planned)

---

## 🏗️ Architecture

```
VyroMusic/
├── apps/
│   ├── api/                    # Fastify REST API (port 3006)
│   │   └── src/
│   │       ├── db/             # PostgreSQL client, migrations, seed
│   │       ├── middleware/     # JWT auth middleware
│   │       ├── routes/         # auth, catalog, library, search, recommendations, social
│   │       └── services/       # business logic layer
│   └── web/                    # Next.js 15 App Router (port 3005)
│       └── src/
│           ├── app/
│           │   ├── (auth)/     # login, register
│           │   └── (player)/   # home, search, library, album, artist, playlist, profile
│           ├── components/
│           │   ├── catalog/    # TrackRow, AlbumCard, ArtistCard
│           │   ├── player/     # AudioEngine, PlayerBar, RadioEngine
│           │   └── sidebar/    # Sidebar with playlists + followed artists
│           ├── store/          # Zustand: player store, auth store
│           └── lib/            # api client, utils
└── packages/
    └── types/                  # Shared TypeScript types (Track, Album, Artist, ...)
```

### Key Design Decisions

| Decision | Why |
|---|---|
| **HLS.js for audio** | Never serve audio bytes from API; CDN-delivered streams at scale |
| **Nested layouts (Next.js)** | `(player)/layout.tsx` wraps all music pages — AudioEngine + PlayerBar never unmount |
| **RSC for catalog pages** | Album, Artist pages are server-rendered for SEO; only interactive parts are client components |
| **JWT in memory + httpOnly refresh** | Access token lives only in JS memory (no XSS); refresh token in httpOnly cookie |
| **PostgreSQL trigram indexes** | `pg_trgm` extension enables fast fuzzy ILIKE search without Elasticsearch |
| **Genre-based recommendation scoring** | No external ML dependency; runs entirely in PostgreSQL with a custom scoring query |
| **RadioEngine as zero-UI component** | Silently appends tracks to queue before it empties, enabling truly infinite radio |

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| PostgreSQL | 16 | macOS: `brew install postgresql@16` / Windows: [postgresql.org](https://www.postgresql.org/download/windows/) |
| Redis | 7 | macOS: `brew install redis` / Windows: [redis.io](https://redis.io/docs/getting-started/installation/install-redis-on-windows/) |
| Vyro Browser | latest | [VyroBrowser](https://github.com/Gaurav06120714/VyroBrowser) *(optional — auto-opens app)* |

### 1. Clone & Install

**macOS**
```bash
git clone https://github.com/Gaurav06120714/VyroMusic.git
cd VyroMusic
npm install
```

**Windows**
```powershell
git clone https://github.com/Gaurav06120714/VyroMusic.git
cd VyroMusic
npm install
```

### 2. Configure Environment

```bash
# API environment
cp apps/api/.env.example apps/api/.env

# Web environment
cp apps/web/.env.local.example apps/web/.env.local
```

**`apps/api/.env`**
```env
PORT=3006
NODE_ENV=development
DATABASE_URL=postgresql://vyro:vyro@localhost:5432/vyro_music
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-256-bit-key
JWT_REFRESH_SECRET=your-different-refresh-secret
FRONTEND_URL=http://localhost:3005
```

**`apps/web/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:3006
```

### 3. Start Databases

**Option A — Docker Compose (recommended, all platforms)**
```bash
docker compose up -d
```

**Option B — macOS (Homebrew)**
```bash
brew services start postgresql@16
brew services start redis

psql -U $(whoami) postgres -c "CREATE USER vyro WITH PASSWORD 'vyro';"
psql -U $(whoami) postgres -c "CREATE DATABASE vyro_music OWNER vyro;"
```

**Option C — Windows**
```powershell
# Start PostgreSQL (installed via installer)
net start postgresql-x64-16

# Start Redis (via WSL or Redis Windows port)
redis-server

# Create DB
psql -U postgres -c "CREATE USER vyro WITH PASSWORD 'vyro';"
psql -U postgres -c "CREATE DATABASE vyro_music OWNER vyro;"
```

### 4. Run Migrations & Seed

```bash
# Create schema
npm run db:migrate --workspace=apps/api

# Seed with 5 artists, 5 albums, 25 tracks + real cover art
npm run db:seed --workspace=apps/api
```

### 5. Start Development Servers

**macOS**
```bash
# All services + auto-open in Vyro Browser
npm run dev:vyro

# Or manually:
# Terminal 1 — API
npm run dev --workspace=apps/api    # → http://localhost:3006

# Terminal 2 — Web
npm run dev --workspace=apps/web    # → http://localhost:3005
```

**Windows**
```powershell
# All services + auto-open in Vyro Browser
npm run dev:vyro

# Or manually in 2 PowerShell windows:
# Window 1 — API
npm run dev --workspace=apps/api

# Window 2 — Web
npm run dev --workspace=apps/web
```

Open [http://localhost:3005](http://localhost:3005) and register an account.

> 💡 `npm run dev:vyro` starts all services and automatically opens in Vyro Browser if installed.

---

## 📡 API Reference

All endpoints are proxied through Next.js at `/api/*` → `localhost:3006/*`.

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Register new user |
| `POST` | `/auth/login` | — | Login, get access token + refresh cookie |
| `POST` | `/auth/refresh` | Cookie | Rotate refresh token |
| `POST` | `/auth/logout` | Cookie | Revoke refresh token |
| `GET` | `/auth/me` | Bearer | Current user info |

### Catalog
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/tracks/trending` | — | Top 20 by play count |
| `GET` | `/tracks/:id` | Optional | Track detail |
| `GET` | `/tracks/:id/stream` | Bearer | Signed stream token |
| `GET` | `/albums/new-releases` | — | Latest albums |
| `GET` | `/albums/:id` | — | Album detail |
| `GET` | `/albums/:id/tracks` | Optional | Tracks in album |
| `GET` | `/artists/:id` | — | Artist detail |
| `GET` | `/artists/:id/top-tracks` | Optional | Artist's top 10 |
| `GET` | `/artists/:id/albums` | — | Artist discography |

### Recommendations (Phase 2)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/recommendations/for-you` | Bearer | Personalised feed (cached 1h) |
| `GET` | `/recommendations/discover` | Bearer | Cross-genre discovery |
| `GET` | `/recommendations/radio/:trackId` | Optional | Infinite radio from seed |
| `GET` | `/recommendations/trending` | — | Global chart |
| `POST` | `/recommendations/refresh` | Bearer | Force-refresh cache |

### Social (Phase 2)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/artists/:id/follow` | Bearer | Follow artist |
| `DELETE` | `/artists/:id/follow` | Bearer | Unfollow artist |
| `GET` | `/artists/:id/follow` | Bearer | Check follow status |
| `GET` | `/me/following/artists` | Bearer | Followed artists list |
| `GET` | `/me/profile` | Bearer | Full profile + stats |
| `PUT` | `/me/profile` | Bearer | Update profile |
| `GET` | `/me/stats/genres` | Bearer | Top genres (30 days) |
| `GET` | `/me/stats/artists` | Bearer | Top artists (30 days) |

### Library
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/me/library/tracks` | Bearer | Liked songs |
| `POST` | `/me/library/tracks/:id` | Bearer | Like track |
| `DELETE` | `/me/library/tracks/:id` | Bearer | Unlike track |
| `GET` | `/me/playlists` | Bearer | User's playlists |
| `POST` | `/me/playlists` | Bearer | Create playlist |
| `GET` | `/playlists/:id` | Optional | Playlist + tracks |
| `PUT` | `/playlists/:id` | Bearer | Update playlist |
| `DELETE` | `/playlists/:id` | Bearer | Delete playlist |
| `POST` | `/playlists/:id/tracks` | Bearer | Add track to playlist |
| `GET` | `/me/history` | Bearer | Play history |
| `POST` | `/events/play-end` | Bearer | Record play event |

### Search
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/search?q=` | — | Full search (tracks + albums + artists) |
| `GET` | `/search/autocomplete?q=` | — | Quick suggestions |

### Billing (Phase 3)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/billing/plans` | — | List all subscription plans |
| `POST` | `/billing/create-checkout-session` | Bearer | Create Stripe Checkout session |
| `POST` | `/billing/create-portal-session` | Bearer | Open Stripe Customer Portal |
| `POST` | `/billing/webhook` | Stripe sig | Handle Stripe webhook events |
| `GET` | `/tracks/:id/lyrics` | — | Synced lyrics for a track |

---

## 🗄️ Database Schema

```
users              — accounts, subscription tiers
artists            — artist profiles, bios, avatar/cover URLs, follower counts
albums             — albums with cover art, release dates
tracks             — tracks with HLS manifest URLs, play/like counts, genres
playlists          — user playlists (public/private/collaborative)
playlist_tracks    — many-to-many with position ordering
user_liked_tracks  — liked songs junction
user_followed_artists  — following junction
play_history       — per-play events for recommendations
recommendation_cache   — per-user, per-context 1h cache
refresh_tokens     — hashed refresh tokens with expiry
lyrics             — synced or plain lyrics (Phase 3)
```

---

## 🎨 UI / Design System

Built with **Tailwind CSS v3** and a custom `vyro` color palette.

| Token | Value | Usage |
|---|---|---|
| `vyro-500` | `#8b5cf6` | Primary accent (purple) |
| `cyan-400` | `#22d3ee` | Secondary accent |
| `glass-card` | `backdrop-blur + bg-white/5` | Card surfaces |
| `btn-neon` | Gradient + glow shadow | Primary buttons |
| `equalizer-bar` | CSS keyframe animation | "Now playing" indicator |
| `mesh-bg` | Radial gradient mesh | App background |

---

## 🧪 Testing Results

All Phase 1 + Phase 2 endpoints tested and passing:

```
✅ Auth — register, login, refresh, logout, me
✅ Catalog — trending, tracks, albums, artists, stream token
✅ Search — full text + autocomplete
✅ Recommendations — for-you, discover, radio, trending, cache refresh
✅ Social — follow/unfollow artist, check status, list followed, profile, stats
✅ Library — like/unlike, liked list, playlist CRUD, add/remove tracks, history
✅ Billing — plans list, checkout session, customer portal, webhook handler
✅ Lyrics — synced LRC endpoint, karaoke panel with real-time highlight
✅ Frontend — 0 TypeScript errors, all pages HTTP 200
```

---

## 🗺️ Roadmap

### Phase 3 — Scale + Monetisation
- [x] **Stripe billing** — free/premium/family/student subscriptions, Checkout + Customer Portal
- [x] **Synced lyrics** — LRC format, karaoke-style line highlight with auto-scroll
- [ ] **Advanced search** — genre filters, year range, sort order
- [ ] **S3 + CloudFront** — real HLS audio delivery pipeline
- [ ] **Elasticsearch** — semantic search, genre filters, year range
- [ ] **ClickHouse** — analytics pipeline (play events at scale)
- [ ] **React Native** — iOS + Android app sharing the same API

### Phase 4 — AI+
- [ ] **OpenAI embeddings** — track embedding vectors for deep similarity
- [ ] **Mood detection** — "energetic", "chill", "focus" moods via audio analysis
- [ ] **AI playlist generator** — "make me a workout playlist"
- [ ] **Smart shuffle** — no two same-artist tracks back to back

---

## 🛠️ Scripts

```bash
# Root
npm run dev:api          # Start API in watch mode
npm run dev:web          # Start web in dev mode

# API workspace
npm run db:migrate       # Run schema migrations
npm run db:seed          # Seed database with sample data
npm run build            # Compile TypeScript

# Web workspace
npm run build            # Production build
npm run type-check       # TypeScript check (no emit)
```

---

## 📁 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion |
| **State** | Zustand (player store + auth store) |
| **Audio** | HLS.js (HTTP Live Streaming) |
| **Backend** | Fastify 4, TypeScript, @fastify/jwt, @fastify/cookie |
| **Database** | PostgreSQL 16 with pg_trgm for fuzzy search |
| **Cache** | Redis 7 (session, rate limiting) |
| **Auth** | JWT (15min access) + httpOnly refresh cookie (30 days) |
| **Monorepo** | npm workspaces |
| **Infra (prod)** | Docker, S3, CloudFront, Railway/Render |

---

## 📄 License

MIT © 2026 Gaurav Ganesh

---

<div align="center">
Built with ♥ by <a href="https://github.com/Gaurav06120714">Gaurav Ganesh</a>
</div>
