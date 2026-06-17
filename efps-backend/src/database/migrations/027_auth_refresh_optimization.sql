-- 027: Auth refresh optimization
-- Index for faster refresh token lookup, unused session cleanup

CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token_hash ON sessions (refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
