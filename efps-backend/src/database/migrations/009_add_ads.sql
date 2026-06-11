-- 009_add_ads.sql
-- Component 11: My Ads (Dealer Promotion Engine)

CREATE TABLE dealer_ads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID REFERENCES dealers(id),
  title           VARCHAR(255) NOT NULL,
  body            TEXT NOT NULL,
  type            VARCHAR(30) DEFAULT 'announcement',
  is_active       BOOLEAN DEFAULT TRUE,
  starts_at       TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dealer_ads_dealer ON dealer_ads(dealer_id, is_active);
