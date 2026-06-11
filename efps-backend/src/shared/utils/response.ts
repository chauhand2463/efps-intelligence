import type { FastifyReply } from 'fastify';
import type { ApiResponse, PaginationMeta } from '../types/models.js';

export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode = 200) {
  return reply.status(statusCode).send({
    success: true,
    data,
  } satisfies ApiResponse<T>);
}

export function sendPaginated<T>(
  reply: FastifyReply,
  data: T[],
  meta: PaginationMeta
) {
  return reply.status(200).send({
    success: true,
    data,
    meta,
  } satisfies ApiResponse<T[]>);
}

export function sendCreated<T>(reply: FastifyReply, data: T) {
  return sendSuccess(reply, data, 201);
}

export function sendNoContent(reply: FastifyReply) {
  return reply.status(204).send();
}
