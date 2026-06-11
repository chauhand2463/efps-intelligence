import type { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { config } from '../config/index.js';

export async function registerAuthPlugin(app: FastifyInstance) {
  await app.register(fastifyCookie, {
    secret: config.JWT_ACCESS_SECRET,
    parseOptions: {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    },
  });
}
