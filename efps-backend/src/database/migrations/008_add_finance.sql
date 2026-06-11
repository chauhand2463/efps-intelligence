-- 008_add_finance.sql
-- Component 16: Income & Expense

CREATE TABLE income_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID REFERENCES dealers(id),
  source          VARCHAR(100) NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  entry_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  description     TEXT,
  reference_type  VARCHAR(50),
  reference_id    UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_income_dealer_date ON income_entries(dealer_id, entry_date);

CREATE TABLE expense_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID REFERENCES dealers(id),
  category        VARCHAR(100) NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  entry_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  description     TEXT,
  bill_reference  VARCHAR(255),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expense_dealer_date ON expense_entries(dealer_id, entry_date);
