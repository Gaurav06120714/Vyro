import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { Pool } from 'pg';

export class AuthService {
  constructor(private db: Pool) {}

  async register(email: string, username: string, password: string) {
    const existing = await this.db.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username]
    );
    if (existing.rows.length > 0) {
      throw new Error('Email or username already taken');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = uuid();

    const result = await this.db.query(
      `INSERT INTO users (id, email, username, password_hash)
       VALUES ($1, $2, $3, $4) RETURNING id, email, username, avatar_url, country, subscription_tier, created_at`,
      [id, email.toLowerCase(), username, passwordHash]
    );
    return result.rows[0];
  }

  async login(email: string, password: string) {
    const result = await this.db.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user) throw new Error('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new Error('Invalid credentials');

    await this.db.query(
      'UPDATE users SET last_active_at = NOW() WHERE id = $1',
      [user.id]
    );

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatar_url,
      country: user.country,
      subscriptionTier: user.subscription_tier,
      createdAt: user.created_at,
    };
  }

  async getUserById(id: string) {
    const result = await this.db.query(
      `SELECT id, email, username, avatar_url, country, subscription_tier, created_at
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async saveRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    await this.db.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [uuid(), userId, tokenHash, expiresAt]
    );
  }

  async validateRefreshToken(tokenHash: string) {
    const result = await this.db.query(
      `SELECT rt.user_id FROM refresh_tokens rt
       WHERE rt.token_hash = $1 AND rt.expires_at > NOW()`,
      [tokenHash]
    );
    return result.rows[0]?.user_id || null;
  }

  async revokeRefreshToken(tokenHash: string) {
    await this.db.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
  }
}
