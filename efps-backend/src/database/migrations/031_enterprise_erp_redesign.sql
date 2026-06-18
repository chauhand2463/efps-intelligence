-- ============================================================
-- MIGRATION 031: Enterprise ERP Redesign
-- Resolves 4 core architectural conflicts:
--   1. Double Deductions — transaction_source enum
--   2. Inventory Leakage  — inventory_department on stock_ledger + items
--   3. Temporal Pricing   — transaction_line_items with snapshot prices
--   4. Ledger Mix-ups     — strict physical vs financial separation
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- CONFLICT 1: transaction_source — marks every transaction
-- with its origin so we never double-count stock deductions.
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE transaction_source AS ENUM (
    'EXCEL_SYNC',    -- imported from government portal CSV/Excel
    'MANUAL_CBDC',   -- cash-based distribution (manual sale)
    'OFFLINE'        -- POS offline / biometric device fallback
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS transaction_source transaction_source NOT NULL DEFAULT 'MANUAL_CBDC',
  ADD COLUMN IF NOT EXISTS source_file_id UUID REFERENCES sync_import_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS upstream_hash VARCHAR(64) UNIQUE,       -- govt portal transaction hash for dedup
  ADD COLUMN IF NOT EXISTS override_reason TEXT;                    -- why manual override exists

-- Index for upstream dedup lookups
CREATE INDEX IF NOT EXISTS idx_transactions_upstream_hash
  ON transactions (upstream_hash) WHERE upstream_hash IS NOT NULL;

-- ------------------------------------------------------------
-- CONFLICT 2: inventory_department — separate stock
-- pools so FPS sales never deduct MDM / ICDS inventory.
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE inventory_department AS ENUM (
    'REGULAR_FPS',   -- standard PDS stock for ration distribution
    'MDM',           -- Mid-Day Meal (school nutrition)
    'ICDS'           -- Integrated Child Development Services (anganwadi)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- items master catalog
CREATE TABLE IF NOT EXISTS items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  code            VARCHAR(50) NOT NULL,          -- e.g. 'RICE', 'WHEAT-FPS', 'MDM-DAL'
  name            VARCHAR(255) NOT NULL,
  commodity       VARCHAR(50),                    -- maps to base commodity (Rice/Wheat/…)
  department      inventory_department NOT NULL DEFAULT 'REGULAR_FPS',
  unit            VARCHAR(20) NOT NULL DEFAULT 'kg',
  category        VARCHAR(50),                    -- e.g. 'grain', 'pulse', 'fuel', 'oil'
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dealer_id, code)
);

-- stock_ledger: single source of truth for physical kg movement
-- One row per commodity * department * month
CREATE TABLE IF NOT EXISTS stock_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  commodity       VARCHAR(50) NOT NULL,
  department      inventory_department NOT NULL DEFAULT 'REGULAR_FPS',
  fiscal_month    DATE NOT NULL,                  -- first day of month
  opening_kg      NUMERIC(12,3) NOT NULL DEFAULT 0,
  inbound_kg      NUMERIC(12,3) NOT NULL DEFAULT 0,
  outbound_kg     NUMERIC(12,3) NOT NULL DEFAULT 0,
  closing_kg      NUMERIC(12,3) GENERATED ALWAYS AS (opening_kg + inbound_kg - outbound_kg) STORED,
  unit            VARCHAR(20) NOT NULL DEFAULT 'kg',
  version         INTEGER NOT NULL DEFAULT 1,     -- optimistic lock
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dealer_id, commodity, department, fiscal_month)
);

