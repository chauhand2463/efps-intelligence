import { query } from '../../config/database.js';
import type { CreateAdInput, UpdateAdInput } from './ads.schema.js';

export class AdsService {
  async create(dealerId: string, input: CreateAdInput) {
    const result = await query(
      `INSERT INTO dealer_ads (dealer_id, title, body, type, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [dealerId, input.title, input.body, input.type, input.expires_at ?? null]
    );
    return result.rows[0];
  }

  async list(dealerId: string) {
    const result = await query(
      `SELECT * FROM dealer_ads WHERE dealer_id = $1 ORDER BY created_at DESC`,
      [dealerId]
    );
    return result.rows;
  }

  async update(id: string, dealerId: string, input: UpdateAdInput) {
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
}

export const adsService = new AdsService();
