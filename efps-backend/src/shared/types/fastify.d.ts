import type { AuthUser } from './models.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}
