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

export type TriggerSyncInput = z.infer<typeof triggerSyncSchema>;
export type UpdateBankInfoInput = z.infer<typeof updateBankInfoSchema>;
