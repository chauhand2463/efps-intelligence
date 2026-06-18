import { query, withClient } from '../../config/database.js';
import { createHash } from 'node:crypto';
import type { ImportTransactionRow, ImportTransactionsInput, StockLedgerQuery, FinancialLedgerQuery } from './enterprise-sync.schema.js';

export interface ImportResult {
  batchId: string;
  totalRecords: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
}

export class EnterpriseSyncService {
  private flattenKey(k: string): string {
    return k.toLowerCase().replace(/[\s_\-()]+/g, '').replace(/[^a-z0-9]/g, '');
  }

  private mapCommodity(raw: string): string {
    const n = this.flattenKey(raw);
    if (n.includes('rice')) return 'Rice';
    if (n.includes('wheat') || n.includes('gehu') || n.includes('gahum')) return 'Wheat';
    if (n.includes('sugar') || n.includes('cheeni') || n.includes('shakkar')) return 'Sugar';
    if (n.includes('kerosene') || n.includes('keroseneoil') || n.includes('mititel')) return 'Kerosene';
    if (n.includes('oil') || n.includes('tel') || n.includes('vanaspati')) return 'Oil';
    if (n.includes('pulse') || n.includes('dal') || n.includes('chana') || n.includes('moong')) return 'Pulses';
    return raw;
  }

  async importTransactions(
    dealerId: string,
    input: ImportTransactionsInput,
  ): Promise<ImportResult> {
    const batchResult = await query(
      `INSERT INTO sync_import_batches (source_type, status, total_records, started_at)
       VALUES ($1, 'in_progress', $2, NOW()) RETURNING id`,
      [input.source, input.rows.length]
    );
    const batchId = batchResult.rows[0]!.id as string;

    const sourceFileId = input.sourceFileId ?? batchId;
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    await withClient(async (client) => {
      for (const row of input.rows) {
        const action = await this.processTransactionRow(client, dealerId, row, batchId, input.source, sourceFileId);
        switch (action) {
          case 'inserted': inserted++; break;
          case 'updated': updated++; break;
          case 'skipped': skipped++; break;
          case 'error': errors++; break;
        }
        if (action === 'error') {
          errorDetails.push(`${row.rationCardNo}/${row.commodity}: ${row.quantityKg}`);
        }
      }

      await client.query(
        `UPDATE sync_import_batches
         SET status = 'completed', new_records = $1, updated_records = $2,
             unchanged_records = $3, error_count = $4, completed_at = NOW()
         WHERE id = $5`,
        [inserted, updated, skipped, errors, batchId]
      );
    });

    return { batchId, totalRecords: input.rows.length, inserted, updated, skipped, errors, errorDetails };
  }

