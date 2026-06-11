import type { FastifyRequest, FastifyReply } from 'fastify';
import { mdmService } from './mdm.service.js';
import { createSchemeSchema, updateSchemeSchema, createIcdsCodeSchema } from './mdm.schema.js';
import { sendSuccess, sendCreated } from '../../shared/utils/response.js';

export async function createSchemeHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = createSchemeSchema.parse(request.body);
  const result = await mdmService.createScheme(body);
  return sendCreated(reply, result);
}

export async function listSchemesHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await mdmService.listSchemes();
  return sendSuccess(reply, result);
}

export async function updateSchemeHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const body = updateSchemeSchema.parse(request.body);
  const result = await mdmService.updateScheme(id, body);
  return sendSuccess(reply, result);
}

export async function createIcdsCodeHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = createIcdsCodeSchema.parse(request.body);
  const result = await mdmService.createIcdsCode(body);
  return sendCreated(reply, result);
}

export async function listIcdsCodesHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await mdmService.listIcdsCodes();
  return sendSuccess(reply, result);
}
