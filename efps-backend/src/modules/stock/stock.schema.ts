import { z } from 'zod';

export const listStockHistorySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  commodity: z.enum(['Rice', 'Wheat', 'Sugar', 'Kerosene', 'Oil', 'Pulses']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const updateAllocationSchema = z.object({
  allocated_kg: z.number().min(0, 'Allocated kg must be non-negative'),
  lifted_kg: z.number().min(0, 'Lifted kg must be non-negative').optional(),
});

export type ListStockHistoryInput = z.infer<typeof listStockHistorySchema>;
export type UpdateAllocationInput = z.infer<typeof updateAllocationSchema>;
