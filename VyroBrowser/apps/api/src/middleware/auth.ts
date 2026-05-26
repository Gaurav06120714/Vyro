/**
 * auth.ts — No-op stub.
 * Authentication has been removed. This is a local single-user tool.
 * The file is kept to avoid breaking any imports that haven't been updated yet.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function authMiddleware(
  _request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  // No-op: no auth required for local single-user tool
}
