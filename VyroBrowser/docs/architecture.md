# Vyro Browser — Architecture

## Overview

Vyro Browser is a production-grade AI browser automation platform. Users describe web tasks in natural language; the system executes them autonomously in a real Chromium browser using Claude as the reasoning engine.

```
User → Web UI → API Server → Task Queue → Worker → Agent Loop → Browser
                                ↕ WebSocket streaming ↕
                              User sees live screenshots & logs
```

## System Components

### 1. Web Frontend (`apps/web`)

Next.js 14 (App Router) application providing the user interface.

**3-panel layout:**
- **Left**: Chat panel — task input, message history, agent reasoning stream
- **Center**: Browser preview — live screenshots, screenshot timeline
- **Right**: Log panel — real-time agent logs with level filtering

**Key technologies:**
- Clerk for authentication (SSO, JWT)
- WebSocket (`AgentWebSocket` class in `src/lib/ws.ts`) for real-time streaming
- TailwindCSS + shadcn/ui components

**State management:** React hooks only (`useAgentStream`, `useTaskSession`) — no external state library needed at this scale.

### 2. API Server (`apps/api`)

Fastify HTTP + WebSocket server.

**Responsibilities:**
- Task CRUD (create, list, get, cancel, delete)
- WebSocket connection registry — maps `taskId` → connected clients
- Human approval routing — receives approval requests from worker, sends to browser client, waits for response
- Rate limiting (per-user), auth middleware (Clerk JWT)
- Enqueues jobs to BullMQ

**Endpoints:**
```
POST   /tasks                    Create task
GET    /tasks                    List tasks (paginated)
GET    /tasks/:id                Get task details
GET    /tasks/:id/screenshots    Get screenshots
POST   /tasks/:id/cancel         Cancel task
DELETE /tasks/:id                Delete task
GET    /health                   Liveness check
GET    /health/ready             Readiness check (DB ping)
WS     /ws?taskId=&token=        WebSocket event stream
```

### 3. Worker (`apps/worker`)

BullMQ worker that runs the AI agent loop for each task.

**Responsibilities:**
- Dequeues jobs from `agent-tasks` queue
- Creates a `BrowserSession` for each job
- Runs `AgentLoop` (plan → execute → clean up)
- Publishes events to Redis pub/sub → API server → WebSocket clients
- Manages graceful shutdown (closes browser sessions cleanly)

**Concurrency:** Configurable via `WORKER_CONCURRENCY` (default 5). Each concurrent job gets its own Playwright `BrowserContext`.

### 4. Agent Core (`packages/agent-core`)

The AI reasoning layer.

#### `PlannerAgent`
- Sends task instruction to Claude with the planner system prompt
- Returns a structured `TaskPlan` (goal, subgoals, startUrl, estimatedSteps)
- Planner runs once per task before execution begins

#### `BrowserAgent`
- Manages the Claude tool-calling loop
- Each iteration: sends current context to Claude → receives tool calls → executes them → feeds results back
- Handles all 14 browser tool types
- Streams events (screenshots, steps, logs, reasoning) via callback
- Anti-loop protection: detects repeated actions and injects recovery prompts

#### `AgentLoop`
- Orchestrates: PlannerAgent → BrowserSession creation → BrowserAgent → cleanup
- Single entry point for the worker

#### Memory (`ShortTermMemory`)
- Stores recent page states, actions, observations in bounded circular buffer
- Provides `getSummary()` for injecting into Claude context
- `isInLoop()` detects when the agent is stuck

#### Safety (`SafetyGuard`)
- Blocks navigation to internal/private network ranges
- Enforces domain allow/block lists
- Detects payment pages, sensitive form fields
- Returns `requiresApproval: true` for sensitive actions

### 5. Browser Engine (`packages/browser-engine`)

Playwright abstraction layer.

#### `BrowserManager`
- Manages the Chromium `Browser` instance lifecycle
- Creates/destroys `BrowserContext` instances (one per task)
- Session pooling with `maxSessions` cap
- Automatic GC for idle sessions
- Stealth mode (hides `navigator.webdriver`, overrides Chrome APIs)

