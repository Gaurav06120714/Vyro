# Setup Guide

Complete step-by-step instructions to get Vyro Browser running locally.

## Prerequisites

- macOS, Linux, or WSL2
- Node.js >= 20 (`node --version`)
- pnpm >= 9 (`pnpm --version`)

---

## 1. Install Ollama

Ollama runs the local AI model. No API key or internet connection required after install.

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh
```

Start Ollama:

```bash
ollama serve
```

## 2. Pull the AI model

```bash
ollama pull llama3.1:8b
```

This downloads ~4.7 GB on first run. Subsequent starts are instant.

Verify it works:

```bash
ollama run llama3.1:8b "Say hello"
```

## 3. Install Node.js and pnpm

```bash
# Node via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20

# pnpm
npm install -g pnpm@9
```

## 4. Clone and install dependencies

```bash
git clone <repo-url> VyroBrowser
cd VyroBrowser
pnpm install
```

## 5. Configure environment

```bash
cp .env.example .env
```

Open `.env` and confirm the defaults look correct. For most users no changes are needed.

## 6. Run the setup script

```bash
bash scripts/setup.sh
```

This installs Playwright Chromium browsers and runs any first-time migrations.

## 7. Start the development server

```bash
pnpm dev
```

This starts:
- API on http://localhost:3001
- Web UI on http://localhost:3000
- Worker process (background agent)

Open http://localhost:3000 in your browser.

---

## Using the browse scripts

See [docs/browsing.md](./browsing.md) for full details.

Quick start:

```bash
# Open a browser at Google (you control it)
pnpm browse

# Open YouTube with your saved login
pnpm browse:saved https://www.youtube.com
```

---

## Troubleshooting

### "Ollama connection refused"

Make sure Ollama is running: `ollama serve`

### "Cannot find Playwright browsers"

```bash
npx playwright install chromium
```

### Port 3001 already in use

```bash
lsof -ti:3001 | xargs kill
```

### pnpm workspace errors

```bash
pnpm clean
pnpm install
```

### The AI is slow

`llama3.1:8b` needs ~8 GB RAM. If your machine has less, try a smaller model:

```bash
ollama pull llama3.2:3b
# then set in .env:
OLLAMA_MODEL=llama3.2:3b
```
