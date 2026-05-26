/**
 * rateLimit.ts — No-op stub for local single-user tool.
 * No rate limiting needed since there are no external users.
 */

import type { FastifyInstance } from 'fastify';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function registerRateLimit(_app: FastifyInstance): Promise<void> {
  // No-op: rate limiting is not needed for a local single-user tool
}
