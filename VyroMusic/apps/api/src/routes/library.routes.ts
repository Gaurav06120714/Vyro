import { FastifyInstance } from 'fastify';
import { LibraryService } from '../services/library.service';
import { CatalogService } from '../services/catalog.service';
import { getDb } from '../db/client';
import { requireAuth } from '../middleware/auth';

export async function libraryRoutes(app: FastifyInstance) {
  const library = new LibraryService(getDb());
  const catalog = new CatalogService(getDb());

  // ── Liked tracks ──────────────────────────────────────────────────────────

  app.get('/me/library/tracks', { preHandler: [requireAuth] }, async (req) => {
    const { sub: userId } = req.user as { sub: string };
    const { limit = '50', offset = '0' } = req.query as Record<string, string>;
    return library.getLikedTracks(userId, parseInt(limit), parseInt(offset));
  });

  app.post('/me/library/tracks/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { sub: userId } = req.user as { sub: string };
    const { id: trackId } = req.params as { id: string };
    await library.likeTrack(userId, trackId);
    return reply.status(204).send();
  });

  app.delete('/me/library/tracks/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { sub: userId } = req.user as { sub: string };
    const { id: trackId } = req.params as { id: string };
    await library.unlikeTrack(userId, trackId);
    return reply.status(204).send();
  });

  // ── Playlists ─────────────────────────────────────────────────────────────

  app.get('/me/playlists', { preHandler: [requireAuth] }, async (req) => {
    const { sub: userId } = req.user as { sub: string };
    return library.getUserPlaylists(userId);
  });

  app.post('/me/playlists', { preHandler: [requireAuth] }, async (req, reply) => {
    const { sub: userId } = req.user as { sub: string };
    const { title, description, isPublic = true } = req.body as { title: string; description?: string; isPublic?: boolean };
    if (!title) return reply.status(400).send({ error: 'Title required' });
    return library.createPlaylist(userId, title, description, isPublic);
  });

  // Public featured playlists — no auth required
  app.get('/playlists/featured', async (req, reply) => {
    const { limit = '10' } = req.query as Record<string, string>;
    const playlists = await library.getFeaturedPlaylists(parseInt(limit));
    return playlists;
  });

  app.get('/playlists/:id', { preHandler: [async (req, reply) => { try { await req.jwtVerify(); } catch { /* optional */ } }] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = (req.user as { sub: string } | undefined)?.sub;
    const playlist = await library.getPlaylist(id, userId);
    if (!playlist) return reply.status(404).send({ error: 'Playlist not found' });
    const tracks = await library.getPlaylistTracks(id);
    return { ...playlist, tracks };
  });

  app.put('/playlists/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { sub: userId } = req.user as { sub: string };
    const { id } = req.params as { id: string };
    const data = req.body as { title?: string; description?: string; isPublic?: boolean };
    const updated = await library.updatePlaylist(id, userId, data);
    if (!updated) return reply.status(404).send({ error: 'Playlist not found' });
    return updated;
  });

  app.delete('/playlists/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { sub: userId } = req.user as { sub: string };
    const { id } = req.params as { id: string };
    await library.deletePlaylist(id, userId);
    return reply.status(204).send();
  });

  app.post('/playlists/:id/tracks', { preHandler: [requireAuth] }, async (req, reply) => {
    const { sub: userId } = req.user as { sub: string };
    const { id: playlistId } = req.params as { id: string };
    const { trackId } = req.body as { trackId: string };
    if (!trackId) return reply.status(400).send({ error: 'trackId required' });
    await library.addTrackToPlaylist(playlistId, trackId, userId);
    return reply.status(204).send();
  });

  app.delete('/playlists/:id/tracks/:trackId', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id: playlistId, trackId } = req.params as { id: string; trackId: string };
    await library.removeTrackFromPlaylist(playlistId, trackId);
    return reply.status(204).send();
  });

  // ── History ───────────────────────────────────────────────────────────────

  app.get('/me/history', { preHandler: [requireAuth] }, async (req) => {
    const { sub: userId } = req.user as { sub: string };
    return library.getHistory(userId);
  });

  // ── Events ────────────────────────────────────────────────────────────────

  app.post('/events/play-end', { preHandler: [requireAuth] }, async (req, reply) => {
    const { sub: userId } = req.user as { sub: string };
    const { trackId, durationPlayedMs, skipped, source } = req.body as {
      trackId: string; durationPlayedMs: number; skipped: boolean; source: string;
    };
    await library.addPlayEvent(userId, trackId, durationPlayedMs, skipped, source || 'direct');
    if (!skipped && durationPlayedMs > 30000) {
      await catalog.incrementPlayCount(trackId);
    }
    return reply.status(202).send({ ok: true });
  });
}
