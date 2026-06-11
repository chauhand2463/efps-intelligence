-- 010_add_mdm.sql
-- Component 12: MDM & ICDS (School Nutrition Reporting)

CREATE TABLE schools (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name     VARCHAR(255) NOT NULL,
  school_code     VARCHAR(50) UNIQUE NOT NULL,
  district        VARCHAR(100),
  taluka          VARCHAR(100),
  village         VARCHAR(100),
  school_type     VARCHAR(50),
  beneficiary_count INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mdm_distributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID REFERENCES dealers(id),
  school_id       UUID REFERENCES schools(id),
  distribution_date DATE NOT NULL,
  commodity       VARCHAR(50) NOT NULL,
  quantity_kg     NUMERIC(10,3) NOT NULL,
  beneficiary_count INTEGER NOT NULL,
  meal_type       VARCHAR(30) DEFAULT 'lunch',
  remarks         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mdm_dealer_date ON mdm_distributions(dealer_id, distribution_date);
CREATE INDEX idx_mdm_school ON mdm_distributions(school_id);
