import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import {
  loginSchema,
  forgotPasswordRequestSchema,
  forgotPasswordVerifySchema,
  forgotPasswordResetSchema,
  changePasswordSchema,
  refreshTokenSchema,
} from './auth.schema.js';
import {
  loginHandler,
  logoutHandler,
  refreshHandler,
  forgotPasswordRequestHandler,
  forgotPasswordVerifyHandler,
  forgotPasswordResetHandler,
  changePasswordHandler,
  getMeHandler,
} from './auth.controller.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['fps_id', 'password'],
        properties: {
          fps_id: { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
  }, loginHandler);

  app.post('/auth/logout', {
    preHandler: [authenticate],
  }, logoutHandler);

  app.post('/auth/refresh', {
    schema: {
      body: {
        type: 'object',
        required: ['refresh_token'],
        properties: {
          refresh_token: { type: 'string' },
        },
      },
    },
  }, refreshHandler);

  app.post('/auth/forgot-password/request', {
    schema: {
      body: {
        type: 'object',
        required: ['fps_id', 'mobile'],
        properties: {
          fps_id: { type: 'string' },
          mobile: { type: 'string' },
        },
      },
    },
  }, forgotPasswordRequestHandler);

  app.post('/auth/forgot-password/verify', {
    schema: {
      body: {
        type: 'object',
        required: ['fps_id', 'otp'],
        properties: {
          fps_id: { type: 'string' },
          otp: { type: 'string' },
        },
      },
    },
  }, forgotPasswordVerifyHandler);

  app.post('/auth/forgot-password/reset', {
    schema: {
      body: {
        type: 'object',
        required: ['fps_id', 'otp', 'new_password'],
        properties: {
          fps_id: { type: 'string' },
          otp: { type: 'string' },
          new_password: { type: 'string' },
        },
      },
    },
  }, forgotPasswordResetHandler);

  app.post('/auth/change-password', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['current_password', 'new_password'],
        properties: {
          current_password: { type: 'string' },
          new_password: { type: 'string' },
        },
      },
    },
  }, changePasswordHandler);

  app.get('/auth/me', {
    preHandler: [authenticate],
  }, getMeHandler);
}
