import { query } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ERROR_CODES } from '../../config/constants.js';
import { parsePaginationParams, buildPaginationMeta } from '../../shared/utils/pagination.js';
import type { CreateAuditInput, UpdateAuditInput, ListAuditInput } from './audit.schema.js';

export class AuditService {
  async create(dealerId: string, input: CreateAuditInput) {
    const result = await query(
      `INSERT INTO social_audit_meetings (dealer_id, title, meeting_date, venue, total_beneficiaries_verified, issues_identified, resolutions)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [dealerId, input.title, input.meeting_date, input.venue ?? null, input.total_beneficiaries_verified ?? 0, input.issues_identified ?? null, input.resolutions ?? null]
    );
    return result.rows[0];
  }

  async list(dealerId: string, params: ListAuditInput) {
    const { offset, limit, page } = parsePaginationParams(params);

    const countResult = await query(
      `SELECT COUNT(*) FROM social_audit_meetings WHERE dealer_id = $1`,
      [dealerId]
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const dataResult = await query(
      `SELECT * FROM social_audit_meetings WHERE dealer_id = $1
       ORDER BY meeting_date DESC LIMIT $2 OFFSET $3`,
      [dealerId, limit, offset]
    );

    return buildPaginationMeta(dataResult.rows, total, page, limit);
  }

  async getById(id: string, dealerId: string) {
    const result = await query(
      `SELECT * FROM social_audit_meetings WHERE id = $1 AND dealer_id = $2`,
      [id, dealerId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Audit meeting not found', 404, ERROR_CODES.AUDIT_NOT_FOUND);
    }

    return result.rows[0];
  }

  async update(id: string, dealerId: string, input: UpdateAuditInput) {
    await this.getById(id, dealerId);

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.title !== undefined) { fields.push(`title = $${idx}`); values.push(input.title); idx++; }
    if (input.meeting_date !== undefined) { fields.push(`meeting_date = $${idx}`); values.push(input.meeting_date); idx++; }
    if (input.venue !== undefined) { fields.push(`venue = $${idx}`); values.push(input.venue); idx++; }
    if (input.total_beneficiaries_verified !== undefined) { fields.push(`total_beneficiaries_verified = $${idx}`); values.push(input.total_beneficiaries_verified); idx++; }
    if (input.issues_identified !== undefined) { fields.push(`issues_identified = $${idx}`); values.push(input.issues_identified); idx++; }
    if (input.resolutions !== undefined) { fields.push(`resolutions = $${idx}`); values.push(input.resolutions); idx++; }

    if (fields.length === 0) {
      const existing = await query(`SELECT * FROM social_audit_meetings WHERE id = $1 AND dealer_id = $2`, [id, dealerId]);
      return existing.rows[0];
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE social_audit_meetings SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async remove(id: string, dealerId: string) {
    await this.getById(id, dealerId);

    await query(`DELETE FROM social_audit_meetings WHERE id = $1 AND dealer_id = $2`, [id, dealerId]);
    return { message: 'Audit meeting deleted successfully' };
  }
}

export const auditService = new AuditService();
