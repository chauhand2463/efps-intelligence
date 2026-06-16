import { z } from 'zod';

export const createAdSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  type: z.enum(['announcement', 'notice', 'offer', 'promotion']).default('announcement'),
  expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const updateAdSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  is_active: z.boolean().optional(),
  expires_at: z.string().nullable().optional(),
});

export const listAdsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type CreateAdInput = z.infer<typeof createAdSchema>;
export type UpdateAdInput = z.infer<typeof updateAdSchema>;
export type ListAdsInput = z.infer<typeof listAdsSchema>;
