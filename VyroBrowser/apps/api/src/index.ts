import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import websocket from '@fastify/websocket';
import pino from 'pino';

import { getConfig } from './config.js';
import { initDatabase } from './db/index.js';
import { healthRoutes } from './routes/health.js';
import { taskRoutes } from './routes/tasks.js';
import { sessionRoutes } from './routes/sessions.js';
import { agentSocketRoutes } from './ws/agentSocket.js';
import { SimpleQueue } from './queue/SimpleQueue.js';
import type { AgentJobPayload } from '@vyro/shared-types';

async function bootstrap(): Promise<void> {
  const config = getConfig();

  const logger = pino({
    level: config.LOG_LEVEL,
    transport:
      config.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  });

  // Initialize SQLite database (creates tables if they don't exist)
  try {
    initDatabase();
    logger.info({ path: config.DATABASE_PATH }, 'SQLite database initialized');
  } catch (err) {
    logger.fatal({ err }, 'Failed to initialize database');
    process.exit(1);
  }

  const app = Fastify({
    logger: config.NODE_ENV === 'development' ? { level: config.LOG_LEVEL } : logger,
    trustProxy: true,
    bodyLimit: 5 * 1024 * 1024, // 5MB
  });

  // ── Plugins ─────────────────────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: true, // Allow all origins in this local-only tool
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  await app.register(websocket);

  // ── In-process task queue ────────────────────────────────────────────────────
  const taskQueue = new SimpleQueue<AgentJobPayload>({
    concurrency: config.WORKER_CONCURRENCY,
    logger: logger.child({ component: 'queue' }),
    ollamaBaseUrl: config.OLLAMA_BASE_URL,
    ollamaModel: config.OLLAMA_MODEL,
    browserHeadless: config.BROWSER_HEADLESS,
    browserMaxSessions: config.BROWSER_MAX_SESSIONS,
    browserTimeout: config.BROWSER_TIMEOUT_MS,
    browserNavigationTimeout: config.BROWSER_NAVIGATION_TIMEOUT_MS,
    browsersPath: config.PLAYWRIGHT_BROWSERS_PATH,
    allowedDomains: config.ALLOWED_DOMAINS.split(',').map((d) => d.trim()),
    blockedDomains: config.BLOCKED_DOMAINS.split(',').map((d) => d.trim()),
  });

  // ── Routes ───────────────────────────────────────────────────────────────────
  await app.register(healthRoutes);
  await app.register(taskRoutes, { taskQueue });
  await app.register(sessionRoutes);
  await app.register(agentSocketRoutes);

  // ── Global error handler ─────────────────────────────────────────────────────
  app.setErrorHandler((error, _request, reply) => {
    app.log.error({ err: error }, 'Unhandled error');
    reply.code(error.statusCode ?? 500).send({
      error: error.message ?? 'Internal Server Error',
    });
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Shutting down...');
    await taskQueue.shutdown();
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // ── Start ─────────────────────────────────────────────────────────────────────
  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    app.log.info(
      { port: config.PORT, env: config.NODE_ENV },
      'Vyro Browser API server started'
    );
  } catch (err) {
    app.log.fatal(err, 'Failed to start server');
    process.exit(1);
  }
}

await bootstrap();
