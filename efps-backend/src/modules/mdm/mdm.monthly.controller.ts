import type { FastifyRequest, FastifyReply } from 'fastify';
import { mdmMonthlyService } from './mdm.monthly.service.js';
import { saveMonthlyRecordSchema, getMonthlyRecordSchema } from './mdm.schema.js';

export async function saveMonthlyRecordsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { month, year, records } = saveMonthlyRecordSchema.parse(request.body);
  const result = await mdmMonthlyService.saveRecords(request.user!.id, month, year, records);
  return reply.send({ success: true, data: result });
}

export async function getMonthlyRecordsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { month, year } = getMonthlyRecordSchema.parse(request.query);
  const result = await mdmMonthlyService.getRecords(request.user!.id, month, year);
  return reply.send({ success: true, data: result ?? { records: [] } });
}
