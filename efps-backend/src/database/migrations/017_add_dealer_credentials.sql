-- ============================================================
-- DEALER CREDENTIALS (encrypted eFPS government portal credentials)
-- ============================================================
-- CRITICAL: This table stores dealers' government portal credentials
-- encrypted with AES-256-GCM. The encryption key is NEVER stored in
-- the database. Access is restricted to the sync worker only.
-- Credentials are NEVER returned in any API response.
-- ============================================================

CREATE TABLE IF NOT EXISTS dealer_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID UNIQUE NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  efps_username   TEXT NOT NULL,
  efps_password   TEXT NOT NULL,
  iv              VARCHAR(32) NOT NULL,
  auth_tag        VARCHAR(32) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Add sync_enabled column to dealers if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dealers' AND column_name = 'sync_enabled'
  ) THEN
    ALTER TABLE dealers ADD COLUMN sync_enabled BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dealers' AND column_name = 'last_sync_at'
  ) THEN
    ALTER TABLE dealers ADD COLUMN last_sync_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================
-- DEALER BANK INFO
-- ============================================================
CREATE TABLE IF NOT EXISTS dealer_bank_info (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID UNIQUE NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  bank_name       VARCHAR(255),
  branch_name     VARCHAR(255),
  account_no      VARCHAR(50),
  ifsc_code       VARCHAR(20),
  account_holder  VARCHAR(255),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SYNC SCHEDULER CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_scheduler_config (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id            UUID UNIQUE NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  sync_enabled         BOOLEAN DEFAULT TRUE,
  sync_interval_mins   INTEGER DEFAULT 1440,
  last_sync_at         TIMESTAMPTZ,
  next_sync_at         TIMESTAMPTZ,
  sync_status          VARCHAR(20) DEFAULT 'idle',
  consecutive_failures INTEGER DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GOVT SYNC ENHANCEMENT TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_import_batches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type      VARCHAR(50) NOT NULL DEFAULT 'csv',
  status           VARCHAR(20) DEFAULT 'in_progress',
  total_records    INTEGER DEFAULT 0,
  new_records      INTEGER DEFAULT 0,
  updated_records  INTEGER DEFAULT 0,
  unchanged_records INTEGER DEFAULT 0,
  error_count      INTEGER DEFAULT 0,
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS govt_beneficiary_imports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id        UUID REFERENCES dealers(id),
  district         VARCHAR(100),
  taluka           VARCHAR(100),
  village          VARCHAR(100),
  import_batch_id  UUID REFERENCES sync_import_batches(id),
  source_type      VARCHAR(20) DEFAULT 'csv',
  raw_data         JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS govt_change_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id        UUID REFERENCES dealers(id),
  beneficiary_id   UUID REFERENCES beneficiaries(id),
  ration_card_no   VARCHAR(30),
  change_type      VARCHAR(20) NOT NULL,
  field_changed    VARCHAR(100),
  old_value        TEXT,
  new_value        TEXT,
  sync_batch_id    UUID REFERENCES sync_import_batches(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_govt_change_log_batch   ON govt_change_log(sync_batch_id);
CREATE INDEX IF NOT EXISTS idx_govt_change_log_dealer   ON govt_change_log(dealer_id);
CREATE INDEX IF NOT EXISTS idx_govt_beneficiary_batch   ON govt_beneficiary_imports(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_sync_batches_status      ON sync_import_batches(status);