-- stock_ledger_movements: audit log for every kg that moves
CREATE TABLE IF NOT EXISTS stock_ledger_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id       UUID NOT NULL REFERENCES stock_ledger(id) ON DELETE CASCADE,
  movement_type   VARCHAR(30) NOT NULL,            -- receipt / sale / damage / adjustment / return
  quantity_kg     NUMERIC(12,3) NOT NULL,
  reference_type  VARCHAR(50),                     -- 'transaction' / 'stock_entry' / 'mdm_distribution'
  reference_id    UUID,                             -- FK to the source row
  department      inventory_department NOT NULL DEFAULT 'REGULAR_FPS',
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slm_ledger_id ON stock_ledger_movements (ledger_id);
CREATE INDEX IF NOT EXISTS idx_slm_reference ON stock_ledger_movements (reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_slm_created ON stock_ledger_movements (created_at);

-- Migrate existing inventory_movements data into stock_ledger
-- (safe to run multiple times — ON CONFLICT no-op)
INSERT INTO stock_ledger (dealer_id, commodity, department, fiscal_month, opening_kg, inbound_kg, outbound_kg)
SELECT
  im.dealer_id,
  im.commodity,
  'REGULAR_FPS',
  DATE_TRUNC('month', im.created_at)::DATE,
  0,
  CASE WHEN im.movement_type IN ('receipt', 'purchase', 'lifted') THEN im.quantity_kg ELSE 0 END,
  CASE WHEN im.movement_type IN ('sale', 'distribution', 'damage') THEN im.quantity_kg ELSE 0 END
FROM inventory_movements im
ON CONFLICT (dealer_id, commodity, department, fiscal_month) DO NOTHING;

-- Recalculate from aggregated movements to get correct totals
UPDATE stock_ledger sl
SET
  inbound_kg = COALESCE((
    SELECT SUM(im.quantity_kg)
    FROM inventory_movements im
    WHERE im.dealer_id = sl.dealer_id
      AND im.commodity = sl.commodity
      AND im.movement_type IN ('receipt', 'purchase', 'lifted')
      AND DATE_TRUNC('month', im.created_at)::DATE = sl.fiscal_month
  ), 0),
  outbound_kg = COALESCE((
    SELECT SUM(im.quantity_kg)
    FROM inventory_movements im
    WHERE im.dealer_id = sl.dealer_id
      AND im.commodity = sl.commodity
      AND im.movement_type IN ('sale', 'distribution', 'damage')
      AND DATE_TRUNC('month', im.created_at)::DATE = sl.fiscal_month
  ), 0)
WHERE sl.department = 'REGULAR_FPS';

-- ------------------------------------------------------------
-- CONFLICT 3: temporal pricing — snapshot price & commission
-- at the moment of sale for accurate historical reporting.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaction_line_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id        UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  commodity             VARCHAR(50) NOT NULL,
  quantity_kg           NUMERIC(12,3) NOT NULL,
  price_per_kg_at_sale  NUMERIC(10,2) NOT NULL,   -- frozen at transaction time
  commission_rate_at_sale NUMERIC(5,3),            -- frozen at transaction time (e.g. 0.045)
  total_amount          NUMERIC(12,2) NOT NULL,
  department            inventory_department NOT NULL DEFAULT 'REGULAR_FPS',
  remarks               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tli_transaction_id ON transaction_line_items (transaction_id);
CREATE INDEX IF NOT EXISTS idx_tli_commodity ON transaction_line_items (commodity);

-- ------------------------------------------------------------
-- CONFLICT 4: financial_ledger — tracks only Rupee value,
-- shop rent, customer credit (udhari), and settlements.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financial_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  entry_type      VARCHAR(30) NOT NULL,            -- 'sale' / 'expense' / 'income' / 'udhari_given' / 'udhari_received' / 'shop_rent' / 'commission' / 'settlement'
  reference_type  VARCHAR(50),                     -- 'transaction' / 'expense_entry' / 'income_entry' / 'commission'
  reference_id    UUID,
  amount_rs       NUMERIC(12,2) NOT NULL,
  direction       VARCHAR(10) NOT NULL,            -- 'credit' (money in) / 'debit' (money out)
  description     TEXT,
  fiscal_month    DATE NOT NULL DEFAULT DATE_TRUNC('month', NOW())::DATE,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fl_dealer_month ON financial_ledger (dealer_id, fiscal_month);
CREATE INDEX IF NOT EXISTS idx_fl_reference ON financial_ledger (reference_type, reference_id);

-- ------------------------------------------------------------
-- Stock Ledger auto-update trigger: when a transaction is
-- inserted (not via EXCEL_SYNC to avoid double-count),
-- atomically update the stock_ledger + financial_ledger.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auto_post_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Update stock_ledger (physical kg)
  INSERT INTO stock_ledger (dealer_id, commodity, department, fiscal_month, inbound_kg, outbound_kg)
  VALUES (
    NEW.dealer_id,
    NEW.commodity,
    'REGULAR_FPS',
    DATE_TRUNC('month', NEW.transaction_date)::DATE,
    0,
    NEW.quantity_kg
  )
  ON CONFLICT (dealer_id, commodity, department, fiscal_month)
  DO UPDATE SET
    outbound_kg = stock_ledger.outbound_kg + NEW.quantity_kg,
    updated_at = NOW();

  -- 2. Write stock_ledger_movements audit row
  INSERT INTO stock_ledger_movements (ledger_id, movement_type, quantity_kg, reference_type, reference_id, department, description)
  SELECT
    sl.id, 'sale', NEW.quantity_kg, 'transaction', NEW.id, 'REGULAR_FPS',
    'Auto-posted from transaction'
  FROM stock_ledger sl
  WHERE sl.dealer_id = NEW.dealer_id
    AND sl.commodity = NEW.commodity
    AND sl.department = 'REGULAR_FPS'
    AND sl.fiscal_month = DATE_TRUNC('month', NEW.transaction_date)::DATE;

  -- 3. Update financial_ledger (monetary value)
  INSERT INTO financial_ledger (dealer_id, entry_type, reference_type, reference_id, amount_rs, direction, description, fiscal_month)
  VALUES (
    NEW.dealer_id,
    'sale', 'transaction', NEW.id,
    NEW.total_amount,
    'credit',
    CONCAT('Sale: ', NEW.quantity_kg, ' kg ', NEW.commodity),
    DATE_TRUNC('month', NEW.transaction_date)::DATE
  );

  -- 4. Update stock_allocations.lifted_kg (legacy sync)
  UPDATE stock_allocations
  SET lifted_kg = lifted_kg + NEW.quantity_kg,
      updated_at = NOW()
  WHERE dealer_id = NEW.dealer_id
    AND month = NEW.month
    AND commodity = NEW.commodity;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_post_transaction ON transactions;
CREATE TRIGGER trg_auto_post_transaction
  AFTER INSERT ON transactions
  FOR EACH ROW
  WHEN (NEW.transaction_source != 'EXCEL_SYNC')
  EXECUTE FUNCTION fn_auto_post_transaction();

-- ------------------------------------------------------------
-- EXCEL_SYNC trigger: only updates stock_allocations + line
-- items — does NOT double-deduct stock_ledger.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auto_post_excel_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update stock_allocations (the government record)
  UPDATE stock_allocations
  SET lifted_kg = lifted_kg + NEW.quantity_kg,
      updated_at = NOW()
  WHERE dealer_id = NEW.dealer_id
    AND month = NEW.month
    AND commodity = NEW.commodity;

  -- Write to stock_ledger_movements with EXCEL_SYNC type
  INSERT INTO stock_ledger (dealer_id, commodity, department, fiscal_month, inbound_kg, outbound_kg)
  VALUES (
    NEW.dealer_id,
    NEW.commodity,
    'REGULAR_FPS',
    DATE_TRUNC('month', NEW.transaction_date)::DATE,
    NEW.quantity_kg,  -- excel sync = government confirmation of distribution, treated as inbound-outbound zero net
    0
  )
  ON CONFLICT (dealer_id, commodity, department, fiscal_month)
  DO UPDATE SET
    inbound_kg = stock_ledger.inbound_kg + NEW.quantity_kg,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_post_excel_sync ON transactions;
CREATE TRIGGER trg_auto_post_excel_sync
  AFTER INSERT ON transactions
  FOR EACH ROW
  WHEN (NEW.transaction_source = 'EXCEL_SYNC')
  EXECUTE FUNCTION fn_auto_post_excel_sync();

-- ------------------------------------------------------------
-- Auto-insert stock_ledger row when a stock_entry is created
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auto_post_stock_entry()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO stock_ledger (dealer_id, commodity, department, fiscal_month, inbound_kg)
  VALUES (
    NEW.dealer_id,
    NEW.commodity,
    'REGULAR_FPS',
    DATE_TRUNC('month', NEW.allocation_date)::DATE,
    NEW.received_quantity - COALESCE(NEW.damaged_quantity, 0)
  )
  ON CONFLICT (dealer_id, commodity, department, fiscal_month)
  DO UPDATE SET
    inbound_kg = stock_ledger.inbound_kg + (NEW.received_quantity - COALESCE(NEW.damaged_quantity, 0)),
    updated_at = NOW();

  INSERT INTO stock_ledger_movements (ledger_id, movement_type, quantity_kg, reference_type, reference_id, department, description)
  SELECT
    sl.id, 'receipt', (NEW.received_quantity - COALESCE(NEW.damaged_quantity, 0)),
    'stock_entry', NEW.id, 'REGULAR_FPS',
    CONCAT('Stock entry: received ', NEW.received_quantity, ' damaged ', COALESCE(NEW.damaged_quantity, 0))
  FROM stock_ledger sl
  WHERE sl.dealer_id = NEW.dealer_id
    AND sl.commodity = NEW.commodity
    AND sl.department = 'REGULAR_FPS'
    AND sl.fiscal_month = DATE_TRUNC('month', NEW.allocation_date)::DATE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_post_stock_entry ON stock_entries;
CREATE TRIGGER trg_auto_post_stock_entry
  AFTER INSERT ON stock_entries
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_post_stock_entry();

-- ------------------------------------------------------------
-- View: vw_stock_ledger_rolling — shows running balance
-- per commodity * department for the current dealer
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_stock_ledger_rolling AS
SELECT
  sl.id,
  sl.dealer_id,
  sl.commodity,
  sl.department,
  sl.fiscal_month,
  sl.opening_kg,
  sl.inbound_kg,
  sl.outbound_kg,
  sl.closing_kg,
  sl.unit,
  sl.updated_at,
  -- running twelve-month average daily offtake
  COALESCE((
    SELECT AVG(slm2.quantity_kg)
    FROM stock_ledger_movements slm2
    JOIN stock_ledger sl2 ON sl2.id = slm2.ledger_id
    WHERE sl2.dealer_id = sl.dealer_id
      AND sl2.commodity = sl.commodity
      AND sl2.department = sl.department
      AND slm2.movement_type = 'sale'
      AND slm2.created_at >= NOW() - INTERVAL '12 months'
  ), 0) AS avg_monthly_offtake
FROM stock_ledger sl;

-- ------------------------------------------------------------
-- View: vw_financial_summary — monthly P&L per dealer
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_financial_summary AS
SELECT
  dealer_id,
  fiscal_month,
  SUM(CASE WHEN direction = 'credit' THEN amount_rs ELSE 0 END) AS total_credits_rs,
  SUM(CASE WHEN direction = 'debit' THEN amount_rs ELSE 0 END) AS total_debits_rs,
  SUM(CASE WHEN direction = 'credit' THEN amount_rs ELSE -amount_rs END) AS net_balance_rs,
  COUNT(*) FILTER (WHERE entry_type = 'sale') AS sale_count,
  COUNT(*) FILTER (WHERE entry_type = 'udhari_given') AS udhari_given_count,
  COUNT(*) FILTER (WHERE entry_type = 'udhari_received') AS udhari_received_count
FROM financial_ledger
GROUP BY dealer_id, fiscal_month;

-- ------------------------------------------------------------
-- Indexes for reporting queries
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sl_dealer_fiscal ON stock_ledger (dealer_id, fiscal_month);
CREATE INDEX IF NOT EXISTS idx_fl_entry_type ON financial_ledger (entry_type);

COMMIT;
