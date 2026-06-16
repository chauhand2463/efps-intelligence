import { query } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ERROR_CODES } from '../../config/constants.js';
import { parsePaginationParams, buildPaginationMeta } from '../../shared/utils/pagination.js';
import type {
  CreateSchemeInput,
  UpdateSchemeInput,
  ListSchemesInput,
  CreateIcdsCodeInput,
  ListIcdsCodesInput,
} from './mdm.schema.js';

export class MdmService {
  async createScheme(input: CreateSchemeInput) {
    const result = await query(
      `INSERT INTO policy_schemes (name, department, description, eligibility_criteria, benefits, effective_from, effective_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [input.name, input.department ?? null, input.description ?? null, input.eligibility_criteria ?? null, input.benefits ?? null, input.effective_from ?? null, input.effective_to ?? null]
    );
    return result.rows[0];
  }

  async listSchemes(params: ListSchemesInput) {
    const { offset, limit, page } = parsePaginationParams(params);

    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.is_active !== undefined) {
      conditions.push(`is_active = $${idx}`);
      values.push(params.is_active);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) FROM policy_schemes ${where}`, values);
    const total = Number(countResult.rows[0]?.count ?? 0);

    const dataResult = await query(
      `SELECT * FROM policy_schemes ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );

    return buildPaginationMeta(dataResult.rows, total, page, limit);
  }

  async getSchemeById(id: string) {
    const result = await query(`SELECT * FROM policy_schemes WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      throw new AppError('Scheme not found', 404, ERROR_CODES.SCHEME_NOT_FOUND);
    }

    return result.rows[0];
  }

  async updateScheme(id: string, input: UpdateSchemeInput) {
    await this.getSchemeById(id);

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.name !== undefined) { fields.push(`name = $${idx}`); values.push(input.name); idx++; }
    if (input.department !== undefined) { fields.push(`department = $${idx}`); values.push(input.department); idx++; }
    if (input.description !== undefined) { fields.push(`description = $${idx}`); values.push(input.description); idx++; }
    if (input.eligibility_criteria !== undefined) { fields.push(`eligibility_criteria = $${idx}`); values.push(input.eligibility_criteria); idx++; }
    if (input.benefits !== undefined) { fields.push(`benefits = $${idx}`); values.push(input.benefits); idx++; }
    if (input.effective_from !== undefined) { fields.push(`effective_from = $${idx}`); values.push(input.effective_from); idx++; }
    if (input.effective_to !== undefined) { fields.push(`effective_to = $${idx}`); values.push(input.effective_to); idx++; }
    if (input.is_active !== undefined) { fields.push(`is_active = $${idx}`); values.push(input.is_active); idx++; }

    if (fields.length === 0) {
      const existing = await query(`SELECT * FROM policy_schemes WHERE id = $1`, [id]);
      return existing.rows[0];
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE policy_schemes SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async deleteScheme(id: string) {
    await this.getSchemeById(id);

    await query(`DELETE FROM policy_schemes WHERE id = $1`, [id]);
    return { message: 'Scheme deleted successfully' };
  }

  async createIcdsCode(input: CreateIcdsCodeInput) {
    const existing = await query(`SELECT id FROM icds_codes WHERE code = $1`, [input.code]);
    if (existing.rows.length > 0) {
      throw new AppError('ICDS code already exists', 409, ERROR_CODES.VALIDATION_ERROR);
    }

    const result = await query(
      `INSERT INTO icds_codes (code, description, category, department)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [input.code, input.description, input.category ?? null, input.department ?? null]
    );
    return result.rows[0];
  }

  async listIcdsCodes(params: ListIcdsCodesInput) {
    const { offset, limit, page } = parsePaginationParams(params);

    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.category) {
      conditions.push(`category = $${idx}`);
      values.push(params.category);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) FROM icds_codes ${where}`, values);
    const total = Number(countResult.rows[0]?.count ?? 0);

    const dataResult = await query(
      `SELECT * FROM icds_codes ${where} ORDER BY code ASC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );

    return buildPaginationMeta(dataResult.rows, total, page, limit);
  }

  async getIcdsCodeById(id: string) {
    const result = await query(`SELECT * FROM icds_codes WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      throw new AppError('ICDS code not found', 404, ERROR_CODES.ICDS_CODE_NOT_FOUND);
    }

    return result.rows[0];
  }

  async deleteIcdsCode(id: string) {
    await this.getIcdsCodeById(id);

    await query(`DELETE FROM icds_codes WHERE id = $1`, [id]);
    return { message: 'ICDS code deleted successfully' };
  }
}

export const mdmService = new MdmService();