#### `BrowserSession`
- Wraps a `BrowserContext` + `Page`
- Provides typed action methods: `navigate`, `click`, `type`, `scroll`, `keyPress`, `hover`, `dragDrop`, `takeScreenshot`, `getPageState`, `extractData`, `waitForElement`
- Auto-dismisses browser dialogs

### 6. DOM Parser (`packages/dom-parser`)

In-browser DOM analysis.

#### `DomExtractor`
- Runs Playwright `page.evaluate()` to analyze the live DOM
- Extracts interactive elements with stable selectors (ID → data-testid → aria-label → name → role → text)
- Detects captchas, modals, visible errors
- Extracts forms with all fields, labels, and options
- Limits output to avoid token overflow (100 elements max)

#### `StateSerializer`
- Converts `BrowserState` to human-readable text for Claude context
- `serialize()`: full format with all elements
- `serializeCompact()`: one-line summary

### 7. AI Prompts (`packages/ai-prompts`)

Prompt library for Claude.

#### `BROWSER_AGENT_SYSTEM_PROMPT`
5000-word production prompt covering:
- Available tool catalog with usage guidance
- Observe→Orient→Plan→Act→Verify loop
- Selector strategy (preference order)
- Error recovery patterns
- Safety rules (never violate)
- Anti-loop detection
- Output format

#### `browserTools`
Full Anthropic SDK `Tool[]` definitions for all 14 browser actions.

#### `PLANNER_SYSTEM_PROMPT`
Structured planning prompt that produces JSON `TaskPlan` objects.

## Data Flow

### Task Creation
```
1. User submits instruction via ChatPanel
2. POST /tasks → API creates DB record, enqueues BullMQ job
3. API returns {taskId}
4. Frontend opens WebSocket: ws://api/ws?taskId=X&token=Y
5. Worker picks up job
```

### Agent Execution Loop
```
Worker:
  1. PlannerAgent.plan(instruction) → TaskPlan
  2. BroadcastToTask(taskId, {type: 'task:plan', payload: plan})
  3. BrowserSession.navigate(plan.startUrl)
  4. Loop until max_iterations:
     a. Send messages to Claude with tools
     b. Claude returns tool_use blocks
     c. For each tool:
        - SafetyGuard.checkAction() → allowed?
        - Execute via BrowserSession
        - If screenshot → broadcast task:screenshot
        - If approval needed → requestApproval() → wait for client response
     d. Feed tool results back to Claude
     e. If stop_reason = end_turn → done
  5. BroadcastToTask(taskId, {type: 'task:completed'})
  6. BrowserSession.close()
```

### WebSocket Event Flow
```
Worker → Redis Pub/Sub → API Server → WebSocket → Browser Client
                                          ↕
                              Client approval responses
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `tasks` | Task lifecycle, instruction, status, plan, result |
| `execution_steps` | Individual browser actions with outcomes |
| `screenshots` | Screenshot metadata (base64 not stored in DB) |
| `browser_sessions` | Active Playwright session tracking |

## Security Model

1. **Authentication**: Clerk JWT on all HTTP routes and WebSocket connections
2. **Authorization**: All data queries filter by `userId` — users can only access their own tasks
3. **Rate limiting**: 100 req/min per user (Redis-backed)
4. **Network isolation**: Safety guard blocks all private/internal network navigations
5. **Domain control**: Per-task `allowedDomains`/`blockedDomains` lists
6. **Human in the loop**: Sensitive actions (payments, form submissions, file uploads) require explicit user approval via WebSocket before execution
7. **Secrets**: API keys injected via environment variables, never logged or exposed in screenshots

## Scaling Considerations

- **Horizontal API scaling**: Stateless (WebSocket state in Redis pub/sub) — scale to N replicas
- **Worker scaling**: Add more worker replicas, each shares the BullMQ queue
- **Browser sessions**: Each worker can hold up to `BROWSER_MAX_SESSIONS` concurrent contexts
- **Database**: Drizzle with connection pooling (max 20 connections per API instance)
- **Redis**: Single instance is sufficient up to ~10k concurrent tasks; upgrade to Redis Cluster for more
