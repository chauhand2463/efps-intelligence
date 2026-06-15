import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import type { JwtPayload } from '../types/models.js';

export function signAccessToken(payload: Omit<JwtPayload, 'sub'> & { sub: string }): string {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRY,
  } as jwt.SignOptions);
}

export function signRefreshToken(dealerId: string): string {
  return jwt.sign({ sub: dealerId, jti: crypto.randomUUID() }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRY,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as { sub: string };
}

export function decodeAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}
