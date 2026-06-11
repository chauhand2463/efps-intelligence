import { query } from '../../config/database.js';
import type { CreateSchemeInput, UpdateSchemeInput, CreateIcdsCodeInput } from './mdm.schema.js';

export class MdmService {
  async createScheme(input: CreateSchemeInput) {
    const result = await query(
      `INSERT INTO policy_schemes (name, department, description, eligibility_criteria, benefits, effective_from, effective_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [input.name, input.department ?? null, input.description ?? null, input.eligibility_criteria ?? null, input.benefits ?? null, input.effective_from ?? null, input.effective_to ?? null]
    );
    return result.rows[0];
  }

  async listSchemes() {
    const result = await query(`SELECT * FROM policy_schemes ORDER BY created_at DESC`);
    return result.rows;
  }

  async updateScheme(id: string, input: UpdateSchemeInput) {
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

  async createIcdsCode(input: CreateIcdsCodeInput) {
    const result = await query(
      `INSERT INTO icds_codes (code, description, category, department)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [input.code, input.description, input.category ?? null, input.department ?? null]
    );
    return result.rows[0];
  }

  async listIcdsCodes() {
    const result = await query(`SELECT * FROM icds_codes ORDER BY code ASC`);
    return result.rows;
  }
}

export const mdmService = new MdmService();
