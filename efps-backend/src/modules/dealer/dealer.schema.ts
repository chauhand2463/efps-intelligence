import { z } from 'zod';

export const registerDealerSchema = z.object({
  fps_id: z.string().min(3, 'FPS ID must be at least 3 characters').max(20, 'FPS ID must be at most 20 characters'),
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
  efps_username: z.string().min(1, 'eFPS username is required for govt sync').optional(),
  efps_password: z.string().min(1, 'eFPS password is required for govt sync').optional(),
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
