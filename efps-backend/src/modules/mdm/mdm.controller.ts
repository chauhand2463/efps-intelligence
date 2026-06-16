import type { FastifyRequest, FastifyReply } from 'fastify';
import { mdmService } from './mdm.service.js';
import { createSchemeSchema, updateSchemeSchema, listSchemesSchema, createIcdsCodeSchema, listIcdsCodesSchema } from './mdm.schema.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../shared/utils/response.js';

export async function createSchemeHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = createSchemeSchema.parse(request.body);
  const result = await mdmService.createScheme(body);
  return sendCreated(reply, result);
}

export async function listSchemesHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = listSchemesSchema.parse(request.query);
  const result = await mdmService.listSchemes(query);
  return reply.send({ success: true, data: result.data, meta: result.meta });
}

export async function getSchemeHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await mdmService.getSchemeById(id);
  return sendSuccess(reply, result);
}

export async function updateSchemeHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const body = updateSchemeSchema.parse(request.body);
  const result = await mdmService.updateScheme(id, body);
  return sendSuccess(reply, result);
}

export async function deleteSchemeHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await mdmService.deleteScheme(id);
  return sendNoContent(reply);
}

export async function createIcdsCodeHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = createIcdsCodeSchema.parse(request.body);
  const result = await mdmService.createIcdsCode(body);
  return sendCreated(reply, result);
}

export async function listIcdsCodesHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = listIcdsCodesSchema.parse(request.query);
  const result = await mdmService.listIcdsCodes(query);
  return reply.send({ success: true, data: result.data, meta: result.meta });
}

export async function getIcdsCodeHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await mdmService.getIcdsCodeById(id);
  return sendSuccess(reply, result);
}

export async function deleteIcdsCodeHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await mdmService.deleteIcdsCode(id);
  return sendNoContent(reply);
}
