import 'dotenv/config';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';

import { authRoutes } from './routes/auth.routes';
import { catalogRoutes } from './routes/catalog.routes';
import { libraryRoutes } from './routes/library.routes';
import { searchRoutes } from './routes/search.routes';
import { recommendationRoutes } from './routes/recommendation.routes';
import { socialRoutes } from './routes/social.routes';
import { billingRoutes } from './routes/billing.routes';
import { itunesRoutes } from './routes/itunes.routes';
import { youtubeRoutes } from './routes/youtube.routes';

const app = Fastify({
  logger: { level: process.env.NODE_ENV === 'production' ? 'warn' : 'info' },
});

async function bootstrap() {
  // Security headers
  await app.register(fastifyHelmet, { contentSecurityPolicy: false });

  // CORS — allow credentials for cookie auth
  await app.register(fastifyCors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Cookie parsing (for httpOnly refresh token)
  await app.register(fastifyCookie);

  // JWT (access tokens in Authorization header)
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-prod',
    cookie: { cookieName: 'refresh_token', signed: false },
  });

  // Rate limiting
  await app.register(fastifyRateLimit, {
    max: 300,
    timeWindow: '1 minute',
    skipOnError: true,
  });

  // ── Route groups ──────────────────────────────────────────────────────────
  await app.register(authRoutes);            // /auth/*
  await app.register(catalogRoutes);         // /tracks/*, /albums/*, /artists/*
  await app.register(libraryRoutes);         // /me/library/*, /playlists/*
  await app.register(searchRoutes);          // /search, /search/autocomplete
  await app.register(recommendationRoutes);  // /recommendations/*   ← Phase 2
  await app.register(socialRoutes);          // /me/profile, /artists/:id/follow, /me/stats/*  ← Phase 2
  await app.register(billingRoutes);         // /billing/*
  await app.register(itunesRoutes, { prefix: '/itunes' }); // /itunes/*
  await app.register(youtubeRoutes);                        // /youtube/*

  // ── Health check ──────────────────────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  }));

  // 404
  app.setNotFoundHandler((_req, reply) => {
    reply.status(404).send({ error: 'Route not found' });
  });

  // Global error handler
  app.setErrorHandler((err, _req, reply) => {
    app.log.error(err);
    reply.status(err.statusCode || 500).send({ error: err.message || 'Internal Server Error' });
  });

  const port = parseInt(process.env.PORT || '3001');
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`🎵 Vyro Music API v2 running on http://localhost:${port}`);
}

bootstrap().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
