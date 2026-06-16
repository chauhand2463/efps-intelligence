import { query } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ERROR_CODES } from '../../config/constants.js';
import { parsePaginationParams, buildPaginationMeta } from '../../shared/utils/pagination.js';
import type { CreateAdInput, UpdateAdInput, ListAdsInput } from './ads.schema.js';

export class AdsService {
  async create(dealerId: string, input: CreateAdInput) {
    const result = await query(
      `INSERT INTO dealer_ads (dealer_id, title, body, type, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [dealerId, input.title, input.body, input.type, input.expires_at ?? null]
    );
    return result.rows[0];
  }

  async list(dealerId: string, params: ListAdsInput) {
    const { offset, limit, page } = parsePaginationParams(params);

    const countResult = await query(
      `SELECT COUNT(*) FROM dealer_ads WHERE dealer_id = $1`,
      [dealerId]
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const dataResult = await query(
      `SELECT * FROM dealer_ads WHERE dealer_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [dealerId, limit, offset]
    );

    return buildPaginationMeta(dataResult.rows, total, page, limit);
  }

  async getById(id: string, dealerId: string) {
    const result = await query(
      `SELECT * FROM dealer_ads WHERE id = $1 AND dealer_id = $2`,
      [id, dealerId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Ad not found', 404, ERROR_CODES.ADS_NOT_FOUND);
    }

    return result.rows[0];
  }

  async update(id: string, dealerId: string, input: UpdateAdInput) {
    await this.getById(id, dealerId);

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.title !== undefined) { fields.push(`title = $${idx}`); values.push(input.title); idx++; }
    if (input.body !== undefined) { fields.push(`body = $${idx}`); values.push(input.body); idx++; }
    if (input.is_active !== undefined) { fields.push(`is_active = $${idx}`); values.push(input.is_active); idx++; }
    if (input.expires_at !== undefined) { fields.push(`expires_at = $${idx}`); values.push(input.expires_at); idx++; }

    if (fields.length === 0) {
      const existing = await query(`SELECT * FROM dealer_ads WHERE id = $1 AND dealer_id = $2`, [id, dealerId]);
      return existing.rows[0];
    }

    fields.push(`updated_at = NOW()`);
    values.push(id, dealerId);

    const result = await query(
      `UPDATE dealer_ads SET ${fields.join(', ')} WHERE id = $${idx} AND dealer_id = $${idx + 1} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async remove(id: string, dealerId: string) {
    await this.getById(id, dealerId);

    const result = await query(
      `DELETE FROM dealer_ads WHERE id = $1 AND dealer_id = $2 RETURNING id`,
      [id, dealerId]
    );

    return { message: 'Ad deleted successfully' };
  }
}

export const adsService = new AdsService();
