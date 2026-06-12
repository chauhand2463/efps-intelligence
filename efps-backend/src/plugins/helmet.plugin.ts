import type { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import { config } from '../config/index.js';

export async function registerHelmet(app: FastifyInstance) {
  await app.register(helmet, {
    contentSecurityPolicy: config.NODE_ENV === 'production'
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            imgSrc: ["'self'", 'data:'],
            fontSrc: ["'self'"],
            connectSrc: ["'self'", config.API_BASE_URL],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
          },
        }
      : false,
  });
}
