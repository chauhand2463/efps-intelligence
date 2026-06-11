-- 003_add_otp.sql

CREATE TABLE otp_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile      VARCHAR(15) NOT NULL,
  fps_id      VARCHAR(20),
  otp_hash    VARCHAR(255) NOT NULL,
  purpose     VARCHAR(30) NOT NULL,
  attempts    SMALLINT DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otp_mobile ON otp_requests(mobile);
