import { query } from '../../config/database.js';
import { createHash } from 'node:crypto';

export interface GovtBeneficiaryRow {
  srNo?: string;
  cardHolderName: string;
  hofAsPerNFSA: string;
  rationCardNo: string;
  cardCategory: string;
  familyMember: number;
  lpgStatus?: string;
  pngStatus?: string;
  address?: string;
  village?: string;
}

export interface ImportResult {
  batchId: string;
  totalRecords: number;
  newRecords: number;
  updatedRecords: number;
  unchangedRecords: number;
  deletedRecords: number;
  errorCount: number;
}

export class GovtImporterService {
  computeRowHash(row: GovtBeneficiaryRow): string {
    return createHash('sha256')
      .update([
        row.hofAsPerNFSA,
        row.rationCardNo,
        row.cardCategory,
        String(row.familyMember),
        row.lpgStatus ?? '',
        row.pngStatus ?? '',
        row.address ?? '',
        row.village ?? '',
      ].join('|'))
      .digest('hex');
  }

  mapCategory(category: string): string {
    const upper = category.toUpperCase().trim();
    if (upper.includes('AAY')) return 'AAY';
    if (upper.includes('BPL')) return 'BPL';
    if (upper.includes('PHH')) return 'PHH';
    if (upper.includes('APL') || upper.includes('NFSA')) return 'APL';
    return 'APL';
  }

  async importBeneficiaries(
    dealerId: string,
    rows: GovtBeneficiaryRow[],
    sourceType = 'csv',
  ): Promise<ImportResult> {
    const batchResult = await query(
      `INSERT INTO sync_import_batches (source_type, status, total_records, started_at)
       VALUES ($1, 'in_progress', $2, NOW()) RETURNING id`,
      [sourceType, rows.length]
    );
    const batchId = batchResult.rows[0]!.id as string;

    let newRecords = 0;
    let updatedRecords = 0;
    let unchangedRecords = 0;
    let errorCount = 0;

    for (const row of rows) {
      try {
        const hash = this.computeRowHash(row);
        const category = this.mapCategory(row.cardCategory);

        const existing = await query(
          `SELECT id, govt_data_hash, dealer_id, sync_version FROM beneficiaries WHERE ration_card_no = $1`,
          [row.rationCardNo]
        );

        await query(
          `INSERT INTO govt_beneficiary_imports (dealer_id, district, taluka, village, import_batch_id, source_type, raw_data)
           VALUES ($1, NULL, NULL, $2, $3, $4, $5)`,
          [dealerId, row.village ?? null, batchId, sourceType, JSON.stringify(row)]
        );

        if (existing.rows.length === 0) {
          await query(
            `INSERT INTO beneficiaries (
               dealer_id, ration_card_no, head_of_family, card_holder_name,
               member_count, category, nfsa_category, address, village,
               lpg_status, png_status, govt_data_hash, last_synced_at, sync_version
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), 1)`,
            [
              dealerId, row.rationCardNo, row.hofAsPerNFSA, row.cardHolderName,
              row.familyMember, category, row.cardCategory,
              row.address ?? null, row.village ?? null,
              row.lpgStatus ?? null, row.pngStatus ?? null, hash,
            ]
          );

          await query(
            `INSERT INTO govt_change_log (dealer_id, beneficiary_id, ration_card_no, change_type, field_changed, new_value, sync_batch_id)
             VALUES ($1, currval(pg_get_serial_sequence('beneficiaries', 'id')::regclass)::text, $2, 'created', 'all', $3, $4)`,
            // We'll use a simpler approach
            []
          );

          newRecords++;
        } else {
          const existingRow = existing.rows[0] as {
            id: string; govt_data_hash: string; dealer_id: string; sync_version: number;
          };

          if (existingRow.govt_data_hash !== hash) {
            const fields: string[] = [];
            const vals: unknown[] = [];
            let idx = 1;

            const fieldMap: [keyof GovtBeneficiaryRow, string][] = [
              ['hofAsPerNFSA', 'head_of_family'],
              ['cardHolderName', 'card_holder_name'],
              ['cardCategory', 'nfsa_category'],
              ['familyMember', 'member_count'],
              ['address', 'address'],
              ['village', 'village'],
              ['lpgStatus', 'lpg_status'],
              ['pngStatus', 'png_status'],
            ];

            for (const [srcField, dbField] of fieldMap) {
              const newVal = row[srcField];
              const val = newVal !== undefined ? String(newVal) : null;
              fields.push(`${dbField} = $${idx}`);
              vals.push(dbField === 'category' ? this.mapCategory(val ?? '') : val);
              idx++;
            }

            const newCategory = this.mapCategory(row.cardCategory);
            fields.push(`category = $${idx}`); vals.push(newCategory); idx++;
            fields.push(`govt_data_hash = $${idx}`); vals.push(hash); idx++;
            fields.push(`last_synced_at = NOW()`);
            fields.push(`sync_version = sync_version + 1`);
            vals.push(existingRow.id);

            await query(
              `UPDATE beneficiaries SET ${fields.join(', ')} WHERE id = $${idx}`,
              vals
            );

            const oldHash = existingRow.govt_data_hash ?? '';
            const changes: { field: string; oldVal: string; newVal: string }[] = [];

            if (oldHash !== hash) {
              const oldRow = this.parseHashToRow(oldHash);
              if (row.hofAsPerNFSA !== oldRow.hofAsPerNFSA) {
                changes.push({ field: 'head_of_family', oldVal: oldRow.hofAsPerNFSA, newVal: row.hofAsPerNFSA });
              }
              const fmStr = String(row.familyMember);
              if (fmStr !== oldRow.familyMember) {
                changes.push({ field: 'member_count', oldVal: oldRow.familyMember, newVal: fmStr });
              }
              if (row.cardCategory !== oldRow.cardCategory) {
                changes.push({ field: 'category', oldVal: oldRow.cardCategory, newVal: row.cardCategory });
              }
            }

            for (const c of changes) {
              await query(
                `INSERT INTO govt_change_log (dealer_id, beneficiary_id, ration_card_no, change_type, field_changed, old_value, new_value, sync_batch_id)
                 VALUES ($1, $2, $3, 'updated', $4, $5, $6, $7)`,
                [dealerId, existingRow.id, row.rationCardNo, c.field, c.oldVal, c.newVal, batchId]
              );
            }

            updatedRecords++;
          } else {
            unchangedRecords++;
          }
        }
      } catch (err) {
        errorCount++;
        console.error(`[GovtImporter] Error importing row ${row.rationCardNo}:`, err);
      }
    }

    await query(
      `UPDATE sync_import_batches SET status = 'completed', new_records = $1, updated_records = $2,
       unchanged_records = $3, error_count = $4, completed_at = NOW()
       WHERE id = $5`,
      [newRecords, updatedRecords, unchangedRecords, errorCount, batchId]
    );

    return {
      batchId,
      totalRecords: rows.length,
      newRecords,
      updatedRecords,
      unchangedRecords,
      deletedRecords: 0,
      errorCount,
    };
  }

