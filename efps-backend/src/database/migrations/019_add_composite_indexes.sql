-- 019_add_composite_indexes.sql
-- Add composite indexes on (dealer_id, month, commodity) for common query patterns

-- stock_allocations: replace (dealer_id, month) with (dealer_id, month, commodity)
DROP INDEX IF EXISTS idx_stock_dealer_month;
CREATE INDEX idx_stock_dealer_month_commodity ON stock_allocations(dealer_id, month, commodity);

-- transactions: add covering index for (dealer_id, month, commodity) queries
CREATE INDEX idx_transactions_dealer_month_commodity ON transactions(dealer_id, month, commodity);

-- commissions: drop redundant index; UNIQUE(dealer_id, month, commodity) already covers it
DROP INDEX IF EXISTS idx_commissions_dealer_month;
