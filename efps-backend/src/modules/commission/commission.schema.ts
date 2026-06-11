import { z } from 'zod';

export const setCommissionRateSchema = z.object({
  commodity: z.enum(['Rice', 'Wheat', 'Sugar', 'Kerosene', 'Oil', 'Pulses']),
  rate_per_kg: z.number().min(0),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const listCommissionSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
});

export const settlementSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type SetCommissionRateInput = z.infer<typeof setCommissionRateSchema>;
export type ListCommissionInput = z.infer<typeof listCommissionSchema>;
export type SettlementInput = z.infer<typeof settlementSchema>;
