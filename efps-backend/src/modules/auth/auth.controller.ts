import type { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from './auth.service.js';
import { AuthError } from '../../shared/errors/AuthError.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { config } from '../../config/index.js';
import {
  loginSchema, refreshTokenSchema, forgotPasswordRequestSchema,
  forgotPasswordVerifySchema, forgotPasswordResetSchema, changePasswordSchema,
} from './auth.schema.js';

function setCookies(reply: FastifyReply, tokens: { access_token: string; refresh_token: string }) {
  reply.setCookie('access_token', tokens.access_token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 900,
  });
  reply.setCookie('refresh_token', tokens.refresh_token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 2592000,
  });
}

function clearCookies(reply: FastifyReply) {
  reply.clearCookie('access_token', { path: '/' });
  reply.clearCookie('refresh_token', { path: '/' });
}

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = loginSchema.parse(request.body);
  const result = await authService.login(body, request.headers['user-agent'], request.ip);
  setCookies(reply, result.tokens);
  return sendSuccess(reply, { dealer: result.dealer });
}

export async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies.access_token ?? request.headers.authorization?.split(' ')[1] ?? '';
  const refreshToken = request.cookies.refresh_token;
  if (token && request.user) {
    await authService.logout(token, request.user.id, refreshToken);
  }
  clearCookies(reply);
  return sendSuccess(reply, { message: 'Logged out successfully' });
}

export async function refreshHandler(request: FastifyRequest, reply: FastifyReply) {
  const refreshToken = request.cookies.refresh_token;
  if (!refreshToken) {
    const body = refreshTokenSchema.safeParse(request.body);
    if (!body.success) {
      throw new AuthError('TOKEN_INVALID', 'No refresh token provided');
    }
    const result = await authService.refresh({ refresh_token: body.data.refresh_token });
    setCookies(reply, result.tokens);
    return sendSuccess(reply, { message: 'Token refreshed' });
  }
  const result = await authService.refresh({ refresh_token: refreshToken });
  setCookies(reply, result.tokens);
  return sendSuccess(reply, { message: 'Token refreshed' });
}

export async function forgotPasswordRequestHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = forgotPasswordRequestSchema.parse(request.body);
  const result = await authService.forgotPasswordRequest(body);
  return sendSuccess(reply, result);
}

export async function forgotPasswordVerifyHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = forgotPasswordVerifySchema.parse(request.body);
  const result = await authService.forgotPasswordVerify(body);
  return sendSuccess(reply, result);
}

export async function forgotPasswordResetHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = forgotPasswordResetSchema.parse(request.body);
  const result = await authService.forgotPasswordReset(body);
  return sendSuccess(reply, result);
}

export async function changePasswordHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = changePasswordSchema.parse(request.body);
  const result = await authService.changePassword(body, request.user!.id);
  return sendSuccess(reply, result);
}

export async function getMeHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await authService.getMe(request.user!.id);
  return sendSuccess(reply, result);
}
