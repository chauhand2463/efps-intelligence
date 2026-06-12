import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorizeSelf } from '../../shared/middleware/authorize.js';
import { validateFpsIdParam } from '../../shared/middleware/validate-fps-id.js';
import {
  registerHandler,
  getDealerHandler,
  updateDealerHandler,
  getStatsHandler,
  getSessionsHandler,
  revokeSessionHandler,
  lookupFpsIdHandler,
  heartbeatHandler,
} from './dealer.controller.js';

export async function dealerRoutes(app: FastifyInstance) {
  app.post('/dealers/register', registerHandler);

  app.get('/dealers/lookup/:fpsId', {
    preHandler: [validateFpsIdParam],
  }, lookupFpsIdHandler);

  app.post('/dealers/heartbeat', {
    preHandler: [authenticate],
  }, heartbeatHandler);

  app.get('/dealers/:id', {
    preHandler: [authenticate, authorizeSelf()],
  }, getDealerHandler);

  app.patch('/dealers/:id', {
    preHandler: [authenticate, authorizeSelf()],
  }, updateDealerHandler);

  app.get('/dealers/:id/stats', {
    preHandler: [authenticate, authorizeSelf()],
  }, getStatsHandler);

  app.get('/dealers/:id/sessions', {
    preHandler: [authenticate, authorizeSelf()],
  }, getSessionsHandler);

  app.delete('/dealers/:id/sessions/:sessionId', {
    preHandler: [authenticate, authorizeSelf()],
  }, revokeSessionHandler);
}
