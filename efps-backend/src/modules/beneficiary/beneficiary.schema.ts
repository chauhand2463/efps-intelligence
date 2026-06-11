import { z } from 'zod';

export const createBeneficiarySchema = z.object({
  ration_card_no: z.string().min(1, 'Ration card number is required').max(30),
  head_of_family: z.string().min(2).max(255),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile must be a valid 10-digit number').optional().nullable(),
  member_count: z.number().int().min(1).max(20).default(1),
  category: z.enum(['APL', 'BPL', 'AAY', 'PHH']).optional().nullable(),
});

export const updateBeneficiarySchema = z.object({
  ration_card_no: z.string().min(1).max(30).optional(),
  head_of_family: z.string().min(2).max(255).optional(),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile must be a valid 10-digit number').optional().nullable(),
  member_count: z.number().int().min(1).max(20).optional(),
  category: z.enum(['APL', 'BPL', 'AAY', 'PHH']).optional().nullable(),
  is_active: z.boolean().optional(),
});

export const searchBeneficiarySchema = z.object({
  q: z.string().min(1).optional(),
  ration_card_no: z.string().optional(),
  category: z.enum(['APL', 'BPL', 'AAY', 'PHH']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type CreateBeneficiaryInput = z.infer<typeof createBeneficiarySchema>;
export type UpdateBeneficiaryInput = z.infer<typeof updateBeneficiarySchema>;
export type SearchBeneficiaryInput = z.infer<typeof searchBeneficiarySchema>;
