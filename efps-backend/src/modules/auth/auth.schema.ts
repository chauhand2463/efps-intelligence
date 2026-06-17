import { z } from 'zod';

const fpsIdSchema = z.string().min(3, 'FPS ID must be at least 3 characters').max(20, 'FPS ID must be at most 20 characters');

export const loginSchema = z.object({
  fps_id: fpsIdSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const forgotPasswordRequestSchema = z.object({
  fps_id: fpsIdSchema,
  mobile: z.string().regex(/^\d{10}$/, 'Mobile must be a valid 10-digit Indian number'),
});

export const forgotPasswordVerifySchema = z.object({
  fps_id: fpsIdSchema,
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const forgotPasswordResetSchema = z.object({
  fps_id: fpsIdSchema,
  token: z.string().min(1, 'Verification token is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordRequestInput = z.infer<typeof forgotPasswordRequestSchema>;
export type ForgotPasswordVerifyInput = z.infer<typeof forgotPasswordVerifySchema>;
export type ForgotPasswordResetInput = z.infer<typeof forgotPasswordResetSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
