/**
 * Mass iTunes seeder — fetches Telugu, Hindi, English songs and inserts into DB.
 * Run: npx tsx src/scripts/seed-songs.ts
 */
import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://vyro:vyro@localhost:5432/vyro_music' });

// ── Artist lists by language ──────────────────────────────────────────────────

const TELUGU_ARTISTS = [
  'SP Balasubrahmanyam', 'Sid Sriram', 'Devi Sri Prasad', 'SS Thaman',
  'Anurag Kulkarni', 'Karthik', 'Haricharan', 'Armaan Malik Telugu',
  'Chinmayi Sripada', 'Shreya Ghoshal Telugu', 'Kalyani Priyadarshan',
  'Rahul Sipligunj', 'Benny Dayal Telugu', 'Vijay Prakash Telugu',
  'Anup Rubens', 'Mani Sharma', 'MM Keeravani', 'Ilayaraja Telugu',
  'AR Rahman Telugu', 'Vishal Dadlani Telugu', 'Jonita Gandhi Telugu',
  'Ramajogayya Sastry', 'Sirivennela Seetharama Sastry', 'Kaala Bhairava',
  'Hesham Abdul Wahab', 'Thaman S', 'Gopi Sundar Telugu', 'Anirudh Telugu',
];

const HINDI_ARTISTS = [
  'Arijit Singh', 'Atif Aslam', 'Shreya Ghoshal', 'Sonu Nigam',
  'Kishore Kumar', 'Mohammed Rafi', 'Lata Mangeshkar', 'AR Rahman',
  'Shankar Mahadevan', 'Udit Narayan', 'Kumar Sanu', 'Alka Yagnik',
  'Rahat Fateh Ali Khan', 'Neha Kakkar', 'Darshan Raval', 'Jubin Nautiyal',
  'B Praak', 'Vishal Mishra', 'Pritam', 'Amit Trivedi',
  'Sunidhi Chauhan', 'Asha Bhosle', 'Himesh Reshammiya', 'Mohit Chauhan',
  'KK', 'Shaan', 'Rahul Vaidya', 'Papon', 'Jonita Gandhi', 'Tulsi Kumar',
  'Armaan Malik', 'Asees Kaur', 'Dhvani Bhanushali', 'Sachet Tandon',
  'Parampara Tandon', 'Vishal Dadlani', 'Nakash Aziz', 'Sukhwinder Singh',
];

const ENGLISH_ARTISTS = [
  'The Weeknd', 'Taylor Swift', 'Drake', 'Billie Eilish',
  'Ed Sheeran', 'Dua Lipa', 'Post Malone', 'Harry Styles',
  'Olivia Rodrigo', 'Justin Bieber', 'Ariana Grande', 'Bruno Mars',
  'Coldplay', 'Imagine Dragons', 'Eminem', 'Kanye West',
  'Kendrick Lamar', 'SZA', 'Bad Bunny', 'Sabrina Carpenter',
  'Chappell Roan', 'Charlie Puth', 'Sam Smith', 'Doja Cat',
  'Lizzo', 'Halsey', 'Shawn Mendes', 'Camila Cabello',
  'Lady Gaga', 'Beyonce', 'Rihanna', 'Adele',
];

interface ItunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  trackTimeMillis: number;
  previewUrl: string;
  primaryGenreName: string;
  releaseDate: string;
  trackExplicitness: string;
  kind: string;
}

