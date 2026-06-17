import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { config } from '../config/index.js';

export async function registerCors(app: FastifyInstance) {
  const origins = config.CORS_ALLOWED_ORIGINS === '*'
    ? true
    : config.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim());

  await app.register(cors, {
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  });
}
