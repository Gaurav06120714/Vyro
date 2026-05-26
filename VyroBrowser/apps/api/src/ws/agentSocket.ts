import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import type { WsMessage } from '@vyro/shared-types';

// Registry of active WebSocket connections, keyed by taskId
const taskConnections = new Map<string, Set<WebSocket>>();

/**
 * Broadcast a WsMessage to all WebSocket clients subscribed to a taskId.
 * Called by SimpleQueue/AgentLoop when events are emitted.
 */
export function broadcastToTask(taskId: string, message: WsMessage): void {
  const connections = taskConnections.get(taskId);
  if (!connections || connections.size === 0) return;

  const serialized = JSON.stringify(message);
  for (const ws of connections) {
    try {
      if (ws.readyState === ws.OPEN) {
        ws.send(serialized);
      }
    } catch {
      // Ignore send errors for closed sockets
    }
  }
}

/**
 * Register WebSocket routes.
 * Client connects to: ws://host/ws?taskId=<id>
 *
 * No authentication — this is a local single-user tool.
 */
export async function agentSocketRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { taskId?: string } }>(
    '/ws',
    { websocket: true },
    (socket, request) => {
      const { taskId } = request.query;

      if (!taskId) {
        socket.send(JSON.stringify({ error: 'taskId query parameter required' }));
        socket.close(1008, 'Missing taskId');
        return;
      }

      request.log.info({ taskId }, 'WebSocket client connected');

      // Subscribe to task events
      if (!taskConnections.has(taskId)) {
        taskConnections.set(taskId, new Set());
      }
      taskConnections.get(taskId)!.add(socket);

      // Send connected confirmation
      socket.send(
        JSON.stringify({
          type: 'ping',
          taskId,
          payload: { connected: true },
          timestamp: new Date().toISOString(),
        })
      );

      // Handle incoming messages from client
      socket.on('message', (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString()) as WsMessage;

          // Handle approval responses
          if (msg.type === 'task:approval:response') {
            const payload = msg.payload as { stepId: string; approved: boolean };
            const callbacks = pendingApprovals.get(msg.taskId);
            if (callbacks) {
              const callback = callbacks.get(payload.stepId);
              if (callback) {
                callback(payload.approved);
                callbacks.delete(payload.stepId);
              }
            }
          }

          // Pong on ping
          if (msg.type === 'ping') {
            socket.send(
              JSON.stringify({
                type: 'pong',
                taskId,
                payload: {},
                timestamp: new Date().toISOString(),
              })
            );
          }
        } catch {
          // Ignore malformed messages
        }
      });

      // Cleanup on disconnect
      socket.on('close', () => {
        request.log.info({ taskId }, 'WebSocket client disconnected');
        taskConnections.get(taskId)?.delete(socket);
        if (taskConnections.get(taskId)?.size === 0) {
          taskConnections.delete(taskId);
        }
      });

      socket.on('error', (err: Error) => {
        request.log.error({ err, taskId }, 'WebSocket error');
      });
    }
  );
}

// ── Approval handling ─────────────────────────────────────────────────────────

type ApprovalCallback = (approved: boolean) => void;
const pendingApprovals = new Map<string, Map<string, ApprovalCallback>>();

/**
 * Send an approval request to the WebSocket client and wait for response.
 * Resolves when the user responds or times out (auto-reject after timeout).
 */
export function requestApproval(
  taskId: string,
  stepId: string,
  action: Record<string, unknown>,
  reason: string,
  timeoutMs = 120000
): Promise<boolean> {
  return new Promise((resolve) => {
    if (!pendingApprovals.has(taskId)) {
      pendingApprovals.set(taskId, new Map());
    }

    let resolved = false;
    const wrappedResolve = (approved: boolean) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(approved);
      }
    };

    pendingApprovals.get(taskId)!.set(stepId, wrappedResolve);

    // Send approval request to all connected clients for this task
    broadcastToTask(taskId, {
      type: 'task:approval:required',
      taskId,
      payload: { stepId, action, reason, timeoutMs },
      timestamp: new Date().toISOString(),
    });

    // Auto-reject after timeout
    const timer = setTimeout(() => {
      const callbacks = pendingApprovals.get(taskId);
      if (callbacks?.has(stepId)) {
        callbacks.delete(stepId);
        wrappedResolve(false);
      }
    }, timeoutMs);
  });
}
