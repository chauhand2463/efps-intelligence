import type { FastifyRequest, FastifyReply } from 'fastify';
import { dashboardService } from './dashboard.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

export async function getDashboardSummaryHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await dashboardService.getSummary(request.user!.id);
  return sendSuccess(reply, result);
}
