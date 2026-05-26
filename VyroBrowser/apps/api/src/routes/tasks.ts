import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { TaskService } from '../services/taskService.js';
import type { SimpleQueue } from '../queue/SimpleQueue.js';
import type { AgentJobPayload } from '@vyro/shared-types';

const createTaskSchema = z.object({
  instruction: z.string().min(1).max(2000),
  startUrl: z.string().url().optional(),
  options: z
    .object({
      maxSteps: z.number().int().min(1).max(100).optional(),
      requireApprovalFor: z.array(z.string()).optional(),
      allowedDomains: z.array(z.string()).optional(),
    })
    .optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(['pending', 'planning', 'running', 'paused', 'completed', 'failed', 'cancelled'])
    .optional(),
});

export async function taskRoutes(
  app: FastifyInstance,
  { taskQueue }: { taskQueue: SimpleQueue<AgentJobPayload> }
): Promise<void> {
  const taskService = new TaskService();

  // POST /tasks — Create a new task
  app.post('/tasks', async (request, reply) => {
    const body = createTaskSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'Invalid request body', details: body.error.format() });
    }

    const task = await taskService.createTask(body.data);

    // Enqueue the task for in-process execution
    await taskQueue.add({
      taskId: task.id,
      userId: 'local_user',
      instruction: task.instruction,
      startUrl: body.data.startUrl,
      options: body.data.options,
    });

    reply.code(201).send({ taskId: task.id, status: task.status });
  });

  // GET /tasks — List tasks
  app.get('/tasks', async (request, reply) => {
    const query = paginationSchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: 'Invalid query parameters' });
    }

    const result = await taskService.listTasks(query.data);
    reply.send({
      tasks: result.tasks,
      total: result.total,
      page: query.data.page,
      pageSize: query.data.pageSize,
    });
  });

  // GET /tasks/:id — Get a specific task
  app.get<{ Params: { id: string } }>('/tasks/:id', async (request, reply) => {
    const task = await taskService.getTask(request.params.id);
    if (!task) {
      return reply.code(404).send({ error: 'Task not found' });
    }
    reply.send(task);
  });

  // GET /tasks/:id/screenshots — Get screenshots for a task
  app.get<{ Params: { id: string } }>('/tasks/:id/screenshots', async (request, reply) => {
    const task = await taskService.getTask(request.params.id);
    if (!task) {
      return reply.code(404).send({ error: 'Task not found' });
    }
    const screenshots = await taskService.getTaskScreenshots(request.params.id);
    reply.send({ screenshots });
  });

  // POST /tasks/:id/cancel — Cancel a pending task
  app.post<{ Params: { id: string } }>('/tasks/:id/cancel', async (request, reply) => {
    // Remove from queue if still pending (not yet picked up)
    taskQueue.remove(request.params.id);

    const cancelled = await taskService.cancelTask(request.params.id);
    if (!cancelled) {
      return reply.code(400).send({
        error: 'Task cannot be cancelled (not found or already finished)',
      });
    }

    reply.send({ success: true, status: 'cancelled' });
  });

  // DELETE /tasks/:id — Delete a task record
  app.delete<{ Params: { id: string } }>('/tasks/:id', async (request, reply) => {
    const deleted = await taskService.deleteTask(request.params.id);
    if (!deleted) {
      return reply.code(404).send({ error: 'Task not found' });
    }
    reply.send({ success: true });
  });
}
