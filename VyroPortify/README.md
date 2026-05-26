<div align="center">

# ⚡ VyroPortify

### Turn your resume into a stunning, hosted portfolio in under 60 seconds.

[![Next.js](https://img.shields.io/badge/Next.js_15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Claude AI](https://img.shields.io/badge/Claude_AI-D97706?style=for-the-badge&logo=anthropic&logoColor=white)](https://anthropic.com/)
[![Clerk](https://img.shields.io/badge/Clerk_Auth-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)](https://clerk.dev/)
[![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://stripe.com/)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![CI](https://github.com/Gaurav06120714/vyroportify/actions/workflows/test.yml/badge.svg)](https://github.com/Gaurav06120714/vyroportify/actions)

</div>

---

## ✨ What It Does

VyroPortify uses Claude AI to transform your resume (or a quick form) into a beautiful, public portfolio website — hosted instantly, no code required.

| Feature | Free | Pro ($9/mo) |
|---|:---:|:---:|
| AI Resume Builder (12-step guided) | ✅ | ✅ |
| Portfolio templates | 1 | All 4 |
| Portfolios | 3 | Unlimited |
| AI skill suggestions | ❌ | ✅ |
| AI cover letter generator | ❌ | ✅ |
| Custom domain | ❌ | ✅ |
| Public URL (`/portfolio/your-name`) | ✅ | ✅ |

---

## 🎨 Templates

| Template | Style | Best For |
|---|---|---|
| **Aurora** | Dark electric, animated gradient | Developers & Designers |
| **Minimal** | Clean white, typography-first | PMs & Researchers |
| **Cyber** | Neon glassmorphism, terminal feel | Anyone who refuses to blend in |
| **Executive** | Two-column serif, gold accents | Senior Engineers & Managers |

---

## 🗂 Project Structure

```
vyroportify/
├── frontend/                    # Next.js 15 · TypeScript · Tailwind CSS
│   ├── src/
│   │   ├── app/
│   │   │   ├── (marketing)/     # Landing page, pricing
│   │   │   ├── (dashboard)/     # All /dashboard/* pages
│   │   │   │   └── dashboard/
│   │   │   │       ├── page.tsx              # Overview
│   │   │   │       ├── build-resume/         # AI Resume Builder
│   │   │   │       ├── upload/               # PDF/DOCX upload
│   │   │   │       ├── portfolios/           # My Portfolios
│   │   │   │       ├── templates/            # Template picker
│   │   │   │       ├── cover-letter/         # AI Cover Letter
│   │   │   │       └── settings/             # Account + Billing
│   │   │   └── (auth)/          # Login, Register (Clerk)
│   │   ├── components/
│   │   │   ├── dashboard/       # Sidebar, MobileHeader
│   │   │   └── ui/              # Shared UI primitives
│   │   ├── context/             # ThemeContext, PlanContext
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # api.ts, posthog.ts, sentry.ts
│   │   └── types/               # Shared TypeScript types
│   ├── e2e/                     # Playwright end-to-end tests
│   └── src/test/                # Vitest unit tests
│
├── backend/                     # FastAPI · SQLAlchemy · Celery
│   ├── app/
│   │   ├── routers/             # auth, resume, portfolio, billing
│   │   ├── services/            # resume_parser, resume_builder, portfolio_generator
│   │   ├── models/              # User, Resume, Portfolio, AIJob (SQLAlchemy)
│   │   ├── schemas/             # Pydantic request/response models
│   │   ├── core/                # config, rate limiter, cache, sentry
│   │   ├── templates/           # Jinja2 HTML (aurora, minimal, cyber, executive)
│   │   └── workers/             # Celery tasks
│   ├── alembic/                 # Database migrations
│   ├── tests/                   # Pytest test suite
│   ├── Dockerfile               # API server image
│   └── Dockerfile.worker        # Celery worker image
│
├── .github/workflows/           # CI/CD pipeline (GitHub Actions)
├── docker-compose.yml           # Local full-stack dev environment
└── README.md
```

---

## 🚀 Local Development

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| Python | 3.12+ | [python.org](https://python.org) |
| PostgreSQL | 16 | macOS: `brew install postgresql@16` / Windows: [postgresql.org](https://www.postgresql.org/download/windows/) |
| Redis | 7 | macOS: `brew install redis` / Windows: [redis.io](https://redis.io/docs/getting-started/installation/install-redis-on-windows/) |
| Vyro Browser | latest | [VyroBrowser](https://github.com/Gaurav06120714/VyroBrowser) *(optional)* |

### 1. Clone

**macOS**
```bash
git clone https://github.com/Gaurav06120714/vyroportify.git
cd vyroportify
```

**Windows**
```powershell
git clone https://github.com/Gaurav06120714/vyroportify.git
cd vyroportify
```

### 2. Frontend

**macOS**
```bash
cd frontend
npm install
cp .env.example .env.local   # fill in values below
npm run dev                  # → http://localhost:3007
```

**Windows**
```powershell
cd frontend
npm install
copy .env.example .env.local   # fill in values below
npm run dev                    # → http://localhost:3007
```

**`frontend/.env.local`**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_SITE_URL=http://localhost:3007

# Optional
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

### 3. Backend

**macOS**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env          # fill in values below

createdb vyroportify
alembic upgrade head

uvicorn app.main:app --reload --port 8001   # → http://localhost:8001
```

**Windows**
```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"
copy .env.example .env        # fill in values below

createdb vyroportify
alembic upgrade head

uvicorn app.main:app --reload --port 8001   # → http://localhost:8001
```

**`backend/.env`**
```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/vyroportify
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLERK_JWKS_URL=https://<your-clerk-domain>/.well-known/jwks.json
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=change-me-32-chars-minimum
FRONTEND_URL=http://localhost:3007

# Optional
SENTRY_DSN=https://...@sentry.io/...
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REGION=us-east-1
```

### 4. Run Everything + Open in Vyro Browser

**macOS**
```bash
# From project root — starts frontend + backend + opens in Vyro Browser
npm run dev:vyro

# Or start separately:
npm run dev          # starts both frontend + backend
```

**Windows**
```powershell
# From project root — starts frontend + backend + opens in Vyro Browser
npm run dev:vyro

# Or start separately:
npm run dev
```

> 💡 Opens automatically in **Vyro Browser** if installed. Falls back to default browser if not found.

### 5. Docker (alternative — runs everything at once)

```bash
docker compose up --build
```

---

## 🔑 API Reference

Base URL: `http://localhost:8001/api/v1`  
Interactive docs: [`/api/v1/docs`](http://localhost:8001/api/v1/docs)

```
# Resume
POST   /resume/build            AI-powered resume builder     (10 req/min)
POST   /resume/suggest-skills   AI skill suggestions          (10 req/min)
POST   /resume/cover-letter     AI cover letter generator     (10 req/min)
POST   /resume/upload           Upload PDF / DOCX
GET    /resume/                 List user resumes

# Portfolio
POST   /portfolio/generate      Generate portfolio from resume (10 req/min)
GET    /portfolio/{id}/status   Poll generation status
GET    /portfolio/p/{slug}      Public portfolio (cached 1h)
PUT    /portfolio/{id}/publish  Toggle public / private
DELETE /portfolio/{id}          Delete portfolio
GET    /portfolio/sitemap       All public slugs

# Billing
POST   /billing/create-checkout  Stripe checkout session
GET    /billing/status           Subscription status
GET    /billing/portal           Customer billing portal URL

# Auth
GET    /auth/me                  Current user profile

# Health
GET    /health                   Liveness probe
```

---

## 🌐 Deployment

### Frontend → Vercel

1. Import the `frontend/` directory at [vercel.com/new](https://vercel.com/new)
2. Add all `NEXT_PUBLIC_*` environment variables in the Vercel dashboard
3. Every push to `main` auto-deploys

### Backend → Railway

1. Create a Railway project, attach a **Postgres** and **Redis** service
2. Set all backend environment variables in Railway
3. Railway auto-reads `backend/railway.toml` and builds from `backend/Dockerfile`

### Required GitHub Secrets (Settings → Secrets → Actions)

| Secret | Description |
|---|---|
| `RAILWAY_TOKEN` | Railway API token |
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel org ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (used in CI build) |
| `NEXT_PUBLIC_API_URL` | Production API URL |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog key *(optional)* |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN *(optional)* |

---

## 🧪 Testing

```bash
# Backend — pytest
cd backend
pytest -x -q

# Frontend — Vitest unit tests
cd frontend
npm test

# Frontend — type check + lint
npx tsc --noEmit
npx next lint

# Frontend — Playwright e2e
npx playwright test
```

---

## 🛡 Security & Performance

- **Rate limiting** — SlowAPI: 10 req/min on all AI endpoints
- **Redis caching** — Public portfolios cached 1h, sitemap 24h
- **Security headers** — HSTS, CSP, X-Frame-Options, Permissions-Policy
- **JWT auth** — Clerk RS256 JWKS verification, auto-create users on first call
- **Image optimization** — Uploads compressed to WebP via Pillow before S3
- **Error tracking** — Sentry on both frontend and backend
- **Analytics** — PostHog with Clerk auto-identification
- **Anti-flash** — localStorage theme applied before React hydrates (no white flash)

---

## 🎨 Theme System

VyroPortify ships with a full **Light / Dark / System** theme:

- CSS custom properties (`--pf-*`) defined for both modes in `globals.css`
- `ThemeContext` applies the `dark` class to `<html>` and persists to `localStorage`
- Anti-flash inline script in `layout.tsx` resolves theme before first paint
- Smooth 200ms transitions across all color properties

---

## 📄 License

MIT © 2025 [Gaurav06120714](https://github.com/Gaurav06120714)
