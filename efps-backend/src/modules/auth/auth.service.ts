import { query } from '../../config/database.js';
import { getRedis } from '../../config/redis.js';
import { hashPassword, verifyPassword, hashOtp, hashToken } from '../../shared/utils/hash.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../shared/utils/token.js';
import { generateOtp } from '../../shared/utils/otp.js';
import { AuthError, SessionNotFoundError } from '../../shared/errors/AuthError.js';
import { ValidationError } from '../../shared/errors/ValidationError.js';
import { AppError } from '../../shared/errors/AppError.js';
import { config } from '../../config/index.js';
import { ERROR_CODES, ONLINE_TTL_SECONDS } from '../../config/constants.js';
import type { Dealer } from '../../shared/types/models.js';
import type { LoginInput, ForgotPasswordRequestInput, ForgotPasswordVerifyInput, ForgotPasswordResetInput, ChangePasswordInput, RefreshTokenInput } from './auth.schema.js';

export class AuthService {
  async login(input: LoginInput, userAgent: string | undefined, ipAddress: string) {
    const result = await query(
      `SELECT id, fps_id, full_name, mobile, password_hash, role, is_active, is_verified
       FROM dealers WHERE fps_id = $1`,
      [input.fps_id]
    );

    const dealer = result.rows[0] as Dealer | undefined;
    if (!dealer) {
      throw new AuthError('INVALID_CREDENTIALS', 'FPS ID or password is incorrect');
    }

    if (!dealer.is_active) {
      throw new AuthError('ACCOUNT_SUSPENDED', 'Your account has been suspended. Contact support.');
    }

    const valid = await verifyPassword(dealer.password_hash, input.password);
    if (!valid) {
      throw new AuthError('INVALID_CREDENTIALS', 'FPS ID or password is incorrect');
    }

    const accessToken = signAccessToken({
      sub: dealer.id,
      role: dealer.role,
      fps_id: dealer.fps_id,
    });

    const refreshToken = signRefreshToken(dealer.id);
    const refreshTokenHash = hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await query(
      `INSERT INTO sessions (dealer_id, refresh_token_hash, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [dealer.id, refreshTokenHash, userAgent ?? null, ipAddress, expiresAt]
    );

    await query(
      `UPDATE dealers SET last_login_at = NOW() WHERE id = $1`,
      [dealer.id]
    );

    const redis = getRedis();
    await redis.set(`dealer:${dealer.id}:online`, '1', 'EX', ONLINE_TTL_SECONDS);
    await redis.sadd('online_dealers', dealer.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      dealer: {
        id: dealer.id,
        fps_id: dealer.fps_id,
        full_name: dealer.full_name,
        mobile: dealer.mobile,
        role: dealer.role,
        is_verified: dealer.is_verified,
      },
    };
  }

  async logout(accessToken: string, dealerId: string) {
    const redis = getRedis();

    const decoded = JSON.parse(Buffer.from(accessToken.split('.')[1]!, 'base64url').toString());
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    if (expiresIn > 0) {
      await redis.set(`blacklist:token:${accessToken}`, '1', 'EX', expiresIn);
    }

    await redis.del(`dealer:${dealerId}:online`);
    await redis.srem('online_dealers', dealerId);

    return { message: 'Logged out successfully' };
  }

  async refresh(input: RefreshTokenInput) {
    try {
      verifyRefreshToken(input.refresh_token);
    } catch {
      throw new AuthError('TOKEN_INVALID', 'Invalid refresh token');
    }

    const refreshTokenHash = hashToken(input.refresh_token);

    const result = await query(
      `SELECT id, dealer_id FROM sessions WHERE refresh_token_hash = $1 AND expires_at > NOW()`,
      [refreshTokenHash]
    );

    const session = result.rows[0];
    if (!session) {
      throw new SessionNotFoundError();
    }

    await query(`DELETE FROM sessions WHERE id = $1`, [session.id]);

    const dealerResult = await query(
      `SELECT id, fps_id, role FROM dealers WHERE id = $1 AND is_active = TRUE`,
      [session.dealer_id]
    );

    const dealer = dealerResult.rows[0] as Pick<Dealer, 'id' | 'fps_id' | 'role'> | undefined;
    if (!dealer) {
      throw new AuthError('ACCOUNT_SUSPENDED', 'Account not found or suspended');
    }

    const newAccessToken = signAccessToken({
      sub: dealer.id,
      role: dealer.role,
      fps_id: dealer.fps_id,
    });

    const newRefreshToken = signRefreshToken(dealer.id);
    const newRefreshTokenHash = hashToken(newRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await query(
      `INSERT INTO sessions (dealer_id, refresh_token_hash, expires_at) VALUES ($1, $2, $3)`,
      [dealer.id, newRefreshTokenHash, expiresAt]
    );

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  async forgotPasswordRequest(input: ForgotPasswordRequestInput) {
    const result = await query(
      `SELECT id, full_name FROM dealers WHERE fps_id = $1 AND mobile = $2 AND is_active = TRUE`,
      [input.fps_id, input.mobile]
    );

    const dealer = result.rows[0];
    if (!dealer) {
      return { message: 'If the FPS ID and mobile match our records, an OTP will be sent.' };
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + config.OTP_TTL_MINUTES * 60 * 1000);

    await query(
      `INSERT INTO otp_requests (mobile, fps_id, otp_hash, purpose, expires_at)
       VALUES ($1, $2, $3, 'password_reset', $4)`,
      [input.mobile, input.fps_id, otpHash, expiresAt]
    );

    console.log(`[DEV] OTP for ${input.fps_id}: ${otp}`);

    return { message: 'If the FPS ID and mobile match our records, an OTP will be sent.' };
  }

  async forgotPasswordVerify(input: ForgotPasswordVerifyInput) {
    const result = await query(
      `SELECT id, otp_hash, attempts, expires_at, used_at
       FROM otp_requests
       WHERE fps_id = $1 AND purpose = 'password_reset' AND used_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [input.fps_id]
    );

    const otpRecord = result.rows[0];
    if (!otpRecord) {
      throw new ValidationError('No OTP request found. Please request a new OTP.');
    }

    if (otpRecord.used_at) {
      throw new ValidationError('OTP already used. Please request a new one.');
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      throw new AppError('OTP has expired. Please request a new one.', 400, ERROR_CODES.OTP_EXPIRED);
    }

    if (otpRecord.attempts >= config.OTP_MAX_ATTEMPTS) {
      throw new AppError('Maximum OTP attempts exceeded. Please request a new OTP.', 400, ERROR_CODES.OTP_MAX_ATTEMPTS);
    }

    const inputOtpHash = hashOtp(input.otp);
    if (inputOtpHash !== otpRecord.otp_hash) {
      await query(`UPDATE otp_requests SET attempts = attempts + 1 WHERE id = $1`, [otpRecord.id]);
      throw new ValidationError('Invalid OTP');
    }

    await query(`UPDATE otp_requests SET used_at = NOW() WHERE id = $1`, [otpRecord.id]);

    const verificationToken = signAccessToken({
      sub: input.fps_id,
      role: 'dealer',
      fps_id: input.fps_id,
    });

    return {
      message: 'OTP verified successfully',
      verification_token: verificationToken,
    };
  }

