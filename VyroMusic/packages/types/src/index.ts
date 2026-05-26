// ─── User ────────────────────────────────────────────────────────────────────
export type SubscriptionTier = 'free' | 'premium' | 'family' | 'student';

export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  subscriptionTier: SubscriptionTier;
  createdAt: string;
}

// ─── Artist ──────────────────────────────────────────────────────────────────
export interface Artist {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  verified: boolean;
  monthlyListeners: number;
  followerCount?: number;
  genres: string[];
  country: string | null;
}

// ─── Album ───────────────────────────────────────────────────────────────────
export type AlbumType = 'album' | 'single' | 'ep' | 'compilation';

export interface Album {
  id: string;
  artistId: string;
  artist?: Artist;
  title: string;
  coverUrl: string | null;
  releaseDate: string;
  albumType: AlbumType;
  totalTracks: number;
  label: string | null;
}

// ─── Track ───────────────────────────────────────────────────────────────────
export type TrackStatus = 'processing' | 'active' | 'takedown';

export interface Track {
  id: string;
  albumId: string;
  album?: Album;
  artistId: string;
  artist?: Artist;
  title: string;
  durationMs: number;
  trackNumber: number;
  explicit: boolean;
  isrc: string | null;
  hlsManifestUrl: string | null;
  previewUrl: string | null;
  source?: 'local' | 'itunes';
  waveformData: number[] | null;
  playCount: number;
  likeCount: number;
  status: TrackStatus;
  genres: string[];
  liked?: boolean;
}

// ─── Playlist ─────────────────────────────────────────────────────────────────
export interface Playlist {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  isPublic: boolean;
  followerCount: number;
  trackCount: number;
  createdAt: string;
  updatedAt: string;
  tracks?: Track[];
}

// ─── Lyrics ──────────────────────────────────────────────────────────────────
export interface LyricLine {
  timeMs: number;
  text: string;
}

export interface Lyrics {
  trackId: string;
  lines: LyricLine[];
  synced: boolean;
  language: string | null;
}

/** Parsed single line used internally by LyricsPanel (ms alias for convenience). */
export interface ParsedLyricLine {
  ms: number;
  text: string;
}

// ─── Search ──────────────────────────────────────────────────────────────────
export interface SearchResults {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  total: number;
}

// ─── API Responses ───────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface StreamToken {
  manifestUrl: string;
  expiresAt: string;
  previewOnly: boolean;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
}

// ─── Play Event ──────────────────────────────────────────────────────────────
export type PlaySource = 'album' | 'playlist' | 'search' | 'radio' | 'recommendation' | 'direct';

export interface PlayEndPayload {
  trackId: string;
  durationPlayedMs: number;
  skipped: boolean;
  source: PlaySource;
}
