import type { FastifyRequest, FastifyReply } from 'fastify';
import { getRedis } from '../../config/redis.js';

const IDEMPOTENCY_TTL = 86400;

export async function idempotencyKey(request: FastifyRequest, reply: FastifyReply) {
  if (request.method !== 'POST') return;

  const key = request.headers['idempotency-key'] as string | undefined;
  if (!key) return;

  if (!/^[a-f0-9\-]{8,128}$/i.test(key)) {
    return reply.status(400).send({ error: 'Invalid idempotency key format' });
  }

  const redis = getRedis();
  const cacheKey = `idempotent:${key}`;

  const existing = await redis.get(cacheKey);
  if (existing) {
    const cached = JSON.parse(existing);
    return reply.status(cached.statusCode).send(cached.body);
  }

  await redis.setex(cacheKey, IDEMPOTENCY_TTL, JSON.stringify({ statusCode: 200, body: null }));
}
