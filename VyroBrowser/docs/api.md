# Vyro Browser API Reference

Base URL: `http://localhost:3001`

All authenticated endpoints require `Authorization: Bearer <clerk_jwt>` header.

## Authentication

Vyro uses [Clerk](https://clerk.com) for authentication. Obtain a JWT from the Clerk SDK in your frontend and pass it as the `Authorization` header.

In development without `CLERK_SECRET_KEY`, all requests are authenticated as `dev_user_001`.

---

## Tasks

### Create Task

```http
POST /tasks
Content-Type: application/json
Authorization: Bearer <token>

{
  "instruction": "Find the current price of Apple stock on Yahoo Finance",
  "startUrl": "https://finance.yahoo.com",  // optional
  "options": {
    "maxSteps": 30,                          // default: 50
    "requireApprovalFor": ["type", "upload"], // action types needing human approval
    "allowedDomains": ["yahoo.com"],         // restrict to these domains
    "headless": true,                        // default: true
    "recordSession": false                   // default: false
  }
}
```

**Response 201:**
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending"
}
```

---

### List Tasks

```http
GET /tasks?page=1&pageSize=20&status=completed
Authorization: Bearer <token>
```

**Query parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `pageSize` | number | 20 | Results per page (max 100) |
| `status` | string | — | Filter by status |

**Response 200:**
```json
{
  "tasks": [...],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

---

### Get Task

```http
GET /tasks/:id
Authorization: Bearer <token>
```

**Response 200:** Full task object with `plan`, `steps`, `result`.

---

### Get Screenshots

```http
GET /tasks/:id/screenshots
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "screenshots": [
    {
      "id": "...",
      "taskId": "...",
      "stepId": "...",
      "url": "/screenshots/...",
      "pageUrl": "https://example.com",
      "width": 1440,
      "height": 900,
      "timestamp": "2026-05-19T10:00:00Z"
    }
  ]
}
```

---

### Cancel Task

```http
POST /tasks/:id/cancel
Authorization: Bearer <token>
```

**Response 200:**
```json
{ "success": true, "status": "cancelled" }
```

---

### Delete Task

```http
DELETE /tasks/:id
Authorization: Bearer <token>
```

**Response 200:**
```json
{ "success": true }
```

---

## Health

### Liveness

```http
GET /health
```

```json
{ "status": "ok", "timestamp": "...", "version": "0.1.0" }
```

### Readiness (checks DB)

```http
GET /health/ready
```

```json
{ "status": "ready", "database": "connected" }
```

---

## WebSocket

```
ws://localhost:3001/ws?taskId=<task_id>&token=<clerk_jwt>
```

### Server → Client Events

| `type` | Description | Payload |
|--------|-------------|---------|
| `task:started` | Task execution began | `{taskId, instruction}` |
| `task:plan` | Planner produced a plan | `{plan: TaskPlan}` |
| `task:step:start` | Agent starting a step | `{stepNumber, tool, description}` |
| `task:step:complete` | Step finished | `{stepNumber, tool, success, error?}` |
| `task:screenshot` | New screenshot captured | `{screenshot: Screenshot}` |
| `task:log` | Agent log entry | `AgentLog` |
| `task:approval:required` | Action needs human approval | `{stepId, action, reason, timeoutMs}` |
| `agent:reasoning` | Claude's reasoning text | `{text: string}` |
| `task:completed` | Task finished successfully | `{result: TaskResult, durationMs}` |
| `task:failed` | Task failed | `{error: string}` |
| `ping` | Connection confirmation | `{connected: true, userId}` |

### Client → Server Events

| `type` | Description | Payload |
|--------|-------------|---------|
| `task:approval:response` | User approves/rejects action | `{stepId, approved: boolean}` |
| `ping` | Keep-alive | `{}` |

### Example WebSocket session

```javascript
const ws = new WebSocket(`ws://localhost:3001/ws?taskId=${taskId}&token=${token}`);

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  
  switch (msg.type) {
    case 'task:screenshot':
      showScreenshot(msg.payload.screenshot.base64);
      break;
    case 'task:approval:required':
      const approved = await showApprovalDialog(msg.payload);
      ws.send(JSON.stringify({
        type: 'task:approval:response',
        taskId: msg.taskId,
        payload: { stepId: msg.payload.stepId, approved },
        timestamp: new Date().toISOString(),
      }));
      break;
    case 'task:completed':
      showResult(msg.payload.result);
      break;
  }
};
```

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Human-readable error message",
  "details": {}  // optional, for validation errors
}
```

| Status | Meaning |
|--------|---------|
| 400 | Invalid request body or parameters |
| 401 | Missing or invalid authentication |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
