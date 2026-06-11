import { query } from '../../config/database.js';
import { parsePaginationParams, buildPaginationMeta } from '../../shared/utils/pagination.js';
import type { DirectoryQueryInput } from './directory.schema.js';

export class DirectoryService {
  async list(params: DirectoryQueryInput) {
    const { offset, limit, page } = parsePaginationParams(params);
    const values: unknown[] = [];
    const conditions: string[] = [];
    let idx = 1;

    if (params.district) { conditions.push(`district ILIKE $${idx}`); values.push(`%${params.district}%`); idx++; }
    if (params.department) { conditions.push(`department ILIKE $${idx}`); values.push(`%${params.department}%`); idx++; }
    if (params.category) { conditions.push(`category = $${idx}`); values.push(params.category); idx++; }
    if (params.search) { conditions.push(`(name ILIKE $${idx} OR description ILIKE $${idx} OR district ILIKE $${idx})`); values.push(`%${params.search}%`); idx++; }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const count = await query(`SELECT COUNT(*) FROM gujarat_directory ${where}`, values);
    const total = Number(count.rows[0]?.count ?? 0);

    const data = await query(
      `SELECT * FROM gujarat_directory ${where} ORDER BY district, name LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );
    return buildPaginationMeta(data.rows, total, page, limit);
  }
}

export const directoryService = new DirectoryService();
