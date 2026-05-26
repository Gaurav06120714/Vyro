#!/bin/bash
set -e

echo "=== Vyro Browser Setup ==="
echo ""
echo "Zero paid APIs — runs fully local with Ollama"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js is required. Install from https://nodejs.org (v20+)"
  exit 1
fi

NODE_MAJOR=$(node --version | cut -d. -f1 | tr -d 'v')
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "ERROR: Node.js 20+ required. Current version: $(node --version)"
  exit 1
fi
echo "✓ Node.js $(node --version)"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
  echo "Installing pnpm..."
  npm install -g pnpm
fi
echo "✓ pnpm $(pnpm --version)"

# Check / install Ollama
if ! command -v ollama &> /dev/null; then
  echo ""
  echo "Installing Ollama..."
  curl -fsSL https://ollama.ai/install.sh | sh
else
  echo "✓ Ollama already installed: $(ollama --version 2>/dev/null || echo 'installed')"
fi

# Start Ollama if not running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo "Starting Ollama server..."
  ollama serve &
  OLLAMA_PID=$!
  echo "Ollama started (PID: $OLLAMA_PID)"
  sleep 3
fi

# Pull model
MODEL="${OLLAMA_MODEL:-llama3.1:8b}"
echo ""
echo "Pulling $MODEL model (this may take several minutes on first run)..."
ollama pull "$MODEL"
echo "✓ Model $MODEL ready"

# Install dependencies
echo ""
echo "Installing dependencies..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"
pnpm install

# Install Playwright browsers
echo ""
echo "Installing Playwright Chromium browser..."
pnpm --filter @vyro/browser-engine exec playwright install chromium

# Copy env file
if [ ! -f "$PROJECT_ROOT/.env" ]; then
  cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
  echo "✓ Created .env from .env.example"
else
  echo "✓ .env already exists (not overwriting)"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To start Vyro Browser:"
echo "  pnpm dev"
echo ""
echo "Then open: http://localhost:3000"
echo ""
echo "The API runs on: http://localhost:3001"
echo "Ollama runs on:  http://localhost:11434"
echo ""
