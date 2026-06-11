-- 013_add_missing_tables.sql
-- Tables for: Lifting Records, Policy Schemes, ICDS Codes, Social Audit Meetings, Gujarat Directory

CREATE TABLE lifting_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID REFERENCES dealers(id),
  month           DATE NOT NULL,
  commodity       VARCHAR(50) NOT NULL,
  quantity_kg     NUMERIC(10,3) NOT NULL,
  vehicle_no      VARCHAR(50),
  warehouse       VARCHAR(255),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lifting_dealer_month ON lifting_records(dealer_id, month);

CREATE TABLE policy_schemes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  department          VARCHAR(255),
  description         TEXT,
  eligibility_criteria TEXT,
  benefits            TEXT,
  effective_from      DATE,
  effective_to        DATE,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE icds_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(20) UNIQUE NOT NULL,
  description     TEXT NOT NULL,
  category        VARCHAR(100),
  department      VARCHAR(255),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE social_audit_meetings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID REFERENCES dealers(id),
  title           VARCHAR(255) NOT NULL,
  meeting_date    DATE NOT NULL,
  venue           VARCHAR(255),
  total_beneficiaries_verified INTEGER DEFAULT 0,
  issues_identified TEXT,
  resolutions     TEXT,
  status          VARCHAR(20) DEFAULT 'completed',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_social_audit_dealer ON social_audit_meetings(dealer_id, meeting_date);

CREATE TABLE gujarat_directory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  category        VARCHAR(50) NOT NULL,
  district        VARCHAR(100),
  department      VARCHAR(255),
  address         TEXT,
  phone           VARCHAR(20),
  email           VARCHAR(255),
  website         VARCHAR(255),
  description     TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_directory_district ON gujarat_directory(district);
CREATE INDEX idx_directory_category ON gujarat_directory(category);
