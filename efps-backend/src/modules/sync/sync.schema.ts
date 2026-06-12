import { z } from 'zod';

export const triggerSyncSchema = z.object({
  sync_type: z.enum(['beneficiaries', 'allocations', 'policies', 'sales', 'stock', 'reports']),
});

export const updateBankInfoSchema = z.object({
  bank_name: z.string().optional(),
  branch_name: z.string().optional(),
  account_no: z.string().optional(),
  ifsc_code: z.string().optional(),
  account_holder: z.string().optional(),
});

export const importRowSchema = z.object({
  cardHolderName: z.string().optional().default(''),
  hofAsPerNFSA: z.string().min(1, 'Head of family is required'),
  rationCardNo: z.string().min(1, 'Ration card number is required'),
  cardCategory: z.string().default('NFSA-AAY'),
  familyMember: z.coerce.number().int().positive().default(1),
  lpgStatus: z.string().optional(),
  pngStatus: z.string().optional(),
  address: z.string().optional(),
  village: z.string().optional(),
});

export const importCsvSchema = z.object({
  rows: z.array(importRowSchema).min(1, 'At least one row is required').max(10000, 'Max 10,000 rows per batch'),
});

export const syncAllSchema = z.object({}).optional();

export const syncDistrictSchema = z.object({
  district: z.string().min(1, 'District is required'),
});

export type TriggerSyncInput = z.infer<typeof triggerSyncSchema>;
export type UpdateBankInfoInput = z.infer<typeof updateBankInfoSchema>;
export type ImportRowInput = z.infer<typeof importRowSchema>;
export type ImportCsvInput = z.infer<typeof importCsvSchema>;
