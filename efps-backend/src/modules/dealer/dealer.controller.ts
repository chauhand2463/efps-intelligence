import type { FastifyRequest, FastifyReply } from 'fastify';
import { dealerService } from './dealer.service.js';
import { sendSuccess, sendCreated } from '../../shared/utils/response.js';

export async function registerHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as {
    fps_id: string; full_name: string; mobile: string; password: string;
    address?: string; district?: string; taluka?: string; village?: string; area_id?: string;
  };
  const result = await dealerService.register(body);
  return sendCreated(reply, result);
}

export async function getDealerHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await dealerService.getById(id);
  return sendSuccess(reply, result);
}

export async function updateDealerHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const body = request.body as {
    full_name?: string; address?: string; district?: string; taluka?: string; village?: string; area_id?: string;
  };
  const result = await dealerService.update(id, body);
  return sendSuccess(reply, result);
}

export async function getStatsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await dealerService.getStats(id);
  return sendSuccess(reply, result);
}

export async function getSessionsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await dealerService.getSessions(id);
  return sendSuccess(reply, result);
}

export async function revokeSessionHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id, sessionId } = request.params as { id: string; sessionId: string };
  const result = await dealerService.revokeSession(id, sessionId);
  return sendSuccess(reply, result);
}

export async function lookupFpsIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { fpsId } = request.params as { fpsId: string };
  const result = await dealerService.lookupByFpsId(fpsId);
  return sendSuccess(reply, result);
}
