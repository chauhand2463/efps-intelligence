import { query, withClient } from '../../config/database.js';
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

    await withClient(async (client) => {
      for (const row of rows) {
        try {
          const hash = this.computeRowHash(row);
          const category = this.mapCategory(row.cardCategory);

          const existing = await client.query(
            `SELECT id, govt_data_hash, dealer_id, sync_version FROM beneficiaries WHERE dealer_id = $1 AND ration_card_no = $2`,
            [dealerId, row.rationCardNo]
          );

          await client.query(
            `INSERT INTO govt_beneficiary_imports (dealer_id, district, taluka, village, import_batch_id, source_type, raw_data)
             VALUES ($1, NULL, NULL, $2, $3, $4, $5)`,
            [dealerId, row.village ?? null, batchId, sourceType, JSON.stringify(row)]
          );

          if (existing.rows.length === 0) {
            const insertResult = await client.query(
              `INSERT INTO beneficiaries (
                 dealer_id, ration_card_no, head_of_family, card_holder_name,
                 member_count, category, nfsa_category, address, village,
                 lpg_status, png_status, govt_data_hash, last_synced_at, sync_version
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), 1)
               RETURNING id`,
              [
                dealerId, row.rationCardNo, row.hofAsPerNFSA, row.cardHolderName,
                row.familyMember, category, row.cardCategory,
                row.address ?? null, row.village ?? null,
                row.lpgStatus ?? null, row.pngStatus ?? null, hash,
              ]
            );

            await client.query(
              `INSERT INTO govt_change_log (dealer_id, beneficiary_id, ration_card_no, change_type, field_changed, new_value, sync_batch_id)
               VALUES ($1, $2, $3, 'created', 'all', $4, $5)`,
              [dealerId, insertResult.rows[0]!.id, row.rationCardNo, `New ${category} beneficiary`, batchId]
            );

            newRecords++;
          } else {
            const existingRow = existing.rows[0] as {
              id: string; govt_data_hash: string; dealer_id: string; sync_version: number;
            };

            if (existingRow.govt_data_hash !== hash) {
              const currentValues = await client.query(
                `SELECT head_of_family, member_count, category, nfsa_category, address, village, lpg_status, png_status
                 FROM beneficiaries WHERE id = $1`,
                [existingRow.id]
              );
              const old = currentValues.rows[0] as Record<string, unknown>;

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

              await client.query(
                `UPDATE beneficiaries SET ${fields.join(', ')} WHERE id = $${idx}`,
                vals
              );

              const changes: { field: string; oldVal: string; newVal: string }[] = [];
              const oldName = String(old.head_of_family ?? '');
              if (oldName !== row.hofAsPerNFSA) {
                changes.push({ field: 'head_of_family', oldVal: oldName, newVal: row.hofAsPerNFSA });
              }
              const oldMembers = String(old.member_count ?? '0');
              if (oldMembers !== String(row.familyMember)) {
                changes.push({ field: 'member_count', oldVal: oldMembers, newVal: String(row.familyMember) });
              }
              const oldCat = String(old.nfsa_category ?? String(old.category ?? ''));
              if (oldCat !== row.cardCategory) {
                changes.push({ field: 'category', oldVal: oldCat, newVal: row.cardCategory });
              }

              for (const c of changes) {
                await client.query(
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

      await client.query(
        `UPDATE sync_import_batches SET status = 'completed', new_records = $1, updated_records = $2,
         unchanged_records = $3, error_count = $4, completed_at = NOW()
         WHERE id = $5`,
        [newRecords, updatedRecords, unchangedRecords, errorCount, batchId]
      );
    });

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

  async markDeactivatedBeneficiaries(dealerId: string, activeRationCards: string[], batchId: string) {
    const placeholders = activeRationCards.map((_, i) => `$${i + 2}`).join(',');
    let deactivatedCount = 0;

    await withClient(async (client) => {
      const result = await client.query(
        `SELECT id, ration_card_no FROM beneficiaries
         WHERE dealer_id = $1 AND is_active = TRUE AND ration_card_no NOT IN (${placeholders})`,
        [dealerId, ...activeRationCards]
      );

      for (const row of result.rows) {
        await client.query(
          `UPDATE beneficiaries SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
          [row.id]
        );
        await client.query(
          `INSERT INTO govt_change_log (dealer_id, beneficiary_id, ration_card_no, change_type, field_changed, old_value, new_value, sync_batch_id)
           VALUES ($1, $2, $3, 'deactivated', 'is_active', 'true', 'false', $4)`,
          [dealerId, row.id, row.ration_card_no, batchId]
        );
        deactivatedCount++;
      }
    });

    return deactivatedCount;
  }
}

export const govtImporterService = new GovtImporterService();
