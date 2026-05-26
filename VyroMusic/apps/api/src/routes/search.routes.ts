import { FastifyInstance } from 'fastify';
import { getDb } from '../db/client';

export async function searchRoutes(app: FastifyInstance) {
  const db = getDb();

  // Full search across tracks, albums, artists
  app.get('/search', async (req) => {
    const { q = '', limit = '20', offset = '0', type = 'track,album,artist' } = req.query as Record<string, string>;
    if (!q.trim()) return { tracks: [], albums: [], artists: [], total: 0 };

    const term = `%${q.toLowerCase()}%`;
    const lim = Math.min(parseInt(limit), 50);
    const off = parseInt(offset);
    const types = type.split(',');

    const results: { tracks: unknown[]; albums: unknown[]; artists: unknown[] } = {
      tracks: [], albums: [], artists: [],
    };

    if (types.includes('track')) {
      const tracks = await db.query(
        `SELECT t.id, t.title, t.duration_ms, t.track_number, t.explicit, t.isrc,
                t.hls_manifest_url, t.preview_url, t.play_count, t.like_count,
                t.status, t.genres, t.source,
                a.id as artist_id, a.name as artist_name, a.avatar_url as artist_avatar,
                a.verified as artist_verified, a.monthly_listeners,
                al.id as album_id, al.title as album_title,
                al.cover_url as album_cover, al.release_date, al.album_type
         FROM tracks t
         JOIN artists a ON a.id = t.artist_id
         JOIN albums al ON al.id = t.album_id
         WHERE t.status = 'active' AND (
           LOWER(t.title) LIKE $1 OR
           LOWER(a.name) LIKE $1 OR
           LOWER(al.title) LIKE $1
         )
         ORDER BY
           CASE WHEN LOWER(t.title) = $2 THEN 0
                WHEN LOWER(t.title) LIKE $3 THEN 1
                ELSE 2 END,
           t.play_count DESC
         LIMIT $4 OFFSET $5`,
        [term, q.toLowerCase(), `${q.toLowerCase()}%`, lim, off]
      );
      results.tracks = tracks.rows.map((r: Record<string, unknown>) => ({
        id: r.id, title: r.title, durationMs: r.duration_ms, trackNumber: r.track_number,
        explicit: r.explicit, isrc: r.isrc, hlsManifestUrl: r.hls_manifest_url,
        previewUrl: r.preview_url, playCount: r.play_count, likeCount: r.like_count,
        status: r.status, genres: r.genres || [], source: r.source,
        albumId: r.album_id, artistId: r.artist_id,
        artist: { id: r.artist_id, name: r.artist_name, avatarUrl: r.artist_avatar, verified: r.artist_verified, monthlyListeners: r.monthly_listeners, bio: null, coverUrl: null, genres: [], country: null },
        album: { id: r.album_id, title: r.album_title, coverUrl: r.album_cover, releaseDate: r.release_date, albumType: r.album_type, artistId: r.artist_id, totalTracks: 0, label: null },
      }));
    }

    if (types.includes('album')) {
      const albums = await db.query(
        `SELECT al.id, al.title, al.cover_url, al.release_date, al.album_type, al.total_tracks, al.label,
                a.id as artist_id, a.name as artist_name, a.avatar_url as artist_avatar, a.verified as artist_verified
         FROM albums al
         JOIN artists a ON a.id = al.artist_id
         WHERE LOWER(al.title) LIKE $1 OR LOWER(a.name) LIKE $1
         ORDER BY
           CASE WHEN LOWER(al.title) = $2 THEN 0 ELSE 1 END
         LIMIT $3 OFFSET $4`,
        [term, q.toLowerCase(), lim, off]
      );
      results.albums = albums.rows.map((r: Record<string, unknown>) => ({
        id: r.id, title: r.title, coverUrl: r.cover_url, releaseDate: r.release_date,
        albumType: r.album_type, totalTracks: r.total_tracks, label: r.label, artistId: r.artist_id,
        artist: { id: r.artist_id, name: r.artist_name, avatarUrl: r.artist_avatar, verified: r.artist_verified },
      }));
    }

    if (types.includes('artist')) {
      const artists = await db.query(
        `SELECT id, name, bio, avatar_url, cover_url, verified, monthly_listeners, genres, country
         FROM artists
         WHERE LOWER(name) LIKE $1
         ORDER BY
           CASE WHEN LOWER(name) = $2 THEN 0
                WHEN LOWER(name) LIKE $3 THEN 1
                ELSE 2 END,
           monthly_listeners DESC
         LIMIT $4 OFFSET $5`,
        [term, q.toLowerCase(), `${q.toLowerCase()}%`, lim, off]
      );
      results.artists = artists.rows.map((r: Record<string, unknown>) => ({
        id: r.id, name: r.name, bio: r.bio, avatarUrl: r.avatar_url, coverUrl: r.cover_url,
        verified: r.verified, monthlyListeners: r.monthly_listeners, genres: r.genres || [], country: r.country,
      }));
    }

    return {
      ...results,
      total: results.tracks.length + results.albums.length + results.artists.length,
    };
  });

  // Autocomplete — fast prefix search
  app.get('/search/autocomplete', async (req) => {
    const { q = '' } = req.query as { q: string };
    if (q.length < 2) return [];

    const term = `${q.toLowerCase()}%`;
    const tracks = await db.query(
      `SELECT t.id, t.title, 'track' as type, a.name as subtitle
       FROM tracks t JOIN artists a ON a.id = t.artist_id
       WHERE LOWER(t.title) LIKE $1 AND t.status = 'active'
       ORDER BY t.play_count DESC LIMIT 3`,
      [term]
    );

    const artists = await db.query(
      `SELECT id, name as title, 'artist' as type, '' as subtitle
       FROM artists WHERE LOWER(name) LIKE $1
       ORDER BY monthly_listeners DESC LIMIT 3`,
      [term]
    );

    return [...tracks.rows, ...artists.rows].slice(0, 8);
  });
}
