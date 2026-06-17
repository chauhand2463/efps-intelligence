CREATE TABLE mdm_monthly_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID REFERENCES dealers(id) NOT NULL,
  month           VARCHAR(20) NOT NULL,
  year            INTEGER NOT NULL,
  records         JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dealer_id, month, year)
);

CREATE INDEX idx_mdm_monthly_dealer ON mdm_monthly_records(dealer_id);
