export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly field?: string;

  constructor(message: string, statusCode: number, code: string, field?: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.field = field;
  }
}
