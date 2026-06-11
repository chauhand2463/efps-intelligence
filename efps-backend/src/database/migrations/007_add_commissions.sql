-- 007_add_commissions.sql
-- Components 06 & 14: Commission Calculator + Bank Commission

CREATE TABLE commission_rates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity     VARCHAR(50) NOT NULL,
  rate_per_kg   NUMERIC(8,2) NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to  DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_commission_rates_commodity ON commission_rates(commodity, effective_from);

CREATE TABLE commissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID REFERENCES dealers(id),
  month           DATE NOT NULL,
  commodity       VARCHAR(50) NOT NULL,
  quantity_sold_kg NUMERIC(10,3) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(8,2) NOT NULL DEFAULT 0,
  gross_commission NUMERIC(12,2) NOT NULL DEFAULT 0,
  tds_percent     NUMERIC(5,2) DEFAULT 10.00,
  tds_deducted    NUMERIC(10,2) DEFAULT 0,
  net_commission  NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dealer_id, month, commodity)
);

CREATE INDEX idx_commissions_dealer_month ON commissions(dealer_id, month);

CREATE TABLE bank_settlements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID REFERENCES dealers(id),
  commission_id   UUID REFERENCES commissions(id),
  settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  gross_amount    NUMERIC(12,2) NOT NULL,
  tds_amount      NUMERIC(10,2) DEFAULT 0,
  net_amount      NUMERIC(12,2) NOT NULL,
  bank_account_no VARCHAR(50),
  ifsc_code       VARCHAR(20),
  status          VARCHAR(20) DEFAULT 'pending',
  transaction_ref VARCHAR(100),
  settled_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_settlements_dealer ON bank_settlements(dealer_id);