  private async processTransactionRow(
    client: any,
    dealerId: string,
    row: ImportTransactionRow,
    _batchId: string,
    source: string,
    sourceFileId: string,
  ): Promise<'inserted' | 'updated' | 'skipped' | 'error'> {
    try {
      const commodity = this.mapCommodity(row.commodity);
      const txDate: string = (row.transactionDate || new Date().toISOString().split('T')[0])!;
      const txMonth = txDate.slice(0, 7);
      const month: string = row.month || (txMonth + '-01');
      const amount = row.totalAmount || (row.pricePerKg * row.quantityKg);
      const dept = row.department || 'REGULAR_FPS';

      const beneficiary = await client.query(
        `SELECT id FROM beneficiaries WHERE dealer_id = $1 AND ration_card_no = $2 LIMIT 1`,
        [dealerId, row.rationCardNo]
      );
      const beneficiaryId = beneficiary.rows[0]?.id ?? null;

      // Build a composite dedup key using upstream transaction hash, or ration+month+commodity
      const upstreamHash = row.transactionHash
        || createHash('sha256').update([dealerId, row.rationCardNo, month, commodity].join('|')).digest('hex');

      const existing = await client.query(
        `SELECT id, transaction_source, quantity_kg, total_amount
         FROM transactions
         WHERE dealer_id = $1 AND upstream_hash = $2`,
        [dealerId, upstreamHash]
      );

      if (existing.rows.length > 0) {
        const existingTx = existing.rows[0] as {
          id: string; transaction_source: string; quantity_kg: string; total_amount: string;
        };

        if (source === 'EXCEL_SYNC' && existingTx.transaction_source === 'MANUAL_CBDC') {
          // Excel sync overrides manual entry: update quantity + amounts
          await client.query(
            `UPDATE transactions
             SET quantity_kg = $1, total_amount = $2, price_per_kg = $3,
                 transaction_source = 'EXCEL_SYNC', override_reason = 'Govt data override',
                 source_file_id = $4, updated_at = NOW()
             WHERE id = $5`,
            [row.quantityKg, amount, row.pricePerKg, sourceFileId, existingTx.id]
          );

          await client.query(
            `INSERT INTO transaction_line_items (transaction_id, commodity, quantity_kg, price_per_kg_at_sale, commission_rate_at_sale, total_amount, department, remarks)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [existingTx.id, commodity, row.quantityKg, row.pricePerKg, row.commissionRate || null, amount, dept, row.remarks]
          );

          return 'updated';
        }

        // Same source: skip dedup
        return 'skipped';
      }

      // No existing row — INSERT
      const insertResult = await client.query(
        `INSERT INTO transactions (
          dealer_id, beneficiary_id, transaction_date, month, commodity,
          quantity_kg, price_per_kg, total_amount, mode, transaction_source,
          source_file_id, upstream_hash, transaction_hash, ration_card_no,
          beneficiary_name, remarks, allocated_quantity, lifted_quantity, amount_paid, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'manual', $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'completed')
        RETURNING id`,
        [
          dealerId, beneficiaryId, txDate, month, commodity,
          row.quantityKg, row.pricePerKg, amount,
          source,                     // 9: transaction_source
          sourceFileId,               // 10: source_file_id
          upstreamHash,               // 11: upstream_hash
          row.transactionId || upstreamHash, // 12: transaction_id (legacy)
          row.rationCardNo,           // 13: ration_card_no
          row.beneficiaryName,        // 14: beneficiary_name
          row.remarks,                // 15: remarks
          row.quantityKg,             // 16: allocated_quantity
          row.quantityKg,             // 17: lifted_quantity
          amount,                     // 18: amount_paid
        ]
      );
      const transactionId = insertResult.rows[0]!.id as string;

      // Write transaction_line_items with frozen prices
      await client.query(
        `INSERT INTO transaction_line_items (transaction_id, commodity, quantity_kg, price_per_kg_at_sale, commission_rate_at_sale, total_amount, department, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [transactionId, commodity, row.quantityKg, row.pricePerKg, row.commissionRate || null, amount, dept, row.remarks]
      );

      // Update stock_allocations (legacy)
      await client.query(
        `UPDATE stock_allocations
         SET lifted_kg = lifted_kg + $1, lifted_quantity = COALESCE(lifted_quantity, 0) + $2, updated_at = NOW()
         WHERE dealer_id = $3 AND month = $4 AND commodity = $5`,
        [row.quantityKg, row.quantityKg, dealerId, month, commodity]
      );

      return 'inserted';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[EnterpriseSync] Error processing ${row.rationCardNo}/${row.commodity}:`, msg);
      return 'error';
    }
  }

  async importTransactionsWithFlexibleMapping(
    dealerId: string,
    rawRows: Record<string, string>[],
    source: 'EXCEL_SYNC' | 'MANUAL_CBDC' | 'OFFLINE' = 'EXCEL_SYNC',
    sourceFileId?: string,
  ): Promise<ImportResult> {
    const rows: ImportTransactionRow[] = [];
    for (const raw of rawRows) {
      const norm: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw)) {
        norm[this.flattenKey(k)] = String(v ?? '');
      }

      rows.push({
        rationCardNo:     this.firstOf(norm, ['rationcardno', 'rationcard', 'rationcardnumber', 'rcno', 'rcno', 'beneficiaryid', 'cardno', 'cardnumber']),
        beneficiaryName:  this.firstOf(norm, ['beneficiaryname', 'headoffamily', 'nameofbeneficiary', 'holdername', 'name', 'customername']),
        commodity:        this.firstOf(norm, ['commodity', 'item', 'itemname', 'product', 'grain', 'rationtype']),
        quantityKg:       parseFloat(this.firstOf(norm, ['quantitykg', 'quantity', 'qty', 'kg', 'weight', 'distributedqty', 'issueqty', 'allottedkg'])) || 0,
        pricePerKg:       parseFloat(this.firstOf(norm, ['priceperkg', 'rate', 'price', 'perkgrate', 'kgrate', 'unitprice'])) || 0,
        totalAmount:      parseFloat(this.firstOf(norm, ['totalamount', 'amount', 'total', 'totalrs', 'billamount', 'netamount', 'paidamount'])) || 0,
        transactionDate:  this.firstOf(norm, ['transactiondate', 'date', 'txdate', 'saledate', 'distdate', 'distributiondate', 'allocationdate']),
        month:            this.firstOf(norm, ['month', 'allocmonth', 'monthyear', 'allocmonthyear']),
        transactionId:    this.firstOf(norm, ['transactionid', 'txid', 'receiptno', 'vouchernumber', 'referenceno', 'orderno', 'billno']),
        commissionRate:   parseFloat(this.firstOf(norm, ['commissionrate', 'commission', 'commissionpercent', 'margin'])) || 0,
        department:       'REGULAR_FPS',
        remarks:          '',
        transactionHash:  this.firstOf(norm, ['transactionhash', 'hash', 'checksum', 'txnhash']),
      });
    }

    return this.importTransactions(dealerId, { rows, source, sourceFileId });
  }

  private firstOf(norm: Record<string, string>, keys: string[]): string {
    for (const k of keys) {
      const v = norm[k];
      if (v !== undefined && v !== '') return v;
    }
    return '';
  }

  async getStockLedger(dealerId: string, params: StockLedgerQuery) {
    const conditions: string[] = ['sl.dealer_id = $1'];
    const values: unknown[] = [dealerId];
    let idx = 2;

    if (params.commodity) {
      conditions.push(`sl.commodity = $${idx}`); values.push(params.commodity); idx++;
    }
    if (params.department) {
      conditions.push(`sl.department = $${idx}`); values.push(params.department); idx++;
    }
    if (params.fiscalMonth) {
      conditions.push(`sl.fiscal_month = $${idx}`); values.push(params.fiscalMonth); idx++;
    }

    const where = conditions.join(' AND ');
    const offset = ((params.page || 1) - 1) * (params.limit || 20);
    const lim = params.limit || 20;

    const count = await query(
      `SELECT COUNT(*) FROM stock_ledger sl WHERE ${where}`,
      values
    );
    const total = parseInt(count.rows[0]?.count ?? '0', 10);

    const rows = await query(
      `SELECT sl.*
       FROM stock_ledger sl
       WHERE ${where}
       ORDER BY sl.fiscal_month DESC, sl.commodity ASC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, lim, offset]
    );

    return { data: rows.rows, total, page: params.page || 1, limit: lim };
  }

  async getStockLedgerMovements(dealerId: string, ledgerId: string) {
    const result = await query(
      `SELECT slm.*
       FROM stock_ledger_movements slm
       JOIN stock_ledger sl ON sl.id = slm.ledger_id
       WHERE slm.ledger_id = $1 AND sl.dealer_id = $2
       ORDER BY slm.created_at DESC`,
      [ledgerId, dealerId]
    );
    return result.rows;
  }

  async getFinancialLedger(dealerId: string, params: FinancialLedgerQuery) {
    const conditions: string[] = ['dealer_id = $1'];
    const values: unknown[] = [dealerId];
    let idx = 2;

    if (params.entryType) {
      conditions.push(`entry_type = $${idx}`); values.push(params.entryType); idx++;
    }
    if (params.fiscalMonth) {
      conditions.push(`fiscal_month = $${idx}`); values.push(params.fiscalMonth); idx++;
    }

    const where = conditions.join(' AND ');
    const offset = ((params.page || 1) - 1) * (params.limit || 20);
    const lim = params.limit || 20;

    const count = await query(`SELECT COUNT(*) FROM financial_ledger WHERE ${where}`, values);
    const total = parseInt(count.rows[0]?.count ?? '0', 10);

    const rows = await query(
      `SELECT fl.*,
        CASE
          WHEN fl.reference_type = 'transaction' THEN (SELECT t.ration_card_no FROM transactions t WHERE t.id = fl.reference_id)
          ELSE NULL
        END AS linked_ration_card
       FROM financial_ledger fl
       WHERE ${where}
       ORDER BY fl.recorded_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, lim, offset]
    );

    return { data: rows.rows, total, page: params.page || 1, limit: lim };
  }

  async getFinancialSummary(dealerId: string) {
    const result = await query(
      `SELECT * FROM vw_financial_summary WHERE dealer_id = $1 ORDER BY fiscal_month DESC LIMIT 12`,
      [dealerId]
    );
    return result.rows;
  }

  async getRollingStock(dealerId: string) {
    const result = await query(
      `SELECT * FROM vw_stock_ledger_rolling WHERE dealer_id = $1 ORDER BY commodity, fiscal_month DESC`,
      [dealerId]
    );
    return result.rows;
  }
}

export const enterpriseSyncService = new EnterpriseSyncService();
