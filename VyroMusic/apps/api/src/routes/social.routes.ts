import { FastifyInstance } from 'fastify';
import { getDb } from '../db/client';
import { requireAuth } from '../middleware/auth';

/**
 * Social routes — Phase 2
 * Artist following, user profile, follower counts
 */
export async function socialRoutes(app: FastifyInstance) {
  const db = getDb();

  // ── Artist Follow / Unfollow ───────────────────────────────────────────────

  /** Follow an artist */
  app.post('/artists/:id/follow', { preHandler: [requireAuth] }, async (req, reply) => {
    const { sub: userId } = req.user as { sub: string };
    const { id: artistId } = req.params as { id: string };

    await db.query(
      `INSERT INTO user_followed_artists (user_id, artist_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [userId, artistId]
    );
    await db.query(
      `UPDATE artists SET follower_count = follower_count + 1 WHERE id = $1`,
      [artistId]
    );
    return reply.status(204).send();
  });

  /** Unfollow an artist */
  app.delete('/artists/:id/follow', { preHandler: [requireAuth] }, async (req, reply) => {
    const { sub: userId } = req.user as { sub: string };
    const { id: artistId } = req.params as { id: string };

    const result = await db.query(
      `DELETE FROM user_followed_artists WHERE user_id=$1 AND artist_id=$2`,
      [userId, artistId]
    );
    if ((result.rowCount ?? 0) > 0) {
      await db.query(
        `UPDATE artists SET follower_count = GREATEST(0, follower_count - 1) WHERE id = $1`,
        [artistId]
      );
    }
    return reply.status(204).send();
  });

  /** Get followed artists for current user */
  app.get('/me/following/artists', { preHandler: [requireAuth] }, async (req) => {
    const { sub: userId } = req.user as { sub: string };
    const result = await db.query(
      `SELECT a.id, a.name, a.avatar_url, a.verified, a.genres, a.monthly_listeners, a.follower_count,
              ufa.followed_at
       FROM user_followed_artists ufa
       JOIN artists a ON a.id = ufa.artist_id
       WHERE ufa.user_id = $1
       ORDER BY ufa.followed_at DESC`,
      [userId]
    );
    return result.rows.map(r => ({
      id: r.id,
      name: r.name,
      avatarUrl: r.avatar_url,
      verified: r.verified,
      genres: r.genres,
      monthlyListeners: r.monthly_listeners,
      followerCount: r.follower_count,
      followedAt: r.followed_at,
    }));
  });

  /** Check if current user follows an artist */
  app.get('/artists/:id/follow', { preHandler: [requireAuth] }, async (req) => {
    const { sub: userId } = req.user as { sub: string };
    const { id: artistId } = req.params as { id: string };
    const result = await db.query(
      `SELECT 1 FROM user_followed_artists WHERE user_id=$1 AND artist_id=$2`,
      [userId, artistId]
    );
    return { following: (result.rowCount ?? 0) > 0 };
  });

  // ── User Profile ──────────────────────────────────────────────────────────

  /** Get current user's full profile */
  app.get('/me/profile', { preHandler: [requireAuth] }, async (req) => {
    const { sub: userId } = req.user as { sub: string };
    const result = await db.query(
      `SELECT id, email, username, avatar_url, bio, country, subscription_tier, created_at
       FROM users WHERE id = $1`,
      [userId]
    );
    if (!result.rows[0]) return {};

    const stats = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM user_liked_tracks WHERE user_id=$1) as liked_count,
         (SELECT COUNT(*) FROM play_history WHERE user_id=$1) as play_count,
         (SELECT COUNT(*) FROM playlists WHERE user_id=$1) as playlist_count,
         (SELECT COUNT(*) FROM user_followed_artists WHERE user_id=$1) as following_count`,
      [userId]
    );

    const u = result.rows[0];
    const s = stats.rows[0];
    return {
      id: u.id,
      email: u.email,
      username: u.username,
      avatarUrl: u.avatar_url,
      bio: u.bio,
      country: u.country,
      subscriptionTier: u.subscription_tier,
      createdAt: u.created_at,
      stats: {
        likedTracks: parseInt(s.liked_count),
        totalPlays: parseInt(s.play_count),
        playlists: parseInt(s.playlist_count),
        following: parseInt(s.following_count),
      },
    };
  });

  /** Update current user's profile */
  app.put('/me/profile', { preHandler: [requireAuth] }, async (req) => {
    const { sub: userId } = req.user as { sub: string };
    const { username, bio, country, avatarUrl } = req.body as {
      username?: string; bio?: string; country?: string; avatarUrl?: string;
    };
    const result = await db.query(
      `UPDATE users SET
         username    = COALESCE($2, username),
         bio         = COALESCE($3, bio),
         country     = COALESCE($4, country),
         avatar_url  = COALESCE($5, avatar_url),
         last_active_at = NOW()
       WHERE id = $1
       RETURNING id, email, username, avatar_url, bio, country, subscription_tier`,
      [userId, username, bio, country, avatarUrl]
    );
    return result.rows[0];
  });

  // ── Listening Stats ───────────────────────────────────────────────────────

  /** Top listened genres for current user */
  app.get('/me/stats/genres', { preHandler: [requireAuth] }, async (req) => {
    const { sub: userId } = req.user as { sub: string };
    const result = await db.query(
      `SELECT unnest(t.genres) as genre, COUNT(*) as plays
       FROM play_history ph
       JOIN tracks t ON t.id = ph.track_id
       WHERE ph.user_id = $1
         AND ph.played_at > NOW() - INTERVAL '30 days'
         AND ph.skipped = false
       GROUP BY genre
       ORDER BY plays DESC
       LIMIT 8`,
      [userId]
    );
    return result.rows.map(r => ({ genre: r.genre, plays: parseInt(r.plays) }));
  });

  /** Top artists for current user */
  app.get('/me/stats/artists', { preHandler: [requireAuth] }, async (req) => {
    const { sub: userId } = req.user as { sub: string };
    const result = await db.query(
      `SELECT a.id, a.name, a.avatar_url, a.verified, COUNT(ph.id) as plays
       FROM play_history ph
       JOIN tracks t ON t.id = ph.track_id
       JOIN artists a ON a.id = t.artist_id
       WHERE ph.user_id = $1
         AND ph.played_at > NOW() - INTERVAL '30 days'
       GROUP BY a.id, a.name, a.avatar_url, a.verified
       ORDER BY plays DESC
       LIMIT 6`,
      [userId]
    );
    return result.rows.map(r => ({
      id: r.id,
      name: r.name,
      avatarUrl: r.avatar_url,
      verified: r.verified,
      plays: parseInt(r.plays),
    }));
  });
}
