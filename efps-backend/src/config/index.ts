import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string(),
  DATABASE_REPLICA_URL: z.string().optional(),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(20),

  REDIS_URL: z.string(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('30d'),

  ENCRYPTION_KEY: z.string().length(64),

  INTERNAL_SYNC_SECRET: z.string().min(32).default('change-me-to-a-very-long-secret-key-at-least-32-chars'),
  INTERNAL_SYNC_URL: z.string().url().default('http://localhost:3000/api/internal/sync'),
  START_SYNC_WORKER: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  MOCK_GOVT_PORTAL: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),

  SMS_PROVIDER: z.enum(['msg91', 'twilio', 'mock']).default('mock'),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_SENDER_ID: z.string().default('EFPSMS'),
  MSG91_TEMPLATE_ID: z.string().optional(),
  OTP_TTL_MINUTES: z.coerce.number().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(3),

  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().default(5),
  RATE_LIMIT_LOGIN_WINDOW_MS: z.coerce.number().default(900000),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default('efps-files'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
