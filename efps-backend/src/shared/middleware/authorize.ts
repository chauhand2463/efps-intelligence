import type { FastifyRequest, FastifyReply } from 'fastify';
import type { RoleType } from '../types/enums.js';
import { ForbiddenError } from '../errors/AuthError.js';

export function authorize(...allowedRoles: RoleType[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new ForbiddenError(
        `Role '${request.user.role}' is not permitted to access this resource`
      );
    }
  };
}

export function authorizeSelf() {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new ForbiddenError('Authentication required');
    }

    const { id } = request.params as { id?: string };
    if (id && id !== request.user.id && request.user.role !== 'admin') {
      throw new ForbiddenError('You can only access your own data');
    }
  };
}
