import type { FastifyRequest, FastifyReply } from 'fastify';
import { beneficiaryService } from './beneficiary.service.js';
import { createBeneficiarySchema, updateBeneficiarySchema, searchBeneficiarySchema } from './beneficiary.schema.js';
import { sendSuccess, sendCreated } from '../../shared/utils/response.js';

export async function listBeneficiariesHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = searchBeneficiarySchema.parse(request.query);
  const result = await beneficiaryService.list(request.user!.id, query);
  return reply.send({ success: true, data: result.data, meta: result.meta });
}

export async function getBeneficiaryHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await beneficiaryService.getById(id, request.user!.id);
  return sendSuccess(reply, result);
}

export async function searchBeneficiariesHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = searchBeneficiarySchema.parse(request.query);
  const result = await beneficiaryService.search(request.user!.id, query);
  return reply.send({ success: true, data: result.data, meta: result.meta });
}

export async function createBeneficiaryHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = createBeneficiarySchema.parse(request.body);
  const result = await beneficiaryService.create(request.user!.id, body);
  return sendCreated(reply, result);
}

export async function updateBeneficiaryHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const body = updateBeneficiarySchema.parse(request.body);
  const result = await beneficiaryService.update(id, request.user!.id, body);
  return sendSuccess(reply, result);
}

export async function deleteBeneficiaryHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await beneficiaryService.deactivate(id, request.user!.id);
  return sendSuccess(reply, result);
}
