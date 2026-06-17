-- ============================================================
-- TDS rates table (per-commodity, time-variant)
-- Replaces hardcoded 10% in commission.service.ts and
-- domain-events.queue.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS tds_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity       VARCHAR(50) NOT NULL,
  tds_percent     NUMERIC(5,2) NOT NULL,
  effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tds_rates_commodity
  ON tds_rates(commodity, effective_from DESC);

-- Default TDS rate (matches historic 10% behaviour)
INSERT INTO tds_rates (commodity, tds_percent, effective_from)
VALUES
  ('Rice', 10.00, '2024-01-01'),
  ('Wheat', 10.00, '2024-01-01'),
  ('Sugar', 10.00, '2024-01-01'),
  ('Kerosene', 10.00, '2024-01-01'),
  ('Oil', 10.00, '2024-01-01'),
  ('Pulses', 10.00, '2024-01-01')
ON CONFLICT DO NOTHING;
