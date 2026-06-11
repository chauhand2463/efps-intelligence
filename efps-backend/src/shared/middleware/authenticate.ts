import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../utils/token.js';
import { AuthError, SessionNotFoundError } from '../errors/AuthError.js';
import { getRedis } from '../../config/redis.js';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('TOKEN_INVALID', 'Missing or invalid authorization header');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new AuthError('TOKEN_INVALID', 'Missing access token');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      throw new AuthError('TOKEN_EXPIRED', 'Access token has expired');
    }
    throw new AuthError('TOKEN_INVALID', 'Invalid access token');
  }

  const redis = getRedis();
  const isBlacklisted = await redis.get(`blacklist:token:${token}`);
  if (isBlacklisted) {
    throw new SessionNotFoundError();
  }

  const onlineKey = `dealer:${payload.sub}:online`;
  await redis.expire(onlineKey, 900);
  await redis.sadd('online_dealers', payload.sub);

  request.user = {
    id: payload.sub,
    role: payload.role,
    fps_id: payload.fps_id,
  };
}
