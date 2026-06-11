import { z } from 'zod';

export const createSchemeSchema = z.object({
  name: z.string().min(1).max(255),
  department: z.string().optional(),
  description: z.string().optional(),
  eligibility_criteria: z.string().optional(),
  benefits: z.string().optional(),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  effective_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const updateSchemeSchema = z.object({
  name: z.string().optional(),
  department: z.string().optional(),
  description: z.string().optional(),
  eligibility_criteria: z.string().optional(),
  benefits: z.string().optional(),
  effective_from: z.string().optional(),
  effective_to: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export const createIcdsCodeSchema = z.object({
  code: z.string().min(1).max(20),
  description: z.string().min(1),
  category: z.string().optional(),
  department: z.string().optional(),
});

export type CreateSchemeInput = z.infer<typeof createSchemeSchema>;
export type UpdateSchemeInput = z.infer<typeof updateSchemeSchema>;
export type CreateIcdsCodeInput = z.infer<typeof createIcdsCodeSchema>;
