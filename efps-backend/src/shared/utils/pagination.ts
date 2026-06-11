import { PAGINATION_DEFAULTS } from '../../config/constants.js';
import type { PaginationMeta } from '../types/models.js';

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export function parsePaginationParams(params: PaginationParams): { offset: number; limit: number; page: number } {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(
    PAGINATION_DEFAULTS.maxLimit,
    Math.max(1, params.limit ?? PAGINATION_DEFAULTS.limit)
  );
  const offset = (page - 1) * limit;
  return { offset, limit, page };
}

export function buildPaginationMeta<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const hasMore = page * limit < total;
  return {
    data,
    meta: {
      page,
      limit,
      total,
      cursor: hasMore ? Buffer.from(`${page + 1}:${limit}`).toString('base64') : null,
    },
  };
}
