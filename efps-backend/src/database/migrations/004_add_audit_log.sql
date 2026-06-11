-- 004_add_audit_log.sql

CREATE TABLE audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  dealer_id   UUID,
  action      VARCHAR(100) NOT NULL,
  entity      VARCHAR(50),
  entity_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_dealer ON audit_logs(dealer_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
