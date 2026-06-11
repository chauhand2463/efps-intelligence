import type { FastifyRequest, FastifyReply } from 'fastify';
import { ValidationError } from '../errors/ValidationError.js';

const FPS_ID_REGEX = /^\d{5,20}$/;

export function validateFpsIdParam(request: FastifyRequest, _reply: FastifyReply) {
  const { fpsId } = request.params as { fpsId?: string };
  if (!fpsId || !FPS_ID_REGEX.test(fpsId)) {
    throw new ValidationError('FPS ID must be a numeric string between 5 and 20 digits', 'fpsId');
  }
}
