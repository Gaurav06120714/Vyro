# VyroPortify — Full Project Overview
### How It Was Built | File Structure | All APIs | Tech Stack

---

## 🌐 What Is VyroPortify?

**VyroPortify** is a web app that lets anyone build a professional portfolio website in minutes.

You upload your **resume (PDF or DOCX)** → AI reads it → generates a full portfolio page with your skills, projects, experience, and bio → you pick a design template → share a live link.

**Free plan:** 1 portfolio, basic templates  
**Pro plan ($9/month):** unlimited portfolios, premium templates, custom domain, AI cover letters

---

## 🧱 Tech Stack (What languages/tools we used)

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | **Next.js 15** (React, TypeScript) | Fast, SEO-friendly, free hosting on Vercel |
| Backend API | **FastAPI** (Python) | Fast to build, async, great for AI apps |
| Database | **PostgreSQL** | Stores users, resumes, portfolios |
| Task Queue | **Celery + Redis** | Run AI tasks in background (non-blocking) |
| AI | **OpenRouter API** (free) | AI reads resume, generates portfolio content |
| Auth | **Clerk** | Login/signup with Google, GitHub, email |
| Payments | **Stripe** | Pro subscriptions, webhooks |
| File Storage | **AWS S3 / Cloudflare R2** | Store uploaded resumes, images |
| Deployment | **Railway** (backend) + **Vercel** (frontend) | Live hosting |

---

## 📁 Complete File Structure

```
vyroportify/
│
├── frontend/                          ← Next.js web app (what users see)
│   └── src/
│       ├── app/                       ← Pages (Next.js App Router)
│       │   ├── layout.tsx             ← Root layout, theme anti-flash script
│       │   ├── page.tsx               ← Landing/marketing page
│       │   ├── dashboard/             ← Main user dashboard (after login)
│       │   ├── builder/               ← Step-by-step portfolio builder
│       │   ├── portfolio/[id]/        ← Public portfolio viewer
│       │   └── pricing/               ← Pricing page
│       │
│       ├── components/
│       │   ├── marketing/             ← Landing page sections
│       │   │   ├── HeroSection.tsx    ← Big headline + CTA button
│       │   │   ├── Features.tsx       ← Feature cards
│       │   │   ├── PricingSection.tsx ← Free vs Pro pricing
│       │   │   ├── TemplateGallery.tsx← Show portfolio templates
│       │   │   └── FAQ.tsx            ← Frequently asked questions
│       │   │
│       │   ├── dashboard/
│       │   │   ├── Sidebar.tsx        ← Left nav (desktop)
│       │   │   └── MobileHeader.tsx   ← Top nav (mobile)
│       │   │
│       │   ├── builder/               ← Portfolio builder steps
│       │   │   ├── StepShell.tsx      ← Step wrapper (progress bar)
│       │   │   └── TagInput.tsx       ← Skills tag input component
│       │   │
│       │   ├── ui/                    ← Reusable UI (buttons, cards, etc.)
│       │   ├── ThemeToggle.tsx        ← Dark/light mode switch
│       │   ├── ProGateModal.tsx       ← "Upgrade to Pro" popup
│       │   └── Providers.tsx          ← Wraps app with Clerk + theme
│       │
│       └── context/
│           ├── ThemeContext.tsx        ← Dark/light theme state (default: dark)
│           └── PlanContext.tsx         ← Free vs Pro plan state
│
│
├── backend/                           ← FastAPI Python API server
│   ├── app/
│   │   ├── main.py                    ← App entry point, startup, CORS, routes
│   │   ├── database.py                ← PostgreSQL async connection
│   │   │
│   │   ├── core/
│   │   │   ├── config.py              ← All env variables (API keys, URLs)
│   │   │   ├── security_config.py     ← JWT, CORS security settings
│   │   │   ├── cache.py               ← Redis caching helpers
│   │   │   ├── limiter.py             ← Rate limiting (slowapi)
│   │   │   ├── exceptions.py          ← Custom error classes
│   │   │   ├── audit_log.py           ← Log user actions
│   │   │   └── enums.py               ← Plan types, status codes
│   │   │
│   │   ├── models/                    ← Database table definitions
│   │   │   ├── user.py                ← Users table
│   │   │   ├── resume.py              ← Resumes table
│   │   │   ├── portfolio.py           ← Portfolios table
│   │   │   ├── template.py            ← Portfolio templates table
│   │   │   └── ai_job.py              ← AI background jobs table
│   │   │
│   │   ├── schemas/                   ← Request/response data shapes
│   │   │   ├── auth.py                ← Login, signup schemas
│   │   │   ├── resume.py              ← Resume upload/parse schemas
│   │   │   ├── portfolio.py           ← Portfolio CRUD schemas
│   │   │   └── responses.py           ← Standard API response format
│   │   │
│   │   ├── routers/                   ← API route handlers
│   │   │   ├── auth.py                ← /api/v1/auth/* endpoints
│   │   │   ├── resume.py              ← /api/v1/resumes/* endpoints
│   │   │   ├── portfolio.py           ← /api/v1/portfolios/* endpoints
│   │   │   └── billing.py             ← /api/v1/billing/* endpoints
│   │   │
│   │   ├── services/                  ← Business logic
│   │   │   ├── ai_client.py           ← OpenRouter AI API calls
│   │   │   ├── resume_parser.py       ← Read PDF/DOCX resume files
│   │   │   ├── resume_builder.py      ← Build/format resume data
│   │   │   ├── portfolio_generator.py ← Generate portfolio from resume
│   │   │   ├── stripe_service.py      ← Stripe subscriptions, webhooks
│   │   │   ├── s3_service.py          ← Upload/download files from S3/R2
│   │   │   └── image_optimizer.py     ← Compress/resize profile images
│   │   │
│   │   ├── security.py                ← Clerk JWT verification middleware
│   │   │
│   │   └── workers/
│   │       └── celery_app.py          ← Background task runner (AI jobs)
│   │
│   ├── alembic/                       ← Database migrations (version control for DB)
│   ├── tests/                         ← Automated tests
│   ├── pyproject.toml                 ← Python dependencies
│   ├── Dockerfile                     ← Container build instructions
│   └── railway.toml                   ← Railway deployment config
│
├── .env                               ← Secret API keys (NOT in git)
├── .gitignore                         ← Files to not commit (includes .env)
└── README.md                          ← Project documentation
```

