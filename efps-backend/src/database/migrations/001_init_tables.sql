-- 001_init_tables.sql
-- Core tables for eFPS Intelligence

-- Dealers (FPS Shop Owners)
CREATE TABLE dealers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fps_id        VARCHAR(20) UNIQUE NOT NULL,
  area_id       VARCHAR(20),
  full_name     VARCHAR(255) NOT NULL,
  mobile        VARCHAR(15) UNIQUE NOT NULL,
  address       TEXT,
  district      VARCHAR(100),
  taluka        VARCHAR(100),
  village       VARCHAR(100),
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) DEFAULT 'dealer',
  is_active     BOOLEAN DEFAULT TRUE,
  is_verified   BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dealers_fps_id ON dealers(fps_id);
CREATE INDEX idx_dealers_mobile ON dealers(mobile);
CREATE INDEX idx_dealers_district ON dealers(district);

-- Beneficiaries (Ration Card Holders)
CREATE TABLE beneficiaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID REFERENCES dealers(id),
  ration_card_no  VARCHAR(30) UNIQUE NOT NULL,
  head_of_family  VARCHAR(255) NOT NULL,
  mobile          VARCHAR(15),
  member_count    SMALLINT DEFAULT 1,
  category        VARCHAR(20),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_beneficiaries_dealer_id ON beneficiaries(dealer_id);
CREATE INDEX idx_beneficiaries_ration_card ON beneficiaries(ration_card_no);
CREATE INDEX idx_beneficiaries_fts ON beneficiaries USING GIN(to_tsvector('simple', head_of_family));

-- Stock Allocations
CREATE TABLE stock_allocations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id     UUID REFERENCES dealers(id),
  month         DATE NOT NULL,
  commodity     VARCHAR(50) NOT NULL,
  allocated_kg  NUMERIC(10,3) NOT NULL,
  lifted_kg     NUMERIC(10,3) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dealer_id, month, commodity)
);

CREATE INDEX idx_stock_dealer_month ON stock_allocations(dealer_id, month);

-- Transactions (Ration Distribution)
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID REFERENCES dealers(id),
  beneficiary_id  UUID REFERENCES beneficiaries(id),
  transaction_date DATE NOT NULL,
  month           DATE NOT NULL,
  commodity       VARCHAR(50) NOT NULL,
  quantity_kg     NUMERIC(8,3) NOT NULL,
  price_per_kg    NUMERIC(6,2),
  total_amount    NUMERIC(10,2),
  mode            VARCHAR(20) DEFAULT 'pos',
  biometric_auth  BOOLEAN DEFAULT FALSE,
  remarks         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_dealer_date ON transactions(dealer_id, transaction_date);
CREATE INDEX idx_transactions_beneficiary ON transactions(beneficiary_id);
CREATE INDEX idx_transactions_month ON transactions(month);
