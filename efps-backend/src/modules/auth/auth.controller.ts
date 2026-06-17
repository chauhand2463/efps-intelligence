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

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1/auth/refresh',
  maxAge: 30 * 24 * 60 * 60,
};

function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie('refresh_token', token, REFRESH_COOKIE_OPTS);
}

function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
}

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = loginSchema.parse(request.body);
  const result = await authService.login(body, request.headers['user-agent'], request.ip);
  setRefreshCookie(reply, result.refresh_token);
  return sendSuccess(reply, { dealer: result.dealer, access_token: result.access_token });
}

export async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
  const refreshToken = request.cookies.refresh_token;
  const dealerId = request.user?.id;

  await authService.logout(accessToken, dealerId, refreshToken);
  clearRefreshCookie(reply);
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

    setRefreshCookie(reply, result.refresh_token);
    return sendSuccess(reply, { access_token: result.access_token, dealer: result.dealer });
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
