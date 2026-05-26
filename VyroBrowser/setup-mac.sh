#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-mac.sh — One-command Vyro Browser setup for macOS.
# Run from the repo root after cloning:
#   bash setup-mac.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

echo ""
echo "  ██╗   ██╗██╗   ██╗██████╗  ██████╗ "
echo "  ██║   ██║╚██╗ ██╔╝██╔══██╗██╔═══██╗"
echo "  ██║   ██║ ╚████╔╝ ██████╔╝██║   ██║"
echo "  ╚██╗ ██╔╝  ╚██╔╝  ██╔══██╗██║   ██║"
echo "   ╚████╔╝    ██║   ██║  ██║╚██████╔╝"
echo "    ╚═══╝     ╚═╝   ╚═╝  ╚═╝ ╚═════╝ "
echo ""
echo "  Vyro Browser — macOS Setup"
echo "  ───────────────────────────"
echo ""

# ── Check Node.js ─────────────────────────────────────────────────────────────
echo "→ Checking Node.js..."
if ! command -v node &> /dev/null; then
  echo "  ❌ Node.js not found. Install from https://nodejs.org (LTS)"
  open "https://nodejs.org"
  exit 1
fi
echo "  ✅ Node.js $(node --version) found."

# ── Install dependencies ──────────────────────────────────────────────────────
echo ""
echo "→ Installing dependencies..."
cd apps/browser
npm ci
echo "  ✅ Dependencies installed."

# ── Build & install ───────────────────────────────────────────────────────────
echo ""
echo "→ Building and installing Vyro Browser..."
rm -rf /Applications/Vyro.app 2>/dev/null || true
npm run install-app

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "  ✅  Vyro Browser is installed at /Applications/Vyro.app"
echo "  Open it from Spotlight (Cmd+Space → Vyro) or Launchpad."
echo ""
