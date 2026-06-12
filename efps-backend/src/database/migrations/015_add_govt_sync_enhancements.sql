-- 015_add_govt_sync_enhancements.sql
-- Enhanced government sync for Gujarat PDS portal data

-- Extend beneficiaries with fields from govt portal
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS card_holder_name VARCHAR(255);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS aadhaar_no VARCHAR(20);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS village VARCHAR(100);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS taluka VARCHAR(100);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS lpg_status VARCHAR(10);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS png_status VARCHAR(10);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS nfsa_category VARCHAR(50);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS govt_data_hash VARCHAR(64);
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 0;

-- Government source data (raw import from PDS portal)
CREATE TABLE IF NOT EXISTS govt_beneficiary_imports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id           UUID REFERENCES dealers(id),
  fps_id              VARCHAR(20),
  district            VARCHAR(100),
  taluka              VARCHAR(100),
  village             VARCHAR(100),
  import_batch_id     UUID NOT NULL,
  source_type         VARCHAR(50) DEFAULT 'csv',
  raw_data            JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_govt_imports_dealer ON govt_beneficiary_imports(dealer_id);
CREATE INDEX idx_govt_imports_batch ON govt_beneficiary_imports(import_batch_id);

-- Change tracking for government data
CREATE TABLE IF NOT EXISTS govt_change_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id           UUID REFERENCES dealers(id),
  beneficiary_id      UUID REFERENCES beneficiaries(id),
  ration_card_no      VARCHAR(30),
  change_type         VARCHAR(20) NOT NULL,
  field_changed       VARCHAR(100),
  old_value           TEXT,
  new_value           TEXT,
  sync_batch_id       UUID,
  applied_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_govt_changes_beneficiary ON govt_change_log(beneficiary_id);
CREATE INDEX idx_govt_changes_batch ON govt_change_log(sync_batch_id);
CREATE INDEX idx_govt_changes_created ON govt_change_log(created_at);

-- Sync scheduler config (which FPS to sync, how often)
CREATE TABLE IF NOT EXISTS sync_scheduler_config (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id           UUID REFERENCES dealers(id),
  fps_id              VARCHAR(20),
  district            VARCHAR(100),
  taluka              VARCHAR(100),
  sync_enabled        BOOLEAN DEFAULT TRUE,
  sync_interval_mins  INTEGER DEFAULT 360,
  last_sync_at        TIMESTAMPTZ,
  next_sync_at        TIMESTAMPTZ,
  sync_status         VARCHAR(20) DEFAULT 'pending',
  consecutive_failures INTEGER DEFAULT 0,
  source_url          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dealer_id)
);

CREATE INDEX idx_sync_scheduler_next ON sync_scheduler_config(next_sync_at);
CREATE INDEX idx_sync_scheduler_district ON sync_scheduler_config(district, taluka);

-- Import batches (track each import run)
CREATE TABLE IF NOT EXISTS sync_import_batches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type         VARCHAR(50) DEFAULT 'govt_api',
  status              VARCHAR(20) DEFAULT 'pending',
  total_records       INTEGER DEFAULT 0,
  new_records         INTEGER DEFAULT 0,
  updated_records     INTEGER DEFAULT 0,
  deleted_records     INTEGER DEFAULT 0,
  unchanged_records   INTEGER DEFAULT 0,
  error_count         INTEGER DEFAULT 0,
  started_at          TIMESTAMPTZ DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  metadata            JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_import_batches_status ON sync_import_batches(status);
