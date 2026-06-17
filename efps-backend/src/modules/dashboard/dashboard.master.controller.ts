import type { FastifyRequest, FastifyReply } from 'fastify';
import { dashboardMasterService } from './dashboard.master.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

export async function getMasterDashboardHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await dashboardMasterService.getMasterDashboard(request.user!.id);
  return sendSuccess(reply, result);
}
