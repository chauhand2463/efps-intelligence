import { z } from 'zod';

export const monthlyReportSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const auditLogSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  action: z.string().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type MonthlyReportInput = z.infer<typeof monthlyReportSchema>;
export type AuditLogInput = z.infer<typeof auditLogSchema>;
