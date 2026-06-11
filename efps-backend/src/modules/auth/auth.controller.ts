import type { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from './auth.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { fps_id: string; password: string };
  const result = await authService.login(body, request.headers['user-agent'], request.ip);
  return sendSuccess(reply, result);
}

export async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization!;
  const token = authHeader.split(' ')[1]!;
  const result = await authService.logout(token, request.user!.id);
  return sendSuccess(reply, result);
}

export async function refreshHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { refresh_token: string };
  const result = await authService.refresh(body);
  return sendSuccess(reply, result);
}

export async function forgotPasswordRequestHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { fps_id: string; mobile: string };
  const result = await authService.forgotPasswordRequest(body);
  return sendSuccess(reply, result);
}

export async function forgotPasswordVerifyHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { fps_id: string; otp: string };
  const result = await authService.forgotPasswordVerify(body);
  return sendSuccess(reply, result);
}

export async function forgotPasswordResetHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { fps_id: string; otp: string; new_password: string };
  const result = await authService.forgotPasswordReset(body);
  return sendSuccess(reply, result);
}

export async function changePasswordHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { current_password: string; new_password: string };
  const result = await authService.changePassword(body, request.user!.id);
  return sendSuccess(reply, result);
}

export async function getMeHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await authService.getMe(request.user!.id);
  return sendSuccess(reply, result);
}
