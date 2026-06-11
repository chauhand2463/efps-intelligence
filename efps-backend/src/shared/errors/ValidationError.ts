import { AppError } from './AppError.js';

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR', field);
    this.name = 'ValidationError';
  }
}
