import { z } from 'zod';

export const importTransactionRowSchema = z.object({
  rationCardNo: z.string().min(1, 'Ration card number is required'),
  beneficiaryName: z.string().optional().default(''),
  commodity: z.string().min(1, 'Commodity is required'),
  quantityKg: z.coerce.number().positive('Quantity must be positive'),
  pricePerKg: z.coerce.number().nonnegative().optional().default(0),
  totalAmount: z.coerce.number().nonnegative().optional().default(0),
  transactionDate: z.string().optional(), // YYYY-MM-DD
  month: z.string().optional(),           // YYYY-MM-DD (first of month)
  transactionId: z.string().optional(),   // upstream govt transaction ID
  transactionHash: z.string().optional(), // dedup hash from govt portal
  commissionRate: z.coerce.number().nonnegative().optional().default(0),
  department: z.enum(['REGULAR_FPS', 'MDM', 'ICDS']).optional().default('REGULAR_FPS'),
  remarks: z.string().optional().default(''),
});

export const importTransactionsSchema = z.object({
  rows: z.array(importTransactionRowSchema).min(1).max(50000),
  source: z.enum(['EXCEL_SYNC', 'MANUAL_CBDC', 'OFFLINE']).optional().default('EXCEL_SYNC'),
  sourceFileId: z.string().uuid().optional(),
});

export const stockLedgerQuerySchema = z.object({
  commodity: z.string().optional(),
  department: z.enum(['REGULAR_FPS', 'MDM', 'ICDS']).optional().default('REGULAR_FPS'),
  fiscalMonth: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const financialLedgerQuerySchema = z.object({
  entryType: z.string().optional(),
  fiscalMonth: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type ImportTransactionRow = z.infer<typeof importTransactionRowSchema>;
export type ImportTransactionsInput = z.infer<typeof importTransactionsSchema>;
export type StockLedgerQuery = z.infer<typeof stockLedgerQuerySchema>;
export type FinancialLedgerQuery = z.infer<typeof financialLedgerQuerySchema>;
