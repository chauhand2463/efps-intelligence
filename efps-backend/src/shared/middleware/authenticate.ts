import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../utils/token.js';
import { AuthError, SessionNotFoundError } from '../errors/AuthError.js';
import { getRedis } from '../../config/redis.js';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : request.cookies.access_token;

  if (!token) {
    throw new AuthError('TOKEN_INVALID', 'Missing or invalid authorization header');
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

  try {
    const redis = getRedis();
    const isBlacklisted = await redis.get(`blacklist:token:${token}`);
    if (isBlacklisted) {
      throw new SessionNotFoundError();
    }

    const onlineKey = `dealer:${payload.sub}:online`;
    await redis.expire(onlineKey, 900);
    await redis.sadd('online_dealers', payload.sub);
  } catch (err) {
    if (err instanceof SessionNotFoundError) throw err;
    // Redis unavailable — allow auth to proceed (degraded mode)
  }

  request.user = {
    id: payload.sub,
    role: payload.role,
    fps_id: payload.fps_id,
  };
}
