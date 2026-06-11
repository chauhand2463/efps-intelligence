import type { FastifyRequest, FastifyReply } from 'fastify';
import { directoryService } from './directory.service.js';
import { directoryQuerySchema } from './directory.schema.js';

export async function listDirectoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = directoryQuerySchema.parse(request.query);
  const result = await directoryService.list(query);
  return reply.send({ success: true, data: result.data, meta: result.meta });
}
