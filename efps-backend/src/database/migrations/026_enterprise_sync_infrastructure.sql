-- 026: Enterprise Sync Infrastructure
-- sync_jobs enhancement + quarantine + system_events + internal service auth

ALTER TABLE sync_jobs
  ADD COLUMN IF NOT EXISTS priority          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sync_mode         VARCHAR(20) NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS worker_version    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS website_version   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS processed_count   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quarantined_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_detail      JSONB,
  ADD COLUMN IF NOT EXISTS trace_id          VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_dealer_status ON sync_jobs (dealer_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_priority ON sync_jobs (priority DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_trace_id ON sync_jobs (trace_id);

-- Quarantine table for rejected/invalid sync records
CREATE TABLE IF NOT EXISTS sync_quarantine (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id     UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  sync_job_id   UUID REFERENCES sync_jobs(id) ON DELETE SET NULL,
  record_type   VARCHAR(50) NOT NULL,
  raw_data      JSONB NOT NULL,
  errors        JSONB NOT NULL,
  source        VARCHAR(50) NOT NULL DEFAULT 'playwright',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at   TIMESTAMPTZ,
  reviewed_by   UUID REFERENCES dealers(id) ON DELETE SET NULL,
  resolution    VARCHAR(20),
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_quarantine_dealer ON sync_quarantine (dealer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_quarantine_resolution ON sync_quarantine (resolution) WHERE resolution IS NULL;

-- System events for observability
CREATE TABLE IF NOT EXISTS system_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    VARCHAR(50) NOT NULL,
  severity      VARCHAR(20) NOT NULL DEFAULT 'info',
  source        VARCHAR(100) NOT NULL,
  message       TEXT NOT NULL,
  metadata      JSONB,
  trace_id      VARCHAR(64),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_events_type ON system_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_severity ON system_events (severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_created ON system_events (created_at DESC);

-- Internal service auth tokens
CREATE TABLE IF NOT EXISTS service_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  token_hash    VARCHAR(64) NOT NULL UNIQUE,
  permissions   JSONB NOT NULL DEFAULT '["sync:write"]'::JSONB,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  last_used_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_service_tokens_hash ON service_tokens (token_hash);

-- Enhanced sync_scheduler_config
ALTER TABLE sync_scheduler_config
  ADD COLUMN IF NOT EXISTS sync_mode          VARCHAR(20) NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS jitter_minutes     INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS last_full_sync_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_incremental_at TIMESTAMPTZ;

-- Add source_synced_at to tables that are missing it
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['beneficiaries', 'transactions', 'stock_allocations', 'lifting_records']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = tbl AND column_name = 'source_synced_at'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN source_synced_at TIMESTAMPTZ', tbl);
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = tbl AND column_name = 'sync_job_id'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN sync_job_id UUID REFERENCES sync_jobs(id) ON DELETE SET NULL', tbl);
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = tbl AND column_name = 'version'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN version INTEGER NOT NULL DEFAULT 1', tbl);
    END IF;
  END LOOP;
END $$;
