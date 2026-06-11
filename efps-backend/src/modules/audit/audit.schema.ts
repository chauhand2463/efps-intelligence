import { z } from 'zod';

export const createAuditSchema = z.object({
  title: z.string().min(1).max(255),
  meeting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  venue: z.string().optional(),
  total_beneficiaries_verified: z.number().int().nonnegative().optional(),
  issues_identified: z.string().optional(),
  resolutions: z.string().optional(),
});

export type CreateAuditInput = z.infer<typeof createAuditSchema>;
