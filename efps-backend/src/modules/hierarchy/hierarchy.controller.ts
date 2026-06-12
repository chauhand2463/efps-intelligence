import type { FastifyRequest, FastifyReply } from 'fastify';
import { hierarchyService } from './hierarchy.service.js';
import {
  paginationSchema, regionParamsSchema, monthParamSchema, importCsvSchema,
} from './hierarchy.schema.js';
import { sendSuccess, sendCreated } from '../../shared/utils/response.js';

export async function getStateHandler(request: FastifyRequest, reply: FastifyReply) {
  const { month } = monthParamSchema.parse(request.params);
  const result = await hierarchyService.getStateLevel(month);
  return sendSuccess(reply, result);
}

export async function getChildrenHandler(request: FastifyRequest, reply: FastifyReply) {
  const { regionId } = regionParamsSchema.parse(request.params);
  const { month } = monthParamSchema.parse(request.query);
  const result = await hierarchyService.getChildren(regionId, month);
  if (!result) return reply.status(404).send({ success: false, error: { message: 'Region not found' } });
  return sendSuccess(reply, result);
}

export async function getRegionHandler(request: FastifyRequest, reply: FastifyReply) {
  const { regionId } = regionParamsSchema.parse(request.params);
  const { month } = monthParamSchema.parse(request.query);
  const result = await hierarchyService.getRegionDetail(regionId, month);
  if (!result) return reply.status(404).send({ success: false, error: { message: 'Region not found' } });
  return sendSuccess(reply, result);
}

export async function getFpsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { regionId } = regionParamsSchema.parse(request.params);
  const { page, limit } = paginationSchema.parse(request.query);
  const result = await hierarchyService.getFpsForWard(regionId, page, limit);
  return sendSuccess(reply, result);
}

export async function getBreadcrumbHandler(request: FastifyRequest, reply: FastifyReply) {
  const { regionId } = regionParamsSchema.parse(request.params);
  const result = await hierarchyService.getRegionBreadcrumb(regionId);
  return sendSuccess(reply, result);
}

export async function importCsvHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = importCsvSchema.parse(request.body);
  const result = await hierarchyService.importCsvData(
    body.level, body.month, body.rows, body.parentRegionName,
  );
  return sendCreated(reply, result);
}

export async function searchRegionsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { q, level } = request.query as { q?: string; level?: string };
  const result = await hierarchyService.searchRegions(q ?? '', level);
  return sendSuccess(reply, result);
}

export async function getMonthsHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await hierarchyService.getAvailableMonths();
  return sendSuccess(reply, result);
}

export async function getChangeHistoryHandler(request: FastifyRequest, reply: FastifyReply) {
  const { regionId } = regionParamsSchema.parse(request.params);
  const result = await hierarchyService.getChangeHistory(regionId);
  return sendSuccess(reply, result);
}
