-- 011_add_sync_logs.sql
-- Component 10: Govt Sync (Government Integration Gateway)

CREATE TABLE sync_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type       VARCHAR(50) NOT NULL,
  direction       VARCHAR(10) NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending',
  entity          VARCHAR(50),
  entity_count    INTEGER DEFAULT 0,
  payload         JSONB,
  response        JSONB,
  error_message   TEXT,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_status ON sync_logs(status);
CREATE INDEX idx_sync_logs_type ON sync_logs(sync_type, created_at);

CREATE TABLE dealer_bank_info (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID UNIQUE REFERENCES dealers(id),
  bank_name       VARCHAR(255),
  branch_name     VARCHAR(255),
  account_no      VARCHAR(50),
  ifsc_code       VARCHAR(20),
  account_holder  VARCHAR(255),
  is_verified     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
