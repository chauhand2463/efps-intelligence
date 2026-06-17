import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { config } from '../config/index.js';
import { getRedis } from '../config/redis.js';

export async function registerRateLimit(app: FastifyInstance) {
  await app.register(rateLimit, {
    redis: getRedis(),
    global: true,
    max: 500,
    timeWindow: '1 minute',
    skipOnError: true,
    allowList: ['127.0.0.1', '::1', '::ffff:127.0.0.1'],
    keyGenerator: (request) => {
      if (request.url === '/health' || request.url === '/ready') return 'skip';
      if (request.url?.startsWith('/api/v1/dealers/lookup')) return 'skip';
      return request.ip;
    },
    hook: 'onRequest',
    ban: 10,
  });

  app.addHook('onRoute', (routeOptions) => {
    if (routeOptions.url?.includes('/auth/login')) {
      routeOptions.config = {
        ...routeOptions.config,
        rateLimit: {
          max: config.RATE_LIMIT_LOGIN_MAX,
          timeWindow: config.RATE_LIMIT_LOGIN_WINDOW_MS,
        },
      };
    }
    if (routeOptions.url?.includes('/dealers/register')) {
      routeOptions.config = {
        ...routeOptions.config,
        rateLimit: {
          max: 3,
          timeWindow: '1 hour',
        },
      };
    }
    if (routeOptions.url?.includes('/otp') || routeOptions.url?.includes('/forgot')) {
      routeOptions.config = {
        ...routeOptions.config,
        rateLimit: {
          max: 3,
          timeWindow: '30 minutes',
        },
      };
    }
    if (routeOptions.url?.includes('/sync') && routeOptions.method === 'POST') {
      routeOptions.config = {
        ...routeOptions.config,
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      };
    }
    if (routeOptions.url?.includes('/auth/refresh')) {
      routeOptions.config = {
        ...routeOptions.config,
        rateLimit: {
          max: 20,
          timeWindow: '15 minutes',
        },
      };
    }
  });
}
