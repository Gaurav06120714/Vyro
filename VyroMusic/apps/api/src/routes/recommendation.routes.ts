import { FastifyInstance } from 'fastify';
import { RecommendationService } from '../services/recommendation.service';
import { CatalogService } from '../services/catalog.service';
import { getDb } from '../db/client';
import { requireAuth, optionalAuth } from '../middleware/auth';

export async function recommendationRoutes(app: FastifyInstance) {
  const recs = new RecommendationService(getDb());
  const catalog = new CatalogService(getDb());

  /**
   * GET /recommendations/for-you
   * Personalised feed for the logged-in user.
   * Cached for 1 hour per user.
   */
  app.get('/recommendations/for-you', { preHandler: [requireAuth] }, async (req) => {
    const { sub: userId } = req.user as { sub: string };
    const limit = 20;

    // Check cache first
    const cached = await recs.getCached(userId, 'for_you');
    if (cached && cached.length > 0) {
      const tracks = await Promise.all(cached.map(id => catalog.getTrack(id, userId)));
      return { tracks: tracks.filter(Boolean), cached: true };
    }

    const trackIds = await recs.forYou(userId, limit);
    await recs.setCache(userId, 'for_you', trackIds, 'genre+artist match');
    const tracks = await Promise.all(trackIds.map(id => catalog.getTrack(id, userId)));
    return { tracks: tracks.filter(Boolean), cached: false };
  });

  /**
   * GET /recommendations/discover
   * "Discover Weekly"-style — genres outside user's comfort zone.
   */
  app.get('/recommendations/discover', { preHandler: [requireAuth] }, async (req) => {
    const { sub: userId } = req.user as { sub: string };
    const trackIds = await recs.discover(userId, 20);
    const tracks = await Promise.all(trackIds.map(id => catalog.getTrack(id, userId)));
    return { tracks: tracks.filter(Boolean) };
  });

  /**
   * GET /recommendations/radio/:trackId
   * Infinite radio starting from a seed track. No auth required.
   */
  app.get('/recommendations/radio/:trackId', { preHandler: [optionalAuth] }, async (req) => {
    const { trackId } = req.params as { trackId: string };
    const userId = (req.user as { sub: string } | undefined)?.sub;
    const { exclude = '' } = req.query as { exclude?: string };
    const excludeIds = exclude ? exclude.split(',').filter(Boolean) : [];

    const trackIds = await recs.radio(trackId, 30, excludeIds);
    const tracks = await Promise.all(trackIds.map(id => catalog.getTrack(id, userId)));
    return { tracks: tracks.filter(Boolean), seedTrackId: trackId };
  });

  /**
   * GET /recommendations/trending
   * Global chart — no auth required.
   */
  app.get('/recommendations/trending', async () => {
    const trackIds = await recs.trending(20);
    const tracks = await Promise.all(trackIds.map(id => catalog.getTrack(id)));
    return { tracks: tracks.filter(Boolean) };
  });

  /**
   * POST /recommendations/refresh
   * Force-refreshes the recommendation cache for the user.
   */
  app.post('/recommendations/refresh', { preHandler: [requireAuth] }, async (req) => {
    const { sub: userId } = req.user as { sub: string };
    const trackIds = await recs.forYou(userId, 20);
    await recs.setCache(userId, 'for_you', trackIds, 'manual refresh');
    return { ok: true, count: trackIds.length };
  });
}
