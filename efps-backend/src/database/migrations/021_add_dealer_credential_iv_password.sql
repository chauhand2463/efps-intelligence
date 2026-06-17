-- ============================================================
-- Fix encryptMany IV/auth-tag per-field storage
-- Each ciphertext needs its own IV + auth_tag for AES-256-GCM
-- ============================================================
ALTER TABLE dealer_credentials
  ADD COLUMN IF NOT EXISTS iv_efps_password VARCHAR(32),
  ADD COLUMN IF NOT EXISTS auth_tag_efps_password VARCHAR(32);
