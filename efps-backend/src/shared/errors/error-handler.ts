import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from './AppError.js';
import { ZodError } from 'zod';

export function errorHandler(error: FastifyError | AppError | Error, _request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        field: error.field,
        statusCode: error.statusCode,
      },
    });
  }

  const fe = error as FastifyError;
  if (fe.validation) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: fe.message,
        field: fe.validationContext,
        statusCode: 400,
      },
    });
  }

  if ('statusCode' in error && (error as unknown as Record<string, unknown>).statusCode === 429) {
    return reply.status(429).send({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
        statusCode: 429,
      },
    });
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.errors[0]?.message ?? 'Validation failed',
        field: error.errors[0]?.path.join('.'),
        statusCode: 400,
      },
    });
  }

  console.error('Unhandled error:', error);

  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    },
  });
}
