import { z } from 'zod';

export const createAuditSchema = z.object({
  title: z.string().min(1).max(255),
  meeting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  venue: z.string().optional(),
  total_beneficiaries_verified: z.number().int().nonnegative().optional(),
  issues_identified: z.string().optional(),
  resolutions: z.string().optional(),
});

export const updateAuditSchema = z.object({
  title: z.string().optional(),
  meeting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  venue: z.string().optional(),
  total_beneficiaries_verified: z.number().int().nonnegative().optional(),
  issues_identified: z.string().optional(),
  resolutions: z.string().optional(),
});

export const listAuditSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type CreateAuditInput = z.infer<typeof createAuditSchema>;
export type UpdateAuditInput = z.infer<typeof updateAuditSchema>;
export type ListAuditInput = z.infer<typeof listAuditSchema>;
