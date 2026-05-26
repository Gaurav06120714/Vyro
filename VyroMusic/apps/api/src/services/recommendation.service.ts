import { Pool } from 'pg';

/**
 * RecommendationService — Phase 2 AI layer
 *
 * Strategy (no external ML needed):
 *  1. Inspect user's play history → extract top genres + top artists
 *  2. Score every active track by overlap with those genres/artists,
 *     weighted by recency and how much of the song they actually played
 *  3. Exclude recently played tracks (last 24h) to keep it fresh
 *  4. Cold-start (no history): fall back to global trending
 *
 * Future: swap scoring with a real embedding model (e.g. OpenAI text-embedding
 * or a locally hosted FAISS index) while keeping the same interface.
 */
export class RecommendationService {
  constructor(private db: Pool) {}

  // ── Public API ────────────────────────────────────────────────────────────

  /** Personalised "For You" feed */
  async forYou(userId: string, limit = 20): Promise<string[]> {
    const profile = await this.buildUserProfile(userId);
    if (!profile.topGenres.length && !profile.topArtistIds.length) {
      return this.trending(limit);
    }
    return this.scoreAndRank(userId, profile, limit, 'for_you');
  }

  /** Radio: given a seed track, find acoustically/genre-similar tracks */
  async radio(seedTrackId: string, limit = 30, excludeIds: string[] = []): Promise<string[]> {
    // Fetch seed track genres + artist
    const seed = await this.db.query(
      `SELECT genres, artist_id FROM tracks WHERE id = $1`,
      [seedTrackId]
    );
    if (!seed.rows[0]) return [];
    const { genres, artist_id } = seed.rows[0] as { genres: string[]; artist_id: string };

    const excluded = [seedTrackId, ...excludeIds];

    const result = await this.db.query(
      `SELECT t.id,
              (
                -- Genre overlap score (0-10)
                (SELECT COUNT(*) FROM unnest(t.genres) g WHERE g = ANY($1)) * 3 +
                -- Same artist bonus
                CASE WHEN t.artist_id = $2 THEN 2 ELSE 0 END +
                -- Popularity signal (log-normalised)
                LEAST(LN(t.play_count + 1) / 16, 3)
              ) AS score
       FROM tracks t
       WHERE t.status = 'active'
         AND t.id <> ALL($3)
       ORDER BY score DESC, RANDOM()
       LIMIT $4`,
      [genres, artist_id, excluded, limit]
    );
    return result.rows.map((r: { id: string }) => r.id);
  }

  /** "Discover Weekly"-style: genres user hasn't explored much */
  async discover(userId: string, limit = 20): Promise<string[]> {
    const profile = await this.buildUserProfile(userId);
    const knownGenres = profile.topGenres.slice(0, 3);

    const result = await this.db.query(
      `SELECT t.id
       FROM tracks t
       WHERE t.status = 'active'
         AND t.id NOT IN (
           SELECT track_id FROM play_history WHERE user_id = $1
           AND played_at > NOW() - INTERVAL '30 days'
         )
         AND (
           -- Prefers tracks NOT in user's dominant genres
           NOT (t.genres && $2::text[])
           OR array_length(t.genres, 1) = 0
         )
       ORDER BY t.play_count DESC, RANDOM()
       LIMIT $3`,
      [userId, knownGenres, limit]
    );

    // If not enough fresh results, pad with popular unknowns
    if (result.rows.length < limit / 2) {
      return this.trending(limit);
    }
    return result.rows.map((r: { id: string }) => r.id);
  }

  /** Guest / anonymous trending */
  async trending(limit = 20): Promise<string[]> {
    const result = await this.db.query(
      `SELECT id FROM tracks WHERE status = 'active'
       ORDER BY play_count DESC LIMIT $1`,
      [limit]
    );
    return result.rows.map((r: { id: string }) => r.id);
  }

  // ── Cache helpers ─────────────────────────────────────────────────────────

  async getCached(userId: string, context: string): Promise<string[] | null> {
    const result = await this.db.query(
      `SELECT track_ids, generated_at FROM recommendation_cache
       WHERE user_id = $1 AND context = $2`,
      [userId, context]
    );
    if (!result.rows[0]) return null;
    const age = Date.now() - new Date(result.rows[0].generated_at as string).getTime();
    if (age > 60 * 60 * 1000) return null; // stale after 1h
    return result.rows[0].track_ids as string[];
  }

  async setCache(userId: string, context: string, trackIds: string[], reason?: string) {
    await this.db.query(
      `INSERT INTO recommendation_cache (user_id, context, track_ids, reason, generated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (user_id, context) DO UPDATE
         SET track_ids = EXCLUDED.track_ids,
             reason = EXCLUDED.reason,
             generated_at = NOW()`,
      [userId, context, trackIds, reason ?? null]
    );
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async buildUserProfile(userId: string) {
    // Top genres from last 60 plays (weighted by listen completion %)
    const genreRows = await this.db.query(
      `SELECT unnest(t.genres) as genre, COUNT(*) as cnt
       FROM play_history ph
       JOIN tracks t ON t.id = ph.track_id
       WHERE ph.user_id = $1
         AND ph.skipped = false
         AND ph.played_at > NOW() - INTERVAL '60 days'
       GROUP BY genre
       ORDER BY cnt DESC
       LIMIT 10`,
      [userId]
    );

    const artistRows = await this.db.query(
      `SELECT t.artist_id, COUNT(*) as cnt
       FROM play_history ph
       JOIN tracks t ON t.id = ph.track_id
       WHERE ph.user_id = $1
         AND ph.played_at > NOW() - INTERVAL '60 days'
       GROUP BY t.artist_id
       ORDER BY cnt DESC
       LIMIT 5`,
      [userId]
    );

    return {
      topGenres: genreRows.rows.map((r: { genre: string }) => r.genre),
      topArtistIds: artistRows.rows.map((r: { artist_id: string }) => r.artist_id),
    };
  }

  private async scoreAndRank(
    userId: string,
    profile: { topGenres: string[]; topArtistIds: string[] },
    limit: number,
    _context: string
  ): Promise<string[]> {
    const result = await this.db.query(
      `SELECT t.id,
              (
                (SELECT COUNT(*) FROM unnest(t.genres) g WHERE g = ANY($2)) * 4 +
                CASE WHEN t.artist_id = ANY($3) THEN 3 ELSE 0 END +
                LEAST(LN(t.play_count + 1) / 16, 2)
              ) AS score
       FROM tracks t
       WHERE t.status = 'active'
         AND t.id NOT IN (
           SELECT track_id FROM play_history
           WHERE user_id = $1 AND played_at > NOW() - INTERVAL '24 hours'
         )
       ORDER BY score DESC, RANDOM()
       LIMIT $4`,
      [userId, profile.topGenres, profile.topArtistIds, limit]
    );
    return result.rows.map((r: { id: string }) => r.id);
  }
}
