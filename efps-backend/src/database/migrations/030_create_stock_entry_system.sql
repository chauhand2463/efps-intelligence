CREATE TABLE IF NOT EXISTS stock_entries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id            UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  commodity            VARCHAR(50) NOT NULL,
  allocation_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  government_quantity  NUMERIC(10,3) NOT NULL DEFAULT 0,
  received_quantity    NUMERIC(10,3) NOT NULL DEFAULT 0,
  damaged_quantity     NUMERIC(10,3) NOT NULL DEFAULT 0,
  available_quantity   NUMERIC(10,3) GENERATED ALWAYS AS (received_quantity - damaged_quantity) STORED,
  short_quantity       NUMERIC(10,3) GENERATED ALWAYS AS (government_quantity - received_quantity) STORED,
  remarks              TEXT,
  created_by           UUID REFERENCES dealers(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dealer_id, commodity, allocation_date)
);

CREATE TABLE IF NOT EXISTS allocations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id            UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  beneficiary_id       UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  commodity            VARCHAR(50) NOT NULL,
  allocated_quantity   NUMERIC(10,3) NOT NULL DEFAULT 0,
  lifted_quantity      NUMERIC(10,3) NOT NULL DEFAULT 0,
  remaining_quantity   NUMERIC(10,3) GENERATED ALWAYS AS (allocated_quantity - lifted_quantity) STORED,
  allocation_month     DATE NOT NULL,
  allocation_year      INTEGER NOT NULL,
  status               VARCHAR(20) DEFAULT 'pending',
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dealer_id, beneficiary_id, commodity, allocation_month)
);

CREATE INDEX IF NOT EXISTS idx_stock_entries_dealer_date ON stock_entries(dealer_id, allocation_date);
CREATE INDEX IF NOT EXISTS idx_stock_entries_commodity ON stock_entries(commodity);
CREATE INDEX IF NOT EXISTS idx_allocations_dealer_month ON allocations(dealer_id, allocation_month);
CREATE INDEX IF NOT EXISTS idx_allocations_beneficiary ON allocations(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_allocations_status ON allocations(status);
