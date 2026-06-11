import { z } from 'zod';

export const createLiftingSchema = z.object({
  commodity: z.enum(['Rice', 'Wheat', 'Sugar', 'Kerosene', 'Oil', 'Pulses']),
  quantity_kg: z.number().positive(),
  month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  vehicle_no: z.string().optional(),
  warehouse: z.string().optional(),
  notes: z.string().optional(),
});

export const listLiftingSchema = z.object({
  month: z.string().optional(),
  commodity: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
});

export type CreateLiftingInput = z.infer<typeof createLiftingSchema>;
export type ListLiftingInput = z.infer<typeof listLiftingSchema>;
