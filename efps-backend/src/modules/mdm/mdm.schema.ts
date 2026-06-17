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

export const listSchemesSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  is_active: z.coerce.boolean().optional(),
});

export const createIcdsCodeSchema = z.object({
  code: z.string().min(1).max(20),
  description: z.string().min(1),
  category: z.string().optional(),
  department: z.string().optional(),
});

export const listIcdsCodesSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  category: z.string().optional(),
});

const monthRegex = /^(January|February|March|April|May|June|July|August|September|October|November|December)$/i;

export const saveMonthlyRecordSchema = z.object({
  month: z.string().regex(monthRegex, 'Invalid month name'),
  year: z.number().int().min(2020).max(2100),
  records: z.array(z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    openingStock: z.number().optional(),
    income: z.number().optional(),
    distribution: z.number().optional(),
    rate: z.number().optional(),
  })),
});

export const getMonthlyRecordSchema = z.object({
  month: z.string().regex(monthRegex, 'Invalid month name'),
  year: z.coerce.number().int().min(2020).max(2100),
});

export type CreateSchemeInput = z.infer<typeof createSchemeSchema>;
export type UpdateSchemeInput = z.infer<typeof updateSchemeSchema>;
export type ListSchemesInput = z.infer<typeof listSchemesSchema>;
export type CreateIcdsCodeInput = z.infer<typeof createIcdsCodeSchema>;
export type ListIcdsCodesInput = z.infer<typeof listIcdsCodesSchema>;
export type SaveMonthlyRecordInput = z.infer<typeof saveMonthlyRecordSchema>;
export type GetMonthlyRecordInput = z.infer<typeof getMonthlyRecordSchema>;
