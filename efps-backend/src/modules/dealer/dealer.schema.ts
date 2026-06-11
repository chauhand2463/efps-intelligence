import { z } from 'zod';

export const registerDealerSchema = z.object({
  fps_id: z.string().regex(/^\d{5,20}$/, 'FPS ID must be 5-20 digits'),
  full_name: z.string().min(2).max(255),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile must be a valid 10-digit Indian number'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  address: z.string().optional(),
  district: z.string().optional(),
  taluka: z.string().optional(),
  village: z.string().optional(),
  area_id: z.string().optional(),
});

export const updateDealerSchema = z.object({
  full_name: z.string().min(2).max(255).optional(),
  address: z.string().optional(),
  district: z.string().optional(),
  taluka: z.string().optional(),
  village: z.string().optional(),
  area_id: z.string().optional(),
});

export type RegisterDealerInput = z.infer<typeof registerDealerSchema>;
export type UpdateDealerInput = z.infer<typeof updateDealerSchema>;
