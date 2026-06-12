-- 014_add_views.sql
-- Cross-component query views for data flow

-- Component 04 → 01: Stock Report view for Dashboard
CREATE OR REPLACE VIEW vw_dealer_stock_summary AS
SELECT
  sa.dealer_id,
  sa.month,
  sa.commodity,
  sa.allocated_kg,
  sa.lifted_kg,
  (sa.allocated_kg - sa.lifted_kg) AS remaining_kg,
  CASE
    WHEN sa.allocated_kg = 0 THEN 0
    ELSE ROUND((sa.lifted_kg / sa.allocated_kg * 100)::numeric, 2)
  END AS lift_percentage,
  CASE
    WHEN (sa.allocated_kg - sa.lifted_kg) < sa.allocated_kg * 0.1 THEN 'critical'
    WHEN (sa.allocated_kg - sa.lifted_kg) < sa.allocated_kg * 0.25 THEN 'low'
    ELSE 'sufficient'
  END AS stock_status
FROM stock_allocations sa;

-- Component 07 → 09: Pending beneficiaries per month
CREATE OR REPLACE VIEW vw_pending_beneficiaries AS
SELECT
  b.dealer_id,
  b.id AS beneficiary_id,
  b.ration_card_no,
  b.head_of_family,
  b.mobile,
  b.member_count,
  b.category,
  cm.month,
  cm.commodity,
  cm.allocated_kg AS entitlement_kg
FROM beneficiaries b
CROSS JOIN LATERAL (
  SELECT DISTINCT month, commodity, allocated_kg
  FROM stock_allocations sa
  WHERE sa.dealer_id = b.dealer_id
    AND sa.month = date_trunc('month', NOW())::date
) cm
WHERE b.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.beneficiary_id = b.id
      AND t.month = cm.month
      AND t.commodity = cm.commodity
  );

-- Component 07 → 05: Commodity sales trends
CREATE OR REPLACE VIEW vw_commodity_sales_trend AS
SELECT
  dealer_id,
  commodity,
  month,
  COUNT(*) AS transaction_count,
  SUM(quantity_kg) AS total_quantity_kg,
  SUM(total_amount) AS total_amount,
  COUNT(DISTINCT beneficiary_id) AS unique_beneficiaries
FROM transactions
GROUP BY dealer_id, commodity, month
ORDER BY month DESC, commodity;

-- Component 06 → 16: Commission summary for finance
CREATE OR REPLACE VIEW vw_commission_finance_summary AS
SELECT
  c.dealer_id,
  c.month,
  c.commodity,
  c.quantity_sold_kg,
  c.commission_rate,
  c.gross_commission,
  c.tds_deducted,
  c.net_commission,
  c.status,
  COALESCE(bs.settlement_date, c.updated_at::date) AS settlement_date,
  bs.status AS settlement_status
FROM commissions c
LEFT JOIN bank_settlements bs ON bs.commission_id = c.id;

-- Component 02 → 04: Lifting to stock mapping
CREATE OR REPLACE VIEW vw_lifting_stock_mapping AS
SELECT
  lr.dealer_id,
  lr.month,
  lr.commodity,
  lr.quantity_kg AS lifted_quantity,
  lr.warehouse,
  lr.vehicle_no,
  lr.created_at AS lifting_date,
  sa.allocated_kg,
  sa.lifted_kg AS total_lifted_to_date,
  (sa.allocated_kg - sa.lifted_kg) AS remaining_kg
FROM lifting_records lr
LEFT JOIN stock_allocations sa
  ON sa.dealer_id = lr.dealer_id
  AND sa.month = lr.month
  AND sa.commodity = lr.commodity;

-- Component 10 → All: Gov sync status overview
CREATE OR REPLACE VIEW vw_sync_status AS
SELECT
  sync_type,
  direction,
  status,
  COUNT(*) AS total_runs,
  MAX(created_at) AS last_run,
  SUM(entity_count) AS total_entities,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_runs
FROM sync_logs
GROUP BY sync_type, direction, status;

-- Component 15: Social audit findings aggregated
CREATE OR REPLACE VIEW vw_audit_findings_summary AS
SELECT
  dealer_id,
  finding_type,
  severity,
  COUNT(*) AS total_findings,
  COUNT(*) FILTER (WHERE status = 'open') AS open_findings,
  COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_findings,
  MAX(created_at) AS latest_finding
FROM audit_findings
GROUP BY dealer_id, finding_type, severity;

-- Component 03: Monthly report aggregator
CREATE OR REPLACE VIEW vw_monthly_report AS
SELECT
  t.dealer_id,
  t.month,
  t.commodity,
  COUNT(DISTINCT t.beneficiary_id) AS beneficiaries_served,
  COUNT(*) AS total_transactions,
  SUM(t.quantity_kg) AS total_distributed_kg,
  SUM(t.total_amount) AS total_revenue,
  sa.allocated_kg,
  (sa.allocated_kg - SUM(t.quantity_kg)) AS undistributed_kg,
  COALESCE(c.net_commission, 0) AS net_commission,
  COALESCE(c.gross_commission, 0) AS gross_commission,
  COALESCE(c.tds_deducted, 0) AS tds_deducted
FROM transactions t
LEFT JOIN stock_allocations sa
  ON sa.dealer_id = t.dealer_id AND sa.month = t.month AND sa.commodity = t.commodity
LEFT JOIN commissions c
  ON c.dealer_id = t.dealer_id AND c.month = t.month AND c.commodity = t.commodity
GROUP BY t.dealer_id, t.month, t.commodity, sa.allocated_kg, c.net_commission, c.gross_commission, c.tds_deducted;

-- Component 17: Gujarat directory by district/category
CREATE OR REPLACE VIEW vw_directory_stats AS
SELECT
  district,
  category,
  COUNT(*) AS total_entries,
  COUNT(*) FILTER (WHERE is_active = TRUE) AS active_entries
FROM gujarat_directory
GROUP BY district, category
ORDER BY district, category;
