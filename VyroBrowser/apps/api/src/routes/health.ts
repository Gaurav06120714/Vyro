import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_request, reply) => {
    reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] ?? '0.1.0',
    });
  });

  app.get('/health/ready', async (_request, reply) => {
    try {
      db.get(sql`SELECT 1`);
      reply.send({ status: 'ready', database: 'sqlite:connected' });
    } catch (err) {
      reply.code(503).send({ status: 'not_ready', error: (err as Error).message });
    }
  });
}
