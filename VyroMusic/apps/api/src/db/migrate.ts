import 'dotenv/config';
import { getDb } from './client';

const SCHEMA = `
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  avatar_url    TEXT,
  country       TEXT,
  bio           TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free'
                CHECK (subscription_tier IN ('free','premium','family','student')),
  oauth_provider TEXT,
  oauth_id      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Artists
CREATE TABLE IF NOT EXISTS artists (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  bio              TEXT,
  avatar_url       TEXT,
  cover_url        TEXT,
  verified         BOOLEAN NOT NULL DEFAULT FALSE,
  monthly_listeners INTEGER NOT NULL DEFAULT 0,
  genres           TEXT[] NOT NULL DEFAULT '{}',
  country          TEXT,
  follower_count   INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full text search index on artists
CREATE INDEX IF NOT EXISTS idx_artists_name_trgm ON artists USING gin(name gin_trgm_ops);

-- Albums
CREATE TABLE IF NOT EXISTS albums (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id    UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  cover_url    TEXT,
  release_date DATE NOT NULL,
  album_type   TEXT NOT NULL DEFAULT 'album'
               CHECK (album_type IN ('album','single','ep','compilation')),
  total_tracks INTEGER NOT NULL DEFAULT 0,
  label        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_albums_artist ON albums(artist_id);
CREATE INDEX IF NOT EXISTS idx_albums_release ON albums(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_albums_title_trgm ON albums USING gin(title gin_trgm_ops);

-- Tracks
CREATE TABLE IF NOT EXISTS tracks (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  album_id         UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  artist_id        UUID NOT NULL REFERENCES artists(id),
  title            TEXT NOT NULL,
  duration_ms      INTEGER NOT NULL DEFAULT 0,
  track_number     INTEGER NOT NULL DEFAULT 1,
  disc_number      INTEGER NOT NULL DEFAULT 1,
  explicit         BOOLEAN NOT NULL DEFAULT FALSE,
  isrc             TEXT,
  hls_manifest_url TEXT,
  preview_url      TEXT,
  waveform_data    JSONB,
  play_count       BIGINT NOT NULL DEFAULT 0,
  like_count       INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'processing'
                   CHECK (status IN ('processing','active','takedown')),
  genres           TEXT[] NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album_id);
CREATE INDEX IF NOT EXISTS idx_tracks_status ON tracks(status);
CREATE INDEX IF NOT EXISTS idx_tracks_play_count ON tracks(play_count DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_tracks_title_trgm ON tracks USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tracks_genres ON tracks USING gin(genres);

-- Playlists
CREATE TABLE IF NOT EXISTS playlists (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  cover_url       TEXT,
  is_public       BOOLEAN NOT NULL DEFAULT TRUE,
  is_collaborative BOOLEAN NOT NULL DEFAULT FALSE,
  follower_count  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id);

-- Playlist tracks
CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id    UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL DEFAULT 0,
  added_by    UUID REFERENCES users(id),
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (playlist_id, track_id)
);

-- Liked tracks
CREATE TABLE IF NOT EXISTS user_liked_tracks (
  user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  liked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, track_id)
);

-- Followed artists
CREATE TABLE IF NOT EXISTS user_followed_artists (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artist_id   UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  followed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, artist_id)
);

-- Followed playlists
CREATE TABLE IF NOT EXISTS user_followed_playlists (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  followed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, playlist_id)
);

-- Lyrics (synced or plain)
CREATE TABLE IF NOT EXISTS lyrics (
  track_id   UUID PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
  provider   TEXT,
  content    JSONB NOT NULL DEFAULT '[]',
  plain_text TEXT,
  language   TEXT,
  synced     BOOLEAN NOT NULL DEFAULT FALSE,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Play history
CREATE TABLE IF NOT EXISTS play_history (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id           UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  played_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_played_ms INTEGER NOT NULL DEFAULT 0,
  skipped            BOOLEAN NOT NULL DEFAULT FALSE,
  source             TEXT NOT NULL DEFAULT 'direct'
);

CREATE INDEX IF NOT EXISTS idx_play_history_user ON play_history(user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_play_history_track ON play_history(track_id, played_at DESC);

-- AI Recommendation cache (per-user, refreshed hourly)
CREATE TABLE IF NOT EXISTS recommendation_cache (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  context    TEXT NOT NULL DEFAULT 'home',
  track_ids  UUID[] NOT NULL DEFAULT '{}',
  reason     TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, context)
);

-- Radio seeds (guest-friendly, no auth needed)
CREATE INDEX IF NOT EXISTS idx_rec_cache_user ON recommendation_cache(user_id, generated_at DESC);

-- Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const STRIPE_MIGRATION = `
-- Stripe billing columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;

-- Subscription events log
CREATE TABLE IF NOT EXISTS subscription_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_event_id  VARCHAR(255) UNIQUE,
  event_type       VARCHAR(100),
  data             JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
`;

async function migrate() {
  const db = getDb();
  console.log('Running migrations...');
  await db.query(SCHEMA);
  console.log('Running Stripe billing migration...');
  await db.query(STRIPE_MIGRATION);
  console.log('✅ Migrations complete');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
