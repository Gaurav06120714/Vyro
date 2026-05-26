import type { FastifyInstance } from 'fastify';
import { TaskService } from '../services/taskService.js';

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  const taskService = new TaskService();

  // GET /sessions/:taskId — Get task info (session proxy)
  app.get<{ Params: { taskId: string } }>('/sessions/:taskId', async (request, reply) => {
    const task = await taskService.getTask(request.params.taskId);
    if (!task) {
      return reply.code(404).send({ error: 'Task not found' });
    }

    reply.send({
      taskId: task.id,
      status: task.status,
      instruction: task.instruction,
    });
  });
}
