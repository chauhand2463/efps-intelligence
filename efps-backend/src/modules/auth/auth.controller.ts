import type { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from './auth.service.js';
import { AuthError } from '../../shared/errors/AuthError.js';
import { sendSuccess } from '../../shared/utils/response.js';
import { config } from '../../config/index.js';
import { logger } from '../../shared/utils/logger.js';
import {
  loginSchema, forgotPasswordRequestSchema,
  forgotPasswordVerifySchema, forgotPasswordResetSchema, changePasswordSchema,
} from './auth.schema.js';

const ACCESS_COOKIE_OPTS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1',
  maxAge: 15 * 60,
};

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1/auth/refresh',
  maxAge: 30 * 24 * 60 * 60,
};

function setAccessCookie(reply: FastifyReply, token: string) {
  reply.setCookie('access_token', token, ACCESS_COOKIE_OPTS);
}

function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie('refresh_token', token, REFRESH_COOKIE_OPTS);
}

function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie('access_token', { path: '/api/v1' });
  reply.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
}

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = loginSchema.parse(request.body);
  const result = await authService.login(body, request.headers['user-agent'], request.ip);
  setAccessCookie(reply, result.access_token);
  setRefreshCookie(reply, result.refresh_token);
  return sendSuccess(reply, { dealer: result.dealer });
}

export async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
  const accessToken = request.cookies.access_token;
  const refreshToken = request.cookies.refresh_token;
  const dealerId = request.user?.id;

  await authService.logout(accessToken, dealerId, refreshToken);
  clearAuthCookies(reply);
  return sendSuccess(reply, { message: 'Logged out successfully' });
}

export async function refreshHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const cookies = request.cookies ?? {};
    const refreshToken = cookies.refresh_token;
    const requestId = request.id;
    const ip = request.ip;

    logger.info({
      hasRefreshCookie: !!refreshToken,
      requestId,
      ip,
    }, 'REFRESH_ATTEMPT');

    const result = await authService.refresh(refreshToken, ip, requestId as string | undefined);

    setAccessCookie(reply, result.access_token);
    setRefreshCookie(reply, result.refresh_token);
    return sendSuccess(reply, { dealer: result.dealer });
  } catch (err) {
    if (err instanceof AuthError || (err instanceof Error && (err as any).statusCode === 401)) {
      throw err;
    }
    logger.error({ err, ip: request.ip, requestId: request.id }, 'REFRESH_HANDLER_UNEXPECTED_ERROR');
    throw new AuthError('TOKEN_INVALID', 'Refresh failed');
  }
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
