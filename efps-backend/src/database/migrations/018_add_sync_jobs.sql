CREATE TABLE sync_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID REFERENCES dealers(id) ON DELETE CASCADE,
  status          VARCHAR(20) DEFAULT 'pending',
  triggered_by    VARCHAR(20) DEFAULT 'scheduled',
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error_message   TEXT,
  records_synced  INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_jobs_dealer_id ON sync_jobs(dealer_id);
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX idx_sync_jobs_created ON sync_jobs(created_at);
