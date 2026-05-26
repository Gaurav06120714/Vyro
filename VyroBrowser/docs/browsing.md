# Browsing Guide

Vyro Browser has two modes: **manual** (you drive) and **AI** (the agent drives).

---

## Manual Mode — you control the browser

### Basic browser (no saved login)

```bash
pnpm browse
# or with a URL:
pnpm browse https://youtube.com
```

Opens a real Chromium window you can use like any browser.
Logins are not saved — when you close, the session ends.

### Persistent browser (logins saved between sessions)

```bash
pnpm browse:saved
# or with a URL:
pnpm browse:saved https://www.youtube.com
```

Your profile is stored in `~/.vyro-browser/profile`.
Sign in to YouTube, Google, Twitter, etc. once — you stay logged in on every future `browse:saved` run.

**To reset the profile** (log out of everything):

```bash
rm -rf ~/.vyro-browser/profile
```

### How it works

Both scripts use Playwright's Chromium with:
- `headless: false` — the window is fully visible
- `AutomationControlled` flag hidden — sites do not see the "Chrome is being controlled" banner
- `viewport: null` — the window uses your full screen size
- A realistic user-agent string

---

## AI Mode — the agent controls the browser

Open the web UI at http://localhost:3000 and type a task in the chat panel.

Examples:
- "Search YouTube for lo-fi beats and play the first result"
- "Go to Hacker News and summarise the top 3 stories"
- "Open my Gmail and list unread emails from today"

The agent plans the task, opens its own Chromium session, and streams live screenshots back to the UI so you can watch every step.

### Approvals

Sensitive actions (form submissions, purchases, deletes) show a confirmation prompt in the UI. The agent pauses and waits for your approval before proceeding.

---

## Differences at a glance

| | Manual (`pnpm browse`) | AI Mode (web UI) |
|---|---|---|
| Who drives | You | The AI agent |
| Session visible | Yes — your screen | Yes — streamed as screenshots |
| Logins saved | Only with `browse:saved` | Not saved by default |
| Use case | Normal browsing | Automated tasks |
| Start command | `pnpm browse` | `pnpm dev` then open UI |

---

## Tips

- Use `pnpm browse:saved` to log in to sites once, then give the AI access to those sites via AI Mode (the AI uses a separate session, so you'll need to log in again in the AI's session or share cookies manually).
- `Ctrl+C` in the terminal gracefully closes the browser and saves the profile.
- Both scripts accept any URL as the first argument: `pnpm browse https://github.com`.