async function fetchItunesTracks(artist: string, limit = 200): Promise<ItunesResult[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&entity=song&limit=${limit}&country=IN`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json() as { results: ItunesResult[] };
  return (data.results || []).filter(r => r.kind === 'song' && r.previewUrl);
}

function coverUrl(url: string): string {
  return url.replace('100x100bb', '600x600bb');
}

async function upsertTrack(client: import('pg').PoolClient, track: ItunesResult, language: string) {
  // Use a deterministic UUID-formatted ID from the iTunes trackId
  const itunesNum = track.trackId;
  const hex = itunesNum.toString(16).padStart(32, '0');
  const trackId = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;

  // Upsert artist
  const artistRes = await client.query(
    `INSERT INTO artists (id, name, verified, monthly_listeners, genres, country)
     VALUES (gen_random_uuid(), $1, false, $2, $3, $4)
     ON CONFLICT (name) DO UPDATE SET monthly_listeners = GREATEST(artists.monthly_listeners, $2)
     RETURNING id`,
    [
      track.artistName,
      Math.floor(Math.random() * 5_000_000) + 100_000,
      [language, track.primaryGenreName].filter(Boolean),
      language === 'Telugu' || language === 'Hindi' ? 'IN' : 'US',
    ]
  );
  const artistId = artistRes.rows[0].id;

  // Upsert album
  const albumRes = await client.query(
    `INSERT INTO albums (id, artist_id, title, cover_url, release_date, album_type, total_tracks)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 'album', 10)
     ON CONFLICT (title, artist_id) DO UPDATE SET cover_url = EXCLUDED.cover_url
     RETURNING id`,
    [
      artistId,
      track.collectionName || track.trackName,
      coverUrl(track.artworkUrl100 || ''),
      track.releaseDate ? track.releaseDate.slice(0, 10) : null,
    ]
  );
  const albumId = albumRes.rows[0].id;

  // Upsert track — store iTunes ID in preview_url metadata, use UUID as PK
  await client.query(
    `INSERT INTO tracks (id, album_id, artist_id, title, duration_ms, preview_url, track_number,
      explicit, status, genres, play_count, like_count, source)
     VALUES ($1, $2, $3, $4, $5, $6, 1, $7, 'active', $8, $9, $10, 'itunes')
     ON CONFLICT (id) DO UPDATE SET
       duration_ms = EXCLUDED.duration_ms,
       preview_url = EXCLUDED.preview_url`,
    [
      trackId,
      albumId,
      artistId,
      track.trackName,
      track.trackTimeMillis || 0,
      track.previewUrl,
      track.trackExplicitness === 'explicit',
      [language, track.primaryGenreName].filter(Boolean),
      Math.floor(Math.random() * 500_000),
      Math.floor(Math.random() * 50_000),
    ]
  );
}

async function seedArtists(artists: string[], language: string) {
  let total = 0;
  for (const artist of artists) {
    try {
      const tracks = await fetchItunesTracks(artist);
      if (tracks.length === 0) { console.log(`  ⚠ No tracks for ${artist}`); continue; }

      const client = await pool.connect();
      try {
        for (const track of tracks) {
          await upsertTrack(client, track, language);
          total++;
        }
      } finally {
        client.release();
      }
      console.log(`  ✓ ${artist} — ${tracks.length} tracks (total: ${total})`);
    } catch (e) {
      console.error(`  ✗ ${artist}:`, (e as Error).message);
    }
    // Rate limit: be polite to iTunes API
    await new Promise(r => setTimeout(r, 300));
  }
  return total;
}

async function main() {
  console.log('🎵 Vyro Music — Mass Song Seeder');
  console.log('━'.repeat(50));

  // Add unique constraint on artists.name if not exists
  await pool.query(`
    ALTER TABLE artists ADD CONSTRAINT IF NOT EXISTS artists_name_unique UNIQUE (name);
  `).catch(() => {});

  // Add unique constraint on albums(title, artist_id) if not exists
  await pool.query(`
    ALTER TABLE albums ADD CONSTRAINT IF NOT EXISTS albums_title_artist_unique UNIQUE (title, artist_id);
  `).catch(() => {});

  let grandTotal = 0;

  console.log('\n🇮🇳 Telugu songs...');
  grandTotal += await seedArtists(TELUGU_ARTISTS, 'Telugu');

  console.log('\n🇮🇳 Hindi songs...');
  grandTotal += await seedArtists(HINDI_ARTISTS, 'Hindi');

  console.log('\n🌍 English songs...');
  grandTotal += await seedArtists(ENGLISH_ARTISTS, 'English');

  const { rows } = await pool.query('SELECT COUNT(*) FROM tracks WHERE status = $1', ['active']);
  console.log('\n━'.repeat(50));
  console.log(`✅ Done! Seeded ${grandTotal} tracks. Total in DB: ${rows[0].count}`);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
