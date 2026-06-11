import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { config } from '../config/index.js';

export async function registerCors(app: FastifyInstance) {
  await app.register(cors, {
    origin: config.CORS_ALLOWED_ORIGINS === '*'
      ? true
      : config.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}
