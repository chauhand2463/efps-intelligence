-- 002_add_sessions.sql

CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id     UUID REFERENCES dealers(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL,
  user_agent    TEXT,
  ip_address    INET,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_dealer_id ON sessions(dealer_id);
