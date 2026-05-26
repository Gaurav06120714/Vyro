# Agent Workflow

## Overview

Vyro uses a two-phase approach to browser automation:

1. **Planning Phase** — A dedicated PlannerAgent creates a structured execution plan
2. **Execution Phase** — The BrowserAgent runs a Claude tool-calling loop to carry out the plan

## Phase 1: Planning

```
User instruction
      ↓
PlannerAgent (claude-sonnet-4-6)
      ↓
TaskPlan {
  goal: "...",
  subgoals: ["step 1", "step 2", ...],
  startUrl: "https://...",
  estimatedSteps: N,
  reasoning: "..."
}
```

The planner uses a dedicated system prompt optimized for task decomposition. It returns structured JSON that the execution layer uses to initialize context.

**Why a separate planner?**
- Separates strategic thinking from tactical execution
- The planner can use a smaller/faster model for cost efficiency
- The plan becomes part of the execution agent's context, grounding it throughout

## Phase 2: Execution Loop

```
Initial context (instruction + plan summary)
      ↓
┌─── Claude Tool Calling Loop ───────────────────────────────┐
│                                                            │
│  1. OBSERVE: Claude analyzes current browser state         │
│     - URL, title, visible elements                         │
│     - Screenshots                                          │
│     - Previous action results                              │
│                                                            │
│  2. REASON: Claude produces reasoning text                 │
│     - "I can see the search box. I need to type..."        │
│                                                            │
│  3. ACT: Claude calls a tool                               │
│     - type({selector: "input[name=q]", text: "AI news"})   │
│                                                            │
│  4. EXECUTE: BrowserAgent runs the Playwright action       │
│     - Safety check → Playwright call → Result              │
│                                                            │
│  5. VERIFY: Result fed back to Claude                      │
│     - Success → continue                                   │
│     - Failure → Claude tries recovery                      │
│                                                            │
│  Repeat until stop_reason = end_turn                       │
└────────────────────────────────────────────────────────────┘
      ↓
TaskResult {
  success: true,
  summary: "...",
  extractedData: {...}
}
```

## Tool Calling Protocol

Claude uses the Anthropic tool-calling API. Each iteration:

1. Claude receives `messages` array (user prompt + previous tool results)
2. Claude returns `content` array with `text` blocks (reasoning) and `tool_use` blocks (actions)
3. BrowserAgent executes each `tool_use` block sequentially
4. Results are appended as `tool_result` blocks and fed back to Claude

```typescript
// Simplified tool-calling loop
while (iterations < maxIterations) {
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    tools: browserTools,
    messages,
  });

  messages.push({ role: 'assistant', content: response.content });

  if (response.stop_reason === 'end_turn') break;

  const toolResults = await executeToolCalls(response.content);
  messages.push({ role: 'user', content: toolResults });
}
```

## Error Recovery

When an action fails, Claude is informed via the `tool_result` with `is_error: true`. Claude then:

1. Analyzes the error message
2. Tries an alternative approach (different selector, scroll to element, etc.)
3. If stuck after 3 attempts on the same action, moves on or reports failure

### Loop Detection

`ShortTermMemory` tracks action frequency. If the same action description appears 3+ times, the loop injects a warning message:

```
⚠️ LOOP DETECTION: You appear to be repeating the same action "click #submit-btn".
Try a completely different approach or report that you are stuck.
```

## Human Approval Flow

```
BrowserAgent encounters sensitive action
      ↓
Calls onApprovalRequired(action, reason)
      ↓
Worker publishes {type: 'task:approval:required'} to Redis
      ↓
API server broadcasts to WebSocket client
      ↓
User sees approval dialog in UI
      ↓
User clicks Approve/Reject
      ↓
Client sends {type: 'task:approval:response', approved: bool}
      ↓
API server writes response to Redis key
      ↓
Worker polls Redis key → gets response
      ↓
onApprovalRequired() resolves with boolean
      ↓
Agent continues or aborts action
```

Approval requests time out after 2 minutes (auto-reject).

## Memory Management

`ShortTermMemory` maintains a bounded history to keep Claude's context focused:

| Type | Max | Purpose |
|------|-----|---------|
| State snapshots | 10 | Recent page states (URL, elements) |
| Actions | 50 total | What was done and the outcome |
| Completed steps | All | Full step history for summary |
| Logs | 200 | Agent log entries |

When limits are exceeded, the oldest entries of the lowest priority type are dropped.

## Context Window Strategy

To stay within Claude's context window:
- DOM summaries are capped at 100 interactive elements
- Visible text is limited to 8,000 characters per state
- Screenshots are JPEG-encoded at 80% quality (typically ~100-200KB)
- The conversation history keeps only the last N messages (pruned by the BrowserAgent)
- Memory summary replaces full history when context grows

## Safety Enforcement

Every action goes through `SafetyGuard` before execution:

```
BrowserAction
      ↓
SafetyGuard.checkAction()
      ↓
If blocked → return error to Claude (try alternative)
If requiresApproval → pause for human
If allowed → execute
```

Actions always blocked:
- Any navigation to `localhost`, `127.x`, `10.x`, `192.168.x`, `169.254.x`
- `file://` protocol URLs
- Domains on the blocklist

Actions requiring approval (configurable per task):
- Payment/checkout pages
- File uploads
- Sensitive form fields (password, credit card, SSN)
- Custom `requireApprovalFor` list from task options
