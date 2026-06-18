import { z } from 'zod';

export const stockEntryRowSchema = z.object({
  commodityId: z.string(),
  commodity: z.string().min(1),
  received: z.number().min(0, 'Received quantity cannot be negative'),
  damaged: z.number().min(0, 'Damaged quantity cannot be negative'),
  remarks: z.string().optional().default(''),
});

export const saveStockEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  entries: z.array(stockEntryRowSchema).min(1),
});

export const allocateSchema = z.object({
  beneficiary_id: z.string().uuid(),
  commodity: z.string().min(1),
  allocated_quantity: z.number().positive('Allocation must be positive'),
  allocation_month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const listStockHistorySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  commodity: z.string().optional(),
  type: z.enum(['all', 'receipt', 'allocation', 'damage', 'adjustment', 'transfer']).optional().default('all'),
});

export type SaveStockEntryInput = z.infer<typeof saveStockEntrySchema>;
export type AllocateInput = z.infer<typeof allocateSchema>;
export type ListStockHistoryInput = z.infer<typeof listStockHistorySchema>;
