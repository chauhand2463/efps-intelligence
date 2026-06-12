-- 016_add_gujarat_hierarchy.sql
-- Complete Gujarat PDS region hierarchy for drill-down: State → District → Taluka → Ward → FPS

CREATE EXTENSION IF NOT EXISTS ltree;

-- Hierarchical region master (self-referencing tree)
CREATE TABLE IF NOT EXISTS gujarat_region_hierarchy (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       UUID REFERENCES gujarat_region_hierarchy(id),
  level           VARCHAR(20) NOT NULL CHECK (level IN ('state', 'district', 'taluka', 'ward', 'fps_area')),
  code            VARCHAR(50),
  name            VARCHAR(255) NOT NULL,
  name_gujarati   VARCHAR(255),
  path            LTREE,
  is_active       BOOLEAN DEFAULT TRUE,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_region_parent ON gujarat_region_hierarchy(parent_id);
CREATE INDEX idx_region_level ON gujarat_region_hierarchy(level);
CREATE INDEX idx_region_path ON gujarat_region_hierarchy USING GIST(path);
CREATE INDEX idx_region_name ON gujarat_region_hierarchy USING GIN(to_tsvector('simple', name));
CREATE UNIQUE INDEX idx_region_code ON gujarat_region_hierarchy(level, code) WHERE code IS NOT NULL;

-- Monthly aggregate snapshot per region (from PDS portal CSV)
CREATE TABLE IF NOT EXISTS gujarat_aggregate_stats (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id         UUID NOT NULL REFERENCES gujarat_region_hierarchy(id),
  month             VARCHAR(7) NOT NULL,
  source            VARCHAR(50) DEFAULT 'govt_csv',

  -- NFSA
  nfsa_aay_rc       INTEGER DEFAULT 0,
  nfsa_aay_ben      INTEGER DEFAULT 0,
  nfsa_phh_rc       INTEGER DEFAULT 0,
  nfsa_phh_ben      INTEGER DEFAULT 0,
  nfsa_apl1_rc      INTEGER DEFAULT 0,
  nfsa_apl1_ben     INTEGER DEFAULT 0,
  nfsa_apl2_rc      INTEGER DEFAULT 0,
  nfsa_apl2_ben     INTEGER DEFAULT 0,
  nfsa_bpl_rc       INTEGER DEFAULT 0,
  nfsa_bpl_ben      INTEGER DEFAULT 0,
  total_phh_rc      INTEGER DEFAULT 0,
  total_phh_ben     INTEGER DEFAULT 0,
  nfsa_total_rc     INTEGER DEFAULT 0,
  nfsa_total_ben    INTEGER DEFAULT 0,

  -- Non-NFSA
  non_nfsa_apl1_rc  INTEGER DEFAULT 0,
  non_nfsa_apl1_ben INTEGER DEFAULT 0,
  non_nfsa_apl2_rc  INTEGER DEFAULT 0,
  non_nfsa_apl2_ben INTEGER DEFAULT 0,
  non_nfsa_bpl_rc   INTEGER DEFAULT 0,
  non_nfsa_bpl_ben  INTEGER DEFAULT 0,
  non_nfsa_total_rc INTEGER DEFAULT 0,
  non_nfsa_total_ben INTEGER DEFAULT 0,

  -- Grand totals
  total_cards       INTEGER DEFAULT 0,
  total_beneficiaries INTEGER DEFAULT 0,

  -- Audit
  import_batch_id   UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(region_id, month)
);

CREATE INDEX idx_stats_region_month ON gujarat_aggregate_stats(region_id, month);
CREATE INDEX idx_stats_month ON gujarat_aggregate_stats(month);

-- Link dealers (FPS) to ward-level region
ALTER TABLE dealers ADD COLUMN IF NOT EXISTS gujarat_region_id UUID REFERENCES gujarat_region_hierarchy(id);
CREATE INDEX IF NOT EXISTS idx_dealers_region ON dealers(gujarat_region_id);

-- Link beneficiaries to ward-level region
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS gujarat_region_id UUID REFERENCES gujarat_region_hierarchy(id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_region ON beneficiaries(gujarat_region_id);

-- CSV import tracking for hierarchy
CREATE TABLE IF NOT EXISTS gujarat_csv_imports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level             VARCHAR(20) NOT NULL,
  file_name         TEXT,
  month             VARCHAR(7) NOT NULL,
  total_rows        INTEGER DEFAULT 0,
  inserted_rows     INTEGER DEFAULT 0,
  updated_rows      INTEGER DEFAULT 0,
  unchanged_rows    INTEGER DEFAULT 0,
  region_ids        UUID[],
  status            VARCHAR(20) DEFAULT 'completed',
  raw_sample        JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- View: rollup stats from hierarchy up
CREATE OR REPLACE VIEW vw_gujarat_hierarchy_rollup AS
WITH RECURSIVE region_tree AS (
  SELECT id, parent_id, level, name, code, 0 AS depth
  FROM gujarat_region_hierarchy
  WHERE parent_id IS NULL
  UNION ALL
  SELECT r.id, r.parent_id, r.level, r.name, r.code, t.depth + 1
  FROM gujarat_region_hierarchy r
  INNER JOIN region_tree t ON r.parent_id = t.id
)
SELECT * FROM region_tree;

-- Trigger: cascade total_cards/total_beneficiaries from computed columns if not explicitly provided
CREATE OR REPLACE FUNCTION update_grand_totals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.nfsa_total_rc := NEW.nfsa_aay_rc + NEW.nfsa_phh_rc;
  NEW.nfsa_total_ben := NEW.nfsa_aay_ben + NEW.nfsa_phh_ben;
  NEW.total_phh_rc := NEW.nfsa_aay_rc + NEW.nfsa_phh_rc + NEW.nfsa_apl1_rc + NEW.nfsa_apl2_rc + NEW.nfsa_bpl_rc;
  NEW.total_phh_ben := NEW.nfsa_aay_ben + NEW.nfsa_phh_ben + NEW.nfsa_apl1_ben + NEW.nfsa_apl2_ben + NEW.nfsa_bpl_ben;
  NEW.non_nfsa_total_rc := NEW.non_nfsa_apl1_rc + NEW.non_nfsa_apl2_rc + NEW.non_nfsa_bpl_rc;
  NEW.non_nfsa_total_ben := NEW.non_nfsa_apl1_ben + NEW.non_nfsa_apl2_ben + NEW.non_nfsa_bpl_ben;
  IF NEW.total_cards = 0 THEN
    NEW.total_cards := NEW.nfsa_aay_rc + NEW.nfsa_phh_rc + NEW.nfsa_apl1_rc + NEW.nfsa_apl2_rc + NEW.nfsa_bpl_rc
                    + NEW.non_nfsa_apl1_rc + NEW.non_nfsa_apl2_rc + NEW.non_nfsa_bpl_rc;
  END IF;
  IF NEW.total_beneficiaries = 0 THEN
    NEW.total_beneficiaries := NEW.nfsa_aay_ben + NEW.nfsa_phh_ben + NEW.nfsa_apl1_ben + NEW.nfsa_apl2_ben + NEW.nfsa_bpl_ben
                            + NEW.non_nfsa_apl1_ben + NEW.non_nfsa_apl2_ben + NEW.non_nfsa_bpl_ben;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_grand_totals ON gujarat_aggregate_stats;
CREATE TRIGGER trg_update_grand_totals
  BEFORE INSERT OR UPDATE ON gujarat_aggregate_stats
  FOR EACH ROW EXECUTE FUNCTION update_grand_totals();
