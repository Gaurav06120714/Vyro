# VyroBrowser

A privacy-first, AI-powered desktop browser built on Electron 31 + React 19 + TypeScript. VyroBrowser integrates the entire Vyro ecosystem — VyroCoding, VyroMusic, VyroNotes, VyroPortify — directly into the browser shell, with local AI inference via Ollama.

---

## Features

- **AI Command Bar** — natural language navigation, `/`-commands, and inline AI answers powered by a local Ollama model
- **Ecosystem Dock** — one-click launch of Vyro suite apps with live status indicators
- **Split-screen** — side-by-side tab view with independent navigation
- **Workspace Presets** — Coding / Study / Interview / Focus modes that reconfigure the UI and keyboard shortcuts
- **Ad-blocking** — built-in request filter (no extensions needed)
- **Custom Injections** — per-origin CSS and JS overrides
- **AI Memory** — persistent vector-store memory for cross-session context
- **Local AI Gateway** — CORS-friendly proxy to Ollama running at `localhost:11434`
- **Profile isolation** — per-profile session partitioning for cookies and storage
- **Auto-updater** — silent background updates in production builds
- **System tray** (Windows/Linux) and Dock menu (macOS)

---

## Installation

### macOS — Apple Silicon (M1/M2/M3/M4)

```bash
# Prerequisites: Node.js 20+, npm 10+
brew install node

git clone https://github.com/your-org/VyroBrowser.git
cd VyroBrowser/apps/browser
npm install
npm run dev
```

For a production DMG:

```bash
npm run build        # compiles TypeScript + bundles renderer
npm run dist:mac     # creates dist/VyroBrowser-*.dmg
```

Open the DMG, drag VyroBrowser to Applications. On first launch, macOS Gatekeeper may show "unidentified developer" — see Troubleshooting below.

### macOS — Intel Mac

Same steps as Apple Silicon. The build toolchain auto-selects `x64` architecture. If you have both architectures installed and want a universal binary:

```bash
npm run dist:mac:universal
```

### Windows (10/11)

```powershell
# Prerequisites: Node.js 20+, Git for Windows
winget install OpenJS.NodeJS
winget install Git.Git

git clone https://github.com/your-org/VyroBrowser.git
cd VyroBrowser\apps\browser
npm install
npm run dev
```

For a production installer:

```powershell
npm run build
npm run dist:win     # creates dist/VyroBrowser-Setup-*.exe (NSIS) or *.msi
```

---

## Running with AI (Ollama)

VyroBrowser detects Ollama automatically. To enable AI features:

1. Install Ollama: https://ollama.com/download
2. Pull a model: `ollama pull llama3` (or any model)
3. Launch VyroBrowser — the AI dot in the command bar turns green when Ollama is online

The embedded model `nomic-embed-text` is pulled automatically in the background for AI Memory.

---

## Keyboard Shortcuts

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| New tab | Cmd+T | Ctrl+T |
| Close tab | Cmd+W | Ctrl+W |
| Address bar focus | Cmd+L | Ctrl+L |
| Reload | Cmd+R | Ctrl+R |
| Hard reload | Cmd+Shift+R | Ctrl+Shift+R |
| Back | Cmd+[ | Alt+Left |
| Forward | Cmd+] | Alt+Right |
| Toggle split | Cmd+Shift+\ | Ctrl+Shift+\ |
| AI command | / or ! in address bar | / or ! |
| Zoom in | Cmd++ | Ctrl++ |
| Zoom out | Cmd+- | Ctrl+- |

---

## Performance Optimizations

VyroBrowser includes production-grade thermal and battery optimizations:

- **Vibrancy throttling** — macOS vibrancy disabled when on battery power; re-enabled on AC
- **Frame rate throttling** — renderer drops to 1 fps when window is minimized or hidden
- **Background throttling** — inactive tab timers and animations are throttled by Chromium
- **Deferred service init** — AI Gateway, vector store, and AI Memory start 800 ms after window paint to avoid competing with first render
- **Exponential backoff** — ecosystem port polling uses exponential backoff (500 ms to 4 s cap) instead of a tight 500 ms loop
- **Fire-and-forget model pull** — Ollama embed model pulled asynchronously, never blocking startup
- **GPU cache recovery** — corrupt GPU cache cleared on startup after a detected GPU process crash
- **Chromium switches** — `ThrottleDisplayNoneAndVisibilityHiddenCrossOriginIframes`, `NetworkServiceInProcess2`, and V8 memory cap applied before app ready
- **Renderer isolation** — `sandbox: true` on the main BrowserWindow renderer
- **React.memo** — `DockAppButton`, `OllamaIndicator`, and `SplitToggleButton` memoized to prevent re-renders on unrelated store updates
- **fetchAll debounce** — ecosystem status fetch debounced to 2 s; global flag prevents redundant fetches on repeated NewTab mounts

---

## Troubleshooting

### macOS — Gatekeeper blocks launch

```
"VyroBrowser" cannot be opened because the developer cannot be verified.
```

Fix:

```bash
xattr -cr /Applications/VyroBrowser.app
```

