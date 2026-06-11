import { z } from 'zod';

export const createAdSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  type: z.enum(['announcement', 'notice', 'offer', 'promotion']).default('announcement'),
  expires_at: z.string().optional(),
});

export const updateAdSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  is_active: z.boolean().optional(),
  expires_at: z.string().nullable().optional(),
});

export type CreateAdInput = z.infer<typeof createAdSchema>;
export type UpdateAdInput = z.infer<typeof updateAdSchema>;
