import { query } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';
import { ERROR_CODES } from '../../config/constants.js';
import { parsePaginationParams, buildPaginationMeta } from '../../shared/utils/pagination.js';
import { eventBus, EventTypes } from '../../shared/events/index.js';
import type { Beneficiary } from '../../shared/types/models.js';
import type { CreateBeneficiaryInput, UpdateBeneficiaryInput, SearchBeneficiaryInput } from './beneficiary.schema.js';

export class BeneficiaryService {
  async list(dealerId: string, params: SearchBeneficiaryInput) {
    const { offset, limit, page } = parsePaginationParams({ page: params.page, limit: params.limit });

    const conditions: string[] = ['b.dealer_id = $1'];
    const values: unknown[] = [dealerId];
    let paramIndex = 2;

    if (params.q) {
      conditions.push(`b.head_of_family ILIKE $${paramIndex}`);
      values.push(`%${params.q}%`);
      paramIndex++;
    }

    if (params.ration_card_no) {
      conditions.push(`b.ration_card_no ILIKE $${paramIndex}`);
      values.push(`%${params.ration_card_no}%`);
      paramIndex++;
    }

    if (params.category) {
      conditions.push(`b.category = $${paramIndex}`);
      values.push(params.category);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) FROM beneficiaries b WHERE ${whereClause}`,
      values
    );

    const total = Number(countResult.rows[0]?.count ?? 0);

    const dataResult = await query(
      `SELECT b.* FROM beneficiaries b WHERE ${whereClause}
       ORDER BY b.head_of_family ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    return buildPaginationMeta(dataResult.rows as Beneficiary[], total, page, limit);
  }

  async getById(id: string, dealerId: string) {
    const result = await query(
      `SELECT * FROM beneficiaries WHERE id = $1 AND dealer_id = $2`,
      [id, dealerId]
    );

    const beneficiary = result.rows[0] as Beneficiary | undefined;
    if (!beneficiary) {
      throw new AppError('Beneficiary not found', 404, ERROR_CODES.BENEFICIARY_NOT_FOUND);
    }

    return beneficiary;
  }

  async search(dealerId: string, params: SearchBeneficiaryInput) {
    return this.list(dealerId, params);
  }

  async create(dealerId: string, input: CreateBeneficiaryInput) {
    const existing = await query(
      `SELECT id FROM beneficiaries WHERE ration_card_no = $1`,
      [input.ration_card_no]
    );

    if (existing.rows.length > 0) {
      throw new ValidationError('Ration card number already exists', 'ration_card_no');
    }

    const result = await query(
      `INSERT INTO beneficiaries (dealer_id, ration_card_no, head_of_family, mobile, member_count, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        dealerId,
        input.ration_card_no,
        input.head_of_family,
        input.mobile ?? null,
        input.member_count,
        input.category ?? null,
      ]
    );

    await eventBus.emit(EventTypes.BENEFICIARY_CREATED, {
      dealerId,
      beneficiaryId: result.rows[0]!.id,
    });

    return result.rows[0] as Beneficiary;
  }

  async update(id: string, dealerId: string, input: UpdateBeneficiaryInput) {
    const existing = await this.getById(id, dealerId);

    if (input.ration_card_no && input.ration_card_no !== existing.ration_card_no) {
      const duplicate = await query(
        `SELECT id FROM beneficiaries WHERE ration_card_no = $1 AND id != $2`,
        [input.ration_card_no, id]
      );

      if (duplicate.rows.length > 0) {
        throw new ValidationError('Ration card number already exists', 'ration_card_no');
      }
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const updateableFields: (keyof UpdateBeneficiaryInput)[] = [
      'ration_card_no', 'head_of_family', 'mobile', 'member_count', 'category', 'is_active',
    ];

    for (const field of updateableFields) {
      if (input[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(input[field]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE beneficiaries SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] as Beneficiary;
  }

  async deactivate(id: string, dealerId: string) {
    await this.getById(id, dealerId);

    const result = await query(
      `UPDATE beneficiaries SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 AND dealer_id = $2 RETURNING *`,
      [id, dealerId]
    );

    return result.rows[0] as Beneficiary;
  }
}

export const beneficiaryService = new BeneficiaryService();
