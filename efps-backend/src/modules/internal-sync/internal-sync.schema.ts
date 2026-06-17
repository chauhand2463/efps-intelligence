import { z } from 'zod';

export const beneficiaryRecordSchema = z.object({
  ration_card_no: z.string().min(1).max(20),
  beneficiary_name: z.string().min(1).max(200),
  father_name: z.string().max(200).optional().default(''),
  address: z.string().max(500).optional().default(''),
  district: z.string().max(100).optional().default(''),
  taluka: z.string().max(100).optional().default(''),
  district_name: z.string().max(100).optional().default(''),
  taluka_name: z.string().max(100).optional().default(''),
  mobile_no: z.string().max(20).optional().default(''),
  mobile: z.string().max(20).optional().default(''),
  date_of_issue: z.string().max(20).optional().nullable().default(null),
  ration_type: z.string().max(50).optional().default(''),
  category: z.string().max(50).optional().default(''),
  status: z.string().max(50).optional().default('active'),
  source_synced_at: z.string().optional(),
  sync_job_id: z.string().uuid().optional(),
  version: z.number().int().positive().optional().default(1),
});

export const transactionRecordSchema = z.object({
  ration_card_no: z.string().min(1).max(20),
  beneficiary_name: z.string().max(200).optional().default(''),
  transaction_date: z.string().min(1).max(20),
  commodity: z.string().min(1).max(100),
  allocated_quantity: z.number().nonnegative().optional().default(0),
  lifted_quantity: z.number().nonnegative().optional().default(0),
  amount_paid: z.number().nonnegative().optional().default(0),
  transaction_id: z.string().max(100).optional().default(''),
  shop_no: z.string().max(50).optional().default(''),
  month: z.string().max(20).optional().default(''),
  year: z.string().max(10).optional().default(''),
  status: z.string().max(50).optional().default('completed'),
  source_synced_at: z.string().optional(),
  sync_job_id: z.string().uuid().optional(),
  version: z.number().int().positive().optional().default(1),
});

export const stockAllocationRecordSchema = z.object({
  commodity: z.string().min(1).max(100),
  allocated_quantity: z.number().nonnegative(),
  lifted_quantity: z.number().nonnegative().optional().default(0),
  month: z.string().min(1).max(20),
  year: z.string().max(10).optional().default(''),
  month_year: z.string().max(20).optional().default(''),
  unit: z.string().max(20).optional().default('Kg'),
  status: z.string().max(50).optional().default('pending'),
  source_synced_at: z.string().optional(),
  sync_job_id: z.string().uuid().optional(),
  version: z.number().int().positive().optional().default(1),
});

export const syncPayloadSchema = z.object({
  dealer_id: z.string().uuid(),
  sync_job_id: z.string().uuid().optional(),
  sync_mode: z.enum(['full', 'incremental', 'priority']).optional().default('full'),
  workers: z.array(z.object({
    type: z.enum(['beneficiary', 'transaction', 'stock_allocation', 'lifting_record']),
    records: z.array(z.record(z.unknown())),
  })).min(1),
  trace_id: z.string().max(64).optional(),
  worker_version: z.string().max(50).optional(),
  website_version: z.string().max(50).optional(),
});

export type SyncPayload = z.infer<typeof syncPayloadSchema>;
export type BeneficiaryRecord = z.infer<typeof beneficiaryRecordSchema>;
export type TransactionRecord = z.infer<typeof transactionRecordSchema>;
export type StockAllocationRecord = z.infer<typeof stockAllocationRecordSchema>;
