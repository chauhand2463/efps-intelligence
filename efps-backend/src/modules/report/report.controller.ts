import type { FastifyRequest, FastifyReply } from 'fastify';
import { reportService } from './report.service.js';
import { monthlyReportSchema, auditLogSchema } from './report.schema.js';
import { sendSuccess } from '../../shared/utils/response.js';

export async function getMonthlyReportHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = monthlyReportSchema.parse(request.query);
  const result = await reportService.getMonthlyReport(request.user!.id, query);
  return sendSuccess(reply, result);
}

export async function getAuditLogHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = auditLogSchema.parse(request.query);
  const result = await reportService.getAuditLog(request.user!.id, query);
  return reply.send({ success: true, data: result.data, meta: result.meta });
}

export async function exportPdfHandler(request: FastifyRequest, reply: FastifyReply) {
  const pdf = await reportService.exportPdf(request.user!.id);
  reply.header('Content-Type', 'application/pdf');
  reply.header('Content-Disposition', 'attachment; filename="monthly-report.pdf"');
  return reply.send(pdf);
}

export async function exportCsvHandler(request: FastifyRequest, reply: FastifyReply) {
  const csv = await reportService.exportCsv(request.user!.id);
  reply.header('Content-Type', 'text/csv');
  reply.header('Content-Disposition', 'attachment; filename="transactions.csv"');
  return reply.send(csv);
}
