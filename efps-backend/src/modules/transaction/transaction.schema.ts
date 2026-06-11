import { z } from 'zod';

export const createTransactionSchema = z.object({
  beneficiary_id: z.string().uuid(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  commodity: z.enum(['Rice', 'Wheat', 'Sugar', 'Kerosene', 'Oil', 'Pulses']),
  quantity_kg: z.number().positive('Quantity must be positive'),
  price_per_kg: z.number().min(0).optional().nullable(),
  total_amount: z.number().min(0).optional().nullable(),
  mode: z.enum(['pos', 'manual', 'otg']).default('pos'),
  biometric_auth: z.boolean().default(false),
  remarks: z.string().max(500).optional().nullable(),
});

export const listTransactionsSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  commodity: z.enum(['Rice', 'Wheat', 'Sugar', 'Kerosene', 'Oil', 'Pulses']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type ListTransactionsInput = z.infer<typeof listTransactionsSchema>;
