import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const regionParamsSchema = z.object({
  regionId: z.string().uuid(),
});

export const monthParamSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
});

export const importCsvRowSchema = z.object({
  srNo: z.coerce.number().int().optional(),
  areaName: z.string().min(1, 'Area name is required'),
  nfsaAayRc: z.coerce.number().int().default(0),
  nfsaAayBen: z.coerce.number().int().default(0),
  nfsaPhhRc: z.coerce.number().int().default(0),
  nfsaPhhBen: z.coerce.number().int().default(0),
  nfsaApl1Rc: z.coerce.number().int().default(0),
  nfsaApl1Ben: z.coerce.number().int().default(0),
  nfsaApl2Rc: z.coerce.number().int().default(0),
  nfsaApl2Ben: z.coerce.number().int().default(0),
  nfsaBplRc: z.coerce.number().int().default(0),
  nfsaBplBen: z.coerce.number().int().default(0),
  nonNfsaApl1Rc: z.coerce.number().int().default(0),
  nonNfsaApl1Ben: z.coerce.number().int().default(0),
  nonNfsaApl2Rc: z.coerce.number().int().default(0),
  nonNfsaApl2Ben: z.coerce.number().int().default(0),
  nonNfsaBplRc: z.coerce.number().int().default(0),
  nonNfsaBplBen: z.coerce.number().int().default(0),
  totalCards: z.coerce.number().int().optional(),
  totalBeneficiaries: z.coerce.number().int().optional(),
});

export const importCsvSchema = z.object({
  level: z.enum(['state', 'district', 'taluka', 'ward']),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  rows: z.array(importCsvRowSchema).min(1).max(50000),
  parentRegionName: z.string().optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
export type RegionParams = z.infer<typeof regionParamsSchema>;
export type MonthParam = z.infer<typeof monthParamSchema>;
export type ImportCsvRow = z.infer<typeof importCsvRowSchema>;
export type ImportCsvInput = z.infer<typeof importCsvSchema>;
