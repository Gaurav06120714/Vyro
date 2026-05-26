import type { FastifyInstance } from 'fastify';
import { itunesService } from '../services/itunes.service';

export async function itunesRoutes(app: FastifyInstance) {
  // GET /itunes/search?q=&limit=
  app.get<{ Querystring: { q: string; limit?: string } }>('/search', async (req, reply) => {
    const { q, limit } = req.query;
    if (!q?.trim()) return reply.status(400).send({ error: 'Query param q is required' });
    const tracks = await itunesService.search(q, limit ? parseInt(limit) : 50);
    return tracks;
  });

  // GET /itunes/trending?limit=
  app.get<{ Querystring: { limit?: string } }>('/trending', async (req) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    return itunesService.trending(limit);
  });

  // GET /itunes/new-releases?limit=
  app.get<{ Querystring: { limit?: string } }>('/new-releases', async (req) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    return itunesService.newReleases(limit);
  });

  // GET /itunes/tracks/:itunesId
  app.get<{ Params: { itunesId: string } }>('/tracks/:itunesId', async (req, reply) => {
    const track = await itunesService.getTrack(req.params.itunesId);
    if (!track) return reply.status(404).send({ error: 'Track not found' });
    return track;
  });

  // GET /itunes/tracks/:itunesId/stream — returns the preview URL (no auth needed)
  app.get<{ Params: { itunesId: string } }>('/tracks/:itunesId/stream', async (req, reply) => {
    const track = await itunesService.getTrack(req.params.itunesId);
    if (!track || !track.previewUrl) {
      return reply.status(404).send({ error: 'Preview not available' });
    }
    return { url: track.previewUrl, token: 'itunes-preview' };
  });
}
