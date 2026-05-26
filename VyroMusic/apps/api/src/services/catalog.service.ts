import { Pool } from 'pg';

export class CatalogService {
  constructor(private db: Pool) {}

  // ── Tracks ────────────────────────────────────────────────────────────────

  async getTrack(id: string, userId?: string) {
    const result = await this.db.query(
      `SELECT t.*,
              a.name as artist_name, a.avatar_url as artist_avatar, a.verified as artist_verified,
              al.title as album_title, al.cover_url as album_cover, al.release_date,
              ${userId ? 'EXISTS(SELECT 1 FROM user_liked_tracks WHERE user_id=$2 AND track_id=t.id) as liked' : 'false as liked'}
       FROM tracks t
       JOIN artists a ON a.id = t.artist_id
       JOIN albums al ON al.id = t.album_id
       WHERE t.id = $1 AND t.status = 'active'`,
      userId ? [id, userId] : [id]
    );
    return result.rows[0] ? this.mapTrack(result.rows[0]) : null;
  }

  async getTracksByAlbum(albumId: string, userId?: string) {
    const result = await this.db.query(
      `SELECT t.*,
              a.name as artist_name, a.avatar_url as artist_avatar, a.verified as artist_verified,
              al.title as album_title, al.cover_url as album_cover, al.release_date,
              ${userId ? 'EXISTS(SELECT 1 FROM user_liked_tracks WHERE user_id=$2 AND track_id=t.id) as liked' : 'false as liked'}
       FROM tracks t
       JOIN artists a ON a.id = t.artist_id
       JOIN albums al ON al.id = t.album_id
       WHERE t.album_id = $1 AND t.status = 'active'
       ORDER BY t.disc_number, t.track_number`,
      userId ? [albumId, userId] : [albumId]
    );
    return result.rows.map(this.mapTrack);
  }

  async getTopTracks(limit = 20) {
    const result = await this.db.query(
      `SELECT t.*, a.name as artist_name, a.avatar_url as artist_avatar,
              a.verified as artist_verified, al.title as album_title,
              al.cover_url as album_cover, al.release_date, false as liked
       FROM tracks t
       JOIN artists a ON a.id = t.artist_id
       JOIN albums al ON al.id = t.album_id
       WHERE t.status = 'active'
       ORDER BY t.play_count DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map(this.mapTrack);
  }

  async getNewReleases(limit = 20) {
    const result = await this.db.query(
      `SELECT al.*, a.name as artist_name, a.avatar_url as artist_avatar, a.verified as artist_verified
       FROM albums al
       JOIN artists a ON a.id = al.artist_id
       ORDER BY al.release_date DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map(this.mapAlbum);
  }

  // ── Albums ────────────────────────────────────────────────────────────────

  async getAlbum(id: string) {
    const result = await this.db.query(
      `SELECT al.*, a.name as artist_name, a.avatar_url as artist_avatar, a.verified as artist_verified
       FROM albums al
       JOIN artists a ON a.id = al.artist_id
       WHERE al.id = $1`,
      [id]
    );
    return result.rows[0] ? this.mapAlbum(result.rows[0]) : null;
  }

  async getArtistAlbums(artistId: string) {
    const result = await this.db.query(
      `SELECT al.*, a.name as artist_name, a.avatar_url as artist_avatar, a.verified as artist_verified
       FROM albums al
       JOIN artists a ON a.id = al.artist_id
       WHERE al.artist_id = $1
       ORDER BY al.release_date DESC`,
      [artistId]
    );
    return result.rows.map(this.mapAlbum);
  }

  // ── Artists ───────────────────────────────────────────────────────────────

  async getArtist(id: string) {
    const result = await this.db.query(
      'SELECT * FROM artists WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.mapArtist(result.rows[0]) : null;
  }

  async getArtistTopTracks(artistId: string, userId?: string, limit = 10) {
    const result = await this.db.query(
      `SELECT t.*,
              a.name as artist_name, a.avatar_url as artist_avatar, a.verified as artist_verified,
              al.title as album_title, al.cover_url as album_cover, al.release_date,
              ${userId ? 'EXISTS(SELECT 1 FROM user_liked_tracks WHERE user_id=$3 AND track_id=t.id) as liked' : 'false as liked'}
       FROM tracks t
       JOIN artists a ON a.id = t.artist_id
       JOIN albums al ON al.id = t.album_id
       WHERE t.artist_id = $1 AND t.status = 'active'
       ORDER BY t.play_count DESC
       LIMIT $2`,
      userId ? [artistId, limit, userId] : [artistId, limit]
    );
    return result.rows.map(this.mapTrack);
  }

  async incrementPlayCount(trackId: string) {
    await this.db.query(
      'UPDATE tracks SET play_count = play_count + 1 WHERE id = $1',
      [trackId]
    );
  }

  // ── Mappers ───────────────────────────────────────────────────────────────

  private mapTrack(row: Record<string, unknown>) {
    return {
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
      artist: row.artist_name ? {
        id: row.artist_id,
        name: row.artist_name,
        avatarUrl: row.artist_avatar,
        verified: row.artist_verified,
      } : undefined,
      album: row.album_title ? {
        id: row.album_id,
        title: row.album_title,
        coverUrl: row.album_cover,
        releaseDate: row.release_date,
      } : undefined,
    };
  }

  private mapAlbum(row: Record<string, unknown>) {
    return {
      id: row.id,
      artistId: row.artist_id,
      title: row.title,
      coverUrl: row.cover_url,
      releaseDate: row.release_date,
      albumType: row.album_type,
      totalTracks: row.total_tracks,
      label: row.label,
      artist: row.artist_name ? {
        id: row.artist_id,
        name: row.artist_name,
        avatarUrl: row.artist_avatar,
        verified: row.artist_verified,
      } : undefined,
    };
  }

  private mapArtist(row: Record<string, unknown>) {
    return {
      id: row.id,
      name: row.name,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      coverUrl: row.cover_url,
      verified: row.verified,
      monthlyListeners: row.monthly_listeners,
      genres: row.genres,
      country: row.country,
    };
  }
}