---

## 🔌 All API Endpoints

Base URL: `https://your-backend.railway.app/api/v1`

### 🔐 Auth — `/api/v1/auth`

| Method | Endpoint | What it does |
|--------|----------|-------------|
| POST | `/auth/register` | Create new user account |
| POST | `/auth/login` | Login, get JWT token |
| POST | `/auth/refresh` | Get new access token using refresh token |
| GET | `/auth/me` | Get current logged-in user info |
| POST | `/auth/logout` | Logout (invalidate token) |

### 📄 Resumes — `/api/v1/resumes`

| Method | Endpoint | What it does |
|--------|----------|-------------|
| POST | `/resumes/upload` | Upload PDF/DOCX resume file |
| GET | `/resumes` | List all your uploaded resumes |
| GET | `/resumes/{id}` | Get one resume details |
| DELETE | `/resumes/{id}` | Delete a resume |
| POST | `/resumes/{id}/parse` | AI reads the resume, extracts data |

### 🖼️ Portfolios — `/api/v1/portfolios`

| Method | Endpoint | What it does |
|--------|----------|-------------|
| POST | `/portfolios` | Create a new portfolio |
| GET | `/portfolios` | List all your portfolios |
| GET | `/portfolios/{id}` | Get one portfolio (public view) |
| PUT | `/portfolios/{id}` | Edit portfolio content |
| DELETE | `/portfolios/{id}` | Delete portfolio |
| POST | `/portfolios/{id}/generate` | AI generates portfolio from resume |
| POST | `/portfolios/{id}/publish` | Make portfolio public (get shareable link) |
| POST | `/portfolios/{id}/cover-letter` | AI writes cover letter (Pro only) |

