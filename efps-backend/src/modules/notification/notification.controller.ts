import type { FastifyRequest, FastifyReply } from 'fastify';
import { notificationService } from './notification.service.js';
import { listNotificationsSchema } from './notification.schema.js';
import { sendSuccess } from '../../shared/utils/response.js';

export async function listNotificationsHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = listNotificationsSchema.parse(request.query);
  const result = await notificationService.list(request.user!.id, query);
  return reply.send({ success: true, data: result.data, meta: result.meta });
}

export async function markAsReadHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await notificationService.markAsRead(id, request.user!.id);
  return sendSuccess(reply, result ?? { message: 'Notification not found' });
}

export async function markAllAsReadHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await notificationService.markAllAsRead(request.user!.id);
  return sendSuccess(reply, { marked_read: result.length });
}
