-- 029_add_sync_columns.sql
-- Add all columns referenced by internal-sync.service.ts that don't yet exist
-- Columns already added by 026: source_synced_at, sync_job_id, version (on all 4 tables)
-- Columns already added by 015: address, district, taluka, card_holder_name, etc. (beneficiaries only)

-- ========== BENEFICIARIES ==========
ALTER TABLE beneficiaries
  ADD COLUMN IF NOT EXISTS external_id      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS beneficiary_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS father_name      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mobile_no        VARCHAR(15),
  ADD COLUMN IF NOT EXISTS date_of_issue    DATE,
  ADD COLUMN IF NOT EXISTS ration_type      VARCHAR(50),
  ADD COLUMN IF NOT EXISTS status           VARCHAR(20) NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_beneficiaries_external_id ON beneficiaries(external_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_status ON beneficiaries(status);

-- ========== TRANSACTIONS ==========
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS transaction_hash   VARCHAR(64),
  ADD COLUMN IF NOT EXISTS ration_card_no     VARCHAR(30),
  ADD COLUMN IF NOT EXISTS beneficiary_name   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS allocated_quantity NUMERIC(10,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifted_quantity    NUMERIC(10,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid        NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transaction_id     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS shop_no            VARCHAR(50),
  ADD COLUMN IF NOT EXISTS year               VARCHAR(10),
  ADD COLUMN IF NOT EXISTS status             VARCHAR(20) NOT NULL DEFAULT 'completed';

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(dealer_id, transaction_hash);

-- ========== STOCK ALLOCATIONS ==========
ALTER TABLE stock_allocations
  ADD COLUMN IF NOT EXISTS allocated_quantity NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS lifted_quantity    NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS year               VARCHAR(10),
  ADD COLUMN IF NOT EXISTS month_year         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS unit               VARCHAR(20) NOT NULL DEFAULT 'Kg',
  ADD COLUMN IF NOT EXISTS status             VARCHAR(20) NOT NULL DEFAULT 'pending';

-- Sync existing allocated_kg/lifted_kg into new columns
UPDATE stock_allocations SET allocated_quantity = allocated_kg WHERE allocated_quantity IS NULL;
UPDATE stock_allocations SET lifted_quantity = lifted_kg WHERE lifted_quantity IS NULL;

ALTER TABLE stock_allocations ALTER COLUMN allocated_quantity SET NOT NULL;
ALTER TABLE stock_allocations ALTER COLUMN lifted_quantity SET NOT NULL;

-- ========== LIFTING RECORDS ==========
ALTER TABLE lifting_records
  ADD COLUMN IF NOT EXISTS allocated_quantity NUMERIC(10,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifted_quantity    NUMERIC(10,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS year               VARCHAR(10) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS unit               VARCHAR(20) NOT NULL DEFAULT 'Kg',
  ADD COLUMN IF NOT EXISTS status             VARCHAR(20) NOT NULL DEFAULT 'pending';

-- Add UNIQUE for ON CONFLICT (dealer_id, month, commodity, year)
ALTER TABLE lifting_records DROP CONSTRAINT IF EXISTS idx_lifting_unique;
ALTER TABLE lifting_records ADD CONSTRAINT idx_lifting_unique UNIQUE (dealer_id, month, commodity, year);