  async forgotPasswordReset(input: ForgotPasswordResetInput) {
    const decoded = verifyRefreshToken(input.otp);
    if (!decoded.sub) {
      throw new AuthError('TOKEN_INVALID', 'Invalid verification token');
    }

    const passwordHash = await hashPassword(input.new_password);

    await query(
      `UPDATE dealers SET password_hash = $1, updated_at = NOW() WHERE fps_id = $2`,
      [passwordHash, input.fps_id]
    );

    await query(
      `DELETE FROM sessions WHERE dealer_id = (SELECT id FROM dealers WHERE fps_id = $1)`,
      [input.fps_id]
    );

    return { message: 'Password reset successfully. Please login with your new password.' };
  }

  async changePassword(input: ChangePasswordInput, dealerId: string) {
    const result = await query(
      `SELECT password_hash FROM dealers WHERE id = $1`,
      [dealerId]
    );

    const dealer = result.rows[0] as Pick<Dealer, 'password_hash'> | undefined;
    if (!dealer) {
      throw new AppError('Dealer not found', 404, ERROR_CODES.DEALER_NOT_FOUND);
    }

    const valid = await verifyPassword(dealer.password_hash, input.current_password);
    if (!valid) {
      throw new ValidationError('Current password is incorrect', 'current_password');
    }

    const newHash = await hashPassword(input.new_password);
    await query(`UPDATE dealers SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [newHash, dealerId]);

    return { message: 'Password changed successfully' };
  }

  async getMe(dealerId: string) {
    const result = await query(
      `SELECT id, fps_id, area_id, full_name, mobile, address, district, taluka, village,
              role, is_active, is_verified, last_login_at, created_at
       FROM dealers WHERE id = $1`,
      [dealerId]
    );

    const dealer = result.rows[0];
    if (!dealer) {
      throw new AppError('Dealer not found', 404, ERROR_CODES.DEALER_NOT_FOUND);
    }

    return dealer;
  }
}

export const authService = new AuthService();
