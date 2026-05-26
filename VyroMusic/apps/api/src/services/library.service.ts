import { Pool } from 'pg';
import { v4 as uuid } from 'uuid';

export class LibraryService {
  constructor(private db: Pool) {}

  // ── Liked Tracks ─────────────────────────────────────────────────────────

  async likeTrack(userId: string, trackId: string) {
    await this.db.query(
      `INSERT INTO user_liked_tracks (user_id, track_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [userId, trackId]
    );
    await this.db.query(
      'UPDATE tracks SET like_count = like_count + 1 WHERE id = $1',
      [trackId]
    );
  }

  async unlikeTrack(userId: string, trackId: string) {
    const result = await this.db.query(
      'DELETE FROM user_liked_tracks WHERE user_id=$1 AND track_id=$2',
      [userId, trackId]
    );
    if ((result.rowCount ?? 0) > 0) {
      await this.db.query(
        'UPDATE tracks SET like_count = GREATEST(0, like_count - 1) WHERE id = $1',
        [trackId]
      );
    }
  }

  async getLikedTracks(userId: string, limit = 50, offset = 0) {
    const result = await this.db.query(
      `SELECT t.*, a.name as artist_name, a.avatar_url as artist_avatar, a.verified as artist_verified,
              al.title as album_title, al.cover_url as album_cover, al.release_date,
              true as liked, ult.liked_at
       FROM user_liked_tracks ult
       JOIN tracks t ON t.id = ult.track_id
       JOIN artists a ON a.id = t.artist_id
       JOIN albums al ON al.id = t.album_id
       WHERE ult.user_id = $1 AND t.status = 'active'
       ORDER BY ult.liked_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  // ── Playlists ─────────────────────────────────────────────────────────────

  async getUserPlaylists(userId: string) {
    const result = await this.db.query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = p.id) as track_count
       FROM playlists p
       WHERE p.user_id = $1
       ORDER BY p.updated_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async getFeaturedPlaylists(limit = 10) {
    const result = await this.db.query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = p.id) as track_count
       FROM playlists p
       WHERE p.is_public = true
       ORDER BY p.follower_count DESC, p.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  async getPlaylist(id: string, userId?: string) {
    const result = await this.db.query(
      'SELECT * FROM playlists WHERE id = $1 AND (is_public = true OR user_id = $2)',
      [id, userId || null]
    );
    return result.rows[0] || null;
  }

  async createPlaylist(userId: string, title: string, description?: string, isPublic = true) {
    const result = await this.db.query(
      `INSERT INTO playlists (id, user_id, title, description, is_public)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [uuid(), userId, title, description || null, isPublic]
    );
    return result.rows[0];
  }

  async updatePlaylist(id: string, userId: string, data: { title?: string; description?: string; isPublic?: boolean }) {
    const result = await this.db.query(
      `UPDATE playlists SET
         title = COALESCE($3, title),
         description = COALESCE($4, description),
         is_public = COALESCE($5, is_public),
         updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, data.title, data.description, data.isPublic]
    );
    return result.rows[0] || null;
  }

  async deletePlaylist(id: string, userId: string) {
    await this.db.query('DELETE FROM playlists WHERE id=$1 AND user_id=$2', [id, userId]);
  }

  async addTrackToPlaylist(playlistId: string, trackId: string, userId: string) {
    const maxPos = await this.db.query(
      'SELECT COALESCE(MAX(position), -1) as max_pos FROM playlist_tracks WHERE playlist_id=$1',
      [playlistId]
    );
    const position = (maxPos.rows[0].max_pos as number) + 1;
    await this.db.query(
      `INSERT INTO playlist_tracks (playlist_id, track_id, position, added_by)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [playlistId, trackId, position, userId]
    );
    await this.db.query(
      'UPDATE playlists SET updated_at = NOW() WHERE id = $1',
      [playlistId]
    );
  }

  async removeTrackFromPlaylist(playlistId: string, trackId: string) {
    await this.db.query(
      'DELETE FROM playlist_tracks WHERE playlist_id=$1 AND track_id=$2',
      [playlistId, trackId]
    );
  }

  async getPlaylistTracks(playlistId: string) {
    const result = await this.db.query(
      `SELECT t.*, a.name as artist_name, a.avatar_url as artist_avatar,
              a.verified as artist_verified, al.title as album_title,
              al.cover_url as album_cover, al.release_date,
              false as liked, pt.position, pt.added_at
       FROM playlist_tracks pt
       JOIN tracks t ON t.id = pt.track_id
       JOIN artists a ON a.id = t.artist_id
       JOIN albums al ON al.id = t.album_id
       WHERE pt.playlist_id = $1 AND t.status = 'active'
       ORDER BY pt.position`,
      [playlistId]
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      albumId: row.album_id,
      artistId: row.artist_id,
      title: row.title,
      durationMs: row.duration_ms,
      trackNumber: row.track_number,
      explicit: row.explicit,
      isrc: row.isrc,
      hlsManifestUrl: row.hls_manifest_url,
      previewUrl: row.preview_url,
      waveformData: row.waveform_data,
      playCount: row.play_count,
      likeCount: row.like_count,
      status: row.status,
      genres: row.genres,
      liked: row.liked,
      position: row.position,
      artist: {
        id: row.artist_id,
        name: row.artist_name,
        avatarUrl: row.artist_avatar,
        verified: row.artist_verified,
      },
      album: {
        id: row.album_id,
        title: row.album_title,
        coverUrl: row.album_cover,
        releaseDate: row.release_date,
      },
    }));
  }

  // ── History ───────────────────────────────────────────────────────────────

  async addPlayEvent(userId: string, trackId: string, durationPlayedMs: number, skipped: boolean, source: string) {
    await this.db.query(
      `INSERT INTO play_history (id, user_id, track_id, duration_played_ms, skipped, source)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [uuid(), userId, trackId, durationPlayedMs, skipped, source]
    );
  }

  async getHistory(userId: string, limit = 50) {
    const result = await this.db.query(
      `SELECT t.*, a.name as artist_name, a.avatar_url as artist_avatar,
              a.verified as artist_verified, al.title as album_title,
              al.cover_url as album_cover, al.release_date,
              false as liked, ph.played_at
       FROM play_history ph
       JOIN tracks t ON t.id = ph.track_id
       JOIN artists a ON a.id = t.artist_id
       JOIN albums al ON al.id = t.album_id
       WHERE ph.user_id = $1 AND t.status = 'active'
       ORDER BY ph.played_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }
}
