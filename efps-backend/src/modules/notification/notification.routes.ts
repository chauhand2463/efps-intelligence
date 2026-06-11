import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import {
  listNotificationsHandler,
  markAsReadHandler,
  markAllAsReadHandler,
} from './notification.controller.js';

export async function notificationRoutes(app: FastifyInstance) {
  app.get('/notifications', {
    preHandler: [authenticate],
  }, listNotificationsHandler);

  app.patch('/notifications/read-all', {
    preHandler: [authenticate],
  }, markAllAsReadHandler);

  app.patch('/notifications/:id/read', {
    preHandler: [authenticate],
  }, markAsReadHandler);
}
