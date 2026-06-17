import type { FastifyRequest, FastifyReply } from 'fastify';
import { ValidationError } from '../errors/ValidationError.js';

export function validateFpsIdParam(request: FastifyRequest, _reply: FastifyReply) {
  const { fpsId } = request.params as { fpsId?: string };
  if (!fpsId || fpsId.length < 3 || fpsId.length > 20) {
    throw new ValidationError('FPS ID must be between 3 and 20 characters', 'fpsId');
  }
}