Or: System Settings → Privacy & Security → scroll to "VyroBrowser was blocked" → click Open Anyway.

### macOS — App overheats / fans spin

1. Check Activity Monitor: GPU Process column. If `VyroBrowser Helper (GPU)` is high, run:
   ```bash
   defaults write com.vyro.browser DisableHardwareAcceleration -bool true
   ```
2. Ensure you are on the latest build — earlier builds used `vibrancy: 'under-window'` which forces continuous WindowServer compositing. Current builds use `'sidebar'` and disable it on battery.
3. If the issue persists after an update, clear the GPU cache:
   ```bash
   rm -rf ~/Library/Application\ Support/Vyro/GPUCache
   ```

### Windows — SmartScreen warning

Click "More info" then "Run anyway". This appears because the binary is not yet code-signed with an EV certificate.

### Windows — Antivirus flags the installer

Some AV products flag unsigned Electron apps. Add an exclusion for `VyroBrowser-Setup-*.exe` or build from source.

### Windows — Missing DLL errors (VCRUNTIME140.dll, MSVCP140.dll)

Install the Microsoft Visual C++ Redistributable:
https://aka.ms/vs/17/release/vc_redist.x64.exe

### Port conflicts — ecosystem apps fail to start

Each Vyro app claims a fixed port:

| App | Port |
|-----|------|
| VyroNotes | 3001 |
| VyroCoding | 3002 |
| VyroMusic | 3005 |
| VyroPortify | 3007 |

Find and kill conflicting processes:

```bash
# macOS/Linux
lsof -ti:3002 | xargs kill -9

# Windows
netstat -ano | findstr :3002
taskkill /PID <PID> /F
```

### App crashes on launch — corrupt profile

```bash
# macOS
rm -rf ~/Library/Application\ Support/Vyro

# Windows
rd /s /q %APPDATA%\Vyro

# Linux
rm -rf ~/.config/Vyro
```

This removes all settings, history, and bookmarks. Export bookmarks first if needed.

### GPU process crashes repeatedly

Set the environment variable before launching to disable GPU acceleration:

```bash
# macOS/Linux
ELECTRON_DISABLE_GPU=1 /Applications/VyroBrowser.app/Contents/MacOS/VyroBrowser

# Windows (PowerShell)
$env:ELECTRON_DISABLE_GPU="1"; & "C:\Program Files\VyroBrowser\VyroBrowser.exe"
```

### Ollama not detected

- Confirm Ollama is running: `curl http://localhost:11434/api/tags`
- On macOS, check that Ollama.app is open (menu bar icon)
- The AI dot in the command bar pulses green when connected

---

## Clean Build

To fully rebuild from scratch after dependency changes:

```bash
cd VyroBrowser/apps/browser
rm -rf node_modules dist-main dist-renderer .vite
npm install
npm run build
```

---

## Cache Reset Commands

```bash
# Clear GPU cache (fixes graphical corruption after driver update)
# macOS:
rm -rf ~/Library/Application\ Support/Vyro/GPUCache

# Windows:
rd /s /q %APPDATA%\Vyro\GPUCache

# Clear full app cache (clears browsing data, AI memory index — NOT bookmarks/history)
# macOS:
rm -rf ~/Library/Application\ Support/Vyro/Cache
rm -rf ~/Library/Application\ Support/Vyro/Code\ Cache

# Windows:
rd /s /q "%APPDATA%\Vyro\Cache"
rd /s /q "%APPDATA%\Vyro\Code Cache"
```

---

## AI Debugging Tip

If VyroBrowser shows unexpected behavior, open the terminal and relaunch the app. Copy all output (including stack traces) and paste it into Claude or ChatGPT with the prompt:

> "I'm running VyroBrowser (Electron + React desktop browser). Here are the logs: [paste]. What is causing this and how do I fix it?"

The AI will identify the root cause faster than searching issue trackers.

---

## Development

```bash
# Start with hot reload
npm run dev

# TypeScript type check only (no emit)
npm run typecheck

# Lint
npm run lint

# Build production
npm run build
```

Renderer runs at `http://localhost:5173` (Vite). Main process is compiled by `tsc` into `dist-main/`. Changes to `src/main/` require a full restart; renderer changes hot-reload.

---

## Architecture

```
apps/browser/src/
├── main/                  # Electron main process
│   ├── index.ts           # Entry point, app lifecycle
│   ├── window-manager.ts  # BrowserWindow creation, battery/vibrancy
│   ├── ipc/               # All IPC handler registrations
│   ├── services/          # DB, Ollama, AI Gateway, ecosystem manager
│   ├── adblock/           # Request filter
│   └── preload/           # Context bridge (browser-preload.ts)
├── renderer/              # React 19 renderer
│   ├── pages/             # NewTab, Settings
│   ├── components/        # Browser chrome, ecosystem dock, shared UI
│   ├── store/             # Zustand stores (tabs, ecosystem, auth, workspace)
│   └── hooks/             # useEcosystemEvents, useKeywords, etc.
└── shared/                # Types, IPC channel names, constants
```

---

## License

MIT — see LICENSE file.
