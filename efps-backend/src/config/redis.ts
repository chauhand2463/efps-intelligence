import { Redis } from 'ioredis';
import { config } from './index.js';

let redis: Redis;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.REDIS_URL, {
      lazyConnect: true,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      enableReadyCheck: true,
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
  }
}
