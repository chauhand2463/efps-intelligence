-- 006_inventory_movements.sql

CREATE TABLE inventory_movements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id     UUID REFERENCES dealers(id),
  commodity     VARCHAR(50) NOT NULL,
  movement_type VARCHAR(30) NOT NULL,
  quantity_kg   NUMERIC(10,3) NOT NULL,
  reference_id  UUID,
  reference_type VARCHAR(50),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_dealer ON inventory_movements(dealer_id, commodity);
CREATE INDEX idx_inventory_created ON inventory_movements(created_at);
