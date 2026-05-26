# ─────────────────────────────────────────────────────────────────────────────
# setup-windows.ps1 — One-command Vyro Browser setup for Windows.
# Run from the repo root after cloning:
#   powershell -ExecutionPolicy Bypass -File setup-windows.ps1
# ─────────────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  ██╗   ██╗██╗   ██╗██████╗  ██████╗ " -ForegroundColor Magenta
Write-Host "  ██║   ██║╚██╗ ██╔╝██╔══██╗██╔═══██╗" -ForegroundColor Magenta
Write-Host "  ██║   ██║ ╚████╔╝ ██████╔╝██║   ██║" -ForegroundColor Magenta
Write-Host "  ╚██╗ ██╔╝  ╚██╔╝  ██╔══██╗██║   ██║" -ForegroundColor Magenta
Write-Host "   ╚████╔╝    ██║   ██║  ██║╚██████╔╝" -ForegroundColor Magenta
Write-Host "    ╚═══╝     ╚═╝   ╚═╝  ╚═╝ ╚═════╝ " -ForegroundColor Magenta
Write-Host ""
Write-Host "  Vyro Browser — Windows Setup" -ForegroundColor White
Write-Host "  ─────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

# ── Check Node.js ─────────────────────────────────────────────────────────────
Write-Host "→ Checking Node.js..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version 2>&1
    Write-Host "  ✅ Node.js $nodeVersion found." -ForegroundColor Green
} catch {
    Write-Host "  ❌ Node.js not found. Install from https://nodejs.org (LTS)" -ForegroundColor Red
    Start-Process "https://nodejs.org"
    exit 1
}

# ── Install dependencies ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "→ Installing dependencies..." -ForegroundColor Cyan
Set-Location "apps\browser"
npm ci
if ($LASTEXITCODE -ne 0) { Write-Host "❌ npm ci failed." -ForegroundColor Red; exit 1 }
Write-Host "  ✅ Dependencies installed." -ForegroundColor Green

# ── Build & install ───────────────────────────────────────────────────────────
Write-Host ""
Write-Host "→ Building Vyro Browser..." -ForegroundColor Cyan
npm run install-app:win
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Build failed." -ForegroundColor Red; exit 1 }

# ── Done ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ✅  Vyro Browser is installed!" -ForegroundColor Green
Write-Host "  Open it from your Desktop or Start Menu." -ForegroundColor White
Write-Host ""
