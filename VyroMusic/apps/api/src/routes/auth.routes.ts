import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { AuthService } from '../services/auth.service';
import { getDb } from '../db/client';

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(getDb());

  // Register
  app.post('/auth/register', async (req, reply) => {
    const { email, username, password } = req.body as { email: string; username: string; password: string };
    if (!email || !username || !password) return reply.status(400).send({ error: 'Missing fields' });
    if (password.length < 8) return reply.status(400).send({ error: 'Password must be at least 8 characters' });

    try {
      const user = await authService.register(email, username, password);
      const accessToken = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '15m' });
      const refreshToken = crypto.randomBytes(64).toString('hex');
      const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await authService.saveRefreshToken(user.id, refreshHash, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

      reply.setCookie('refresh_token', refreshToken, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', maxAge: 30 * 24 * 60 * 60, path: '/',
      });

      return { accessToken, user: { id: user.id, email: user.email, username: user.username, subscriptionTier: user.subscription_tier } };
    } catch (err) {
      reply.status(409).send({ error: (err as Error).message });
    }
  });

  // Login
  app.post('/auth/login', async (req, reply) => {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) return reply.status(400).send({ error: 'Missing fields' });

    try {
      const user = await authService.login(email, password);
      const accessToken = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '15m' });
      const refreshToken = crypto.randomBytes(64).toString('hex');
      const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await authService.saveRefreshToken(user.id, refreshHash, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

      reply.setCookie('refresh_token', refreshToken, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', maxAge: 30 * 24 * 60 * 60, path: '/',
      });

      return { accessToken, user };
    } catch {
      reply.status(401).send({ error: 'Invalid credentials' });
    }
  });

  // Refresh
  app.post('/auth/refresh', async (req, reply) => {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) return reply.status(401).send({ error: 'No refresh token' });

    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const userId = await authService.validateRefreshToken(hash);
    if (!userId) return reply.status(401).send({ error: 'Invalid or expired refresh token' });

    const user = await authService.getUserById(userId);
    if (!user) return reply.status(401).send({ error: 'User not found' });

    // Rotate refresh token
    await authService.revokeRefreshToken(hash);
    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await authService.saveRefreshToken(userId, newHash, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    const accessToken = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '15m' });

    reply.setCookie('refresh_token', newRefreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 30 * 24 * 60 * 60, path: '/',
    });

    return { accessToken, user: { id: user.id, email: user.email, username: user.username, subscriptionTier: user.subscription_tier } };
  });

  // Logout
  app.post('/auth/logout', async (req, reply) => {
    const refreshToken = req.cookies.refresh_token;
    if (refreshToken) {
      const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await authService.revokeRefreshToken(hash);
    }
    reply.clearCookie('refresh_token', { path: '/' });
    return { ok: true };
  });

  // Me
  app.get('/auth/me', { preHandler: [async (req, reply) => { try { await req.jwtVerify(); } catch { reply.status(401).send({ error: 'Unauthorized' }); } }] }, async (req) => {
    const payload = req.user as { sub: string };
    const user = await authService.getUserById(payload.sub);
    return user;
  });
}