### 💳 Billing — `/api/v1/billing`

| Method | Endpoint | What it does |
|--------|----------|-------------|
| POST | `/billing/checkout` | Start Stripe checkout for Pro plan |
| POST | `/billing/portal` | Open billing management portal |
| POST | `/billing/webhook` | Stripe sends payment events here |
| GET | `/billing/status` | Check if user is Free or Pro |

### 🏥 Health Check

| Method | Endpoint | What it does |
|--------|----------|-------------|
| GET | `/health` | Check if server is running |

---

## 🔑 API Keys Required

| Service | Key Name | Where to get it | Free? |
|---------|----------|----------------|-------|
| Clerk | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` | dashboard.clerk.com | ✅ Free |
| OpenRouter | `OPENROUTER_API_KEY` | openrouter.ai | ✅ Free |
| Stripe | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | dashboard.stripe.com | ✅ Free (test mode) |
| PostgreSQL | `DATABASE_URL` | Railway auto-provides | ✅ Free tier |
| Redis | `REDIS_URL` | Railway auto-provides | ✅ Free tier |
| AWS S3 or R2 | `AWS_*` or `R2_*` keys | aws.amazon.com or cloudflare.com | ✅ Free tier |

---

## 🔄 How the Main Feature Works (Step by Step)

### "Upload resume → Get portfolio" flow:

```
1. User signs up/login (Clerk handles this)
   ↓
2. User uploads resume PDF
   → Frontend sends file to POST /api/v1/resumes/upload
   → Backend saves file to S3/R2 cloud storage
   → Stores resume record in PostgreSQL
   ↓
3. AI parses the resume
   → POST /api/v1/resumes/{id}/parse is called
   → resume_parser.py extracts text from PDF/DOCX
   → ai_client.py sends text to OpenRouter (free AI)
   → AI returns structured JSON: name, skills, experience, projects, bio
   ↓
4. Portfolio is generated
   → POST /api/v1/portfolios/{id}/generate
   → portfolio_generator.py takes the AI data
   → Creates a portfolio entry in the database
   ↓
5. User customizes and publishes
   → Picks a template (Minimal, Creative, Executive, etc.)
   → Clicks "Publish" → gets a shareable link
   → Anyone can view at: vyroportify.com/portfolio/{id}
```

---

## 🎨 Portfolio Templates

| Template | Who it's for | Plan |
|----------|-------------|------|
| **Minimal** | Developers, engineers | Free |
| **Creative** | Designers, artists | Free |
| **Executive** | Managers, executives | Pro |
| **Bold** | Marketing, sales | Pro |

---

## 🌍 How Deployment Works

```
User's browser
      ↓
  VERCEL (frontend)
  vyroportify.vercel.app
      ↓ API calls
  RAILWAY (backend)
  vyroportify.railway.app
      ↓              ↓              ↓
PostgreSQL         Redis          S3/R2
(database)      (task queue)   (file storage)
      ↓
  OpenRouter AI
  (resume parsing, content generation)
      ↓
  Stripe
  (payments)
```

---

## ⚡ How Authentication Works

1. User clicks "Sign In" → **Clerk** shows login popup
2. User logs in with Google/GitHub/email
3. Clerk gives the user a **JWT token** (like a digital ID card)
4. Every API request sends this token in the header:  
   `Authorization: Bearer <token>`
5. Backend's `security.py` verifies the token with Clerk's public keys
6. If valid → request proceeds. If invalid → 401 Unauthorized

---

## 🧪 Testing

```bash
# Run backend tests
cd backend
pytest

# Run frontend tests  
cd frontend
npm test
```

---

## 🚀 How to Run Locally

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
cp ../.env .env        # copy your API keys
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in Clerk keys
npm run dev
```

Open: `http://localhost:3000`

---

*Built with ❤️ — VyroPortify turns any resume into a portfolio in under 60 seconds.*
