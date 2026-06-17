-- 028_add_commission_payments.sql
-- Allow dealers to record actual bank payment amounts and dates per commission

ALTER TABLE commissions
  ADD COLUMN IF NOT EXISTS amount_paid   NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS deposit_date  DATE;
