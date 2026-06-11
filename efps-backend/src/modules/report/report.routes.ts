import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate.js';
import {
  getMonthlyReportHandler,
  getAuditLogHandler,
  exportPdfHandler,
  exportCsvHandler,
} from './report.controller.js';

export async function reportRoutes(app: FastifyInstance) {
  app.get('/reports/monthly', {
    preHandler: [authenticate],
  }, getMonthlyReportHandler);

  app.get('/reports/audit', {
    preHandler: [authenticate],
  }, getAuditLogHandler);

  app.get('/reports/export/pdf', {
    preHandler: [authenticate],
  }, exportPdfHandler);

  app.get('/reports/export/csv', {
    preHandler: [authenticate],
  }, exportCsvHandler);
}
