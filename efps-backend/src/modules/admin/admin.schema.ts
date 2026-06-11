import { z } from 'zod';

export const listDealersSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  district: z.string().optional(),
  taluka: z.string().optional(),
  is_active: z.coerce.boolean().optional(),
});

export const bulkNotifySchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().min(1).max(2000),
  type: z.enum(['info', 'warning', 'alert']).default('info'),
  dealer_ids: z.array(z.string().uuid()).min(1, 'At least one dealer required').max(1000).optional(),
  district: z.string().optional(),
});

export type ListDealersInput = z.infer<typeof listDealersSchema>;
export type BulkNotifyInput = z.infer<typeof bulkNotifySchema>;