  private parseHashToRow(hash: string): Omit<GovtBeneficiaryRow, 'familyMember'> & { familyMember: string } {
    const parts = hash.split('|');
    return {
      hofAsPerNFSA: parts[0] ?? '',
      rationCardNo: parts[1] ?? '',
      cardCategory: parts[2] ?? '',
      familyMember: parts[3] ?? '0',
      lpgStatus: parts[4],
      pngStatus: parts[5],
      address: parts[6],
      village: parts[7],
      cardHolderName: '',
    };
  }

  async markDeactivatedBeneficiaries(dealerId: string, activeRationCards: string[], batchId: string) {
    const placeholders = activeRationCards.map((_, i) => `$${i + 2}`).join(',');
    const result = await query(
      `SELECT id, ration_card_no FROM beneficiaries
       WHERE dealer_id = $1 AND is_active = TRUE AND ration_card_no NOT IN (${placeholders})`,
      [dealerId, ...activeRationCards]
    );

    for (const row of result.rows) {
      await query(
        `UPDATE beneficiaries SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
        [row.id]
      );
      await query(
        `INSERT INTO govt_change_log (dealer_id, beneficiary_id, ration_card_no, change_type, field_changed, old_value, new_value, sync_batch_id)
         VALUES ($1, $2, $3, 'deactivated', 'is_active', 'true', 'false', $4)`,
        [dealerId, row.id, row.ration_card_no, batchId]
      );
    }

    return result.rows.length;
  }
}

export const govtImporterService = new GovtImporterService();
