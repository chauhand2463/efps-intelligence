import { AppError } from './AppError.js';
import { ERROR_CODES } from '../../config/constants.js';

export class AuthError extends AppError {
  constructor(code: keyof typeof ERROR_CODES, message: string) {
    super(message, 401, ERROR_CODES[code]);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class SessionNotFoundError extends AppError {
  constructor() {
    super('Session not found or expired', 401, 'SESSION_NOT_FOUND');
    this.name = 'SessionNotFoundError';
  }
}
