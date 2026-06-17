ALTER TABLE beneficiaries
  DROP CONSTRAINT IF EXISTS beneficiaries_dealer_id_fkey,
  ADD CONSTRAINT beneficiaries_dealer_id_fkey
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE;

ALTER TABLE stock_allocations
  DROP CONSTRAINT IF EXISTS stock_allocations_dealer_id_fkey,
  ADD CONSTRAINT stock_allocations_dealer_id_fkey
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE;

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_dealer_id_fkey,
  ADD CONSTRAINT transactions_dealer_id_fkey
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE;

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_beneficiary_id_fkey,
  ADD CONSTRAINT transactions_beneficiary_id_fkey
    FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id) ON DELETE SET NULL;

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_dealer_id_fkey,
  ADD CONSTRAINT notifications_dealer_id_fkey
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE;

ALTER TABLE inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_dealer_id_fkey,
  ADD CONSTRAINT inventory_movements_dealer_id_fkey
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE;

ALTER TABLE commissions
  DROP CONSTRAINT IF EXISTS commissions_dealer_id_fkey,
  ADD CONSTRAINT commissions_dealer_id_fkey
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE;

ALTER TABLE bank_settlements
  DROP CONSTRAINT IF EXISTS bank_settlements_dealer_id_fkey,
  ADD CONSTRAINT bank_settlements_dealer_id_fkey
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE;

ALTER TABLE bank_settlements
  DROP CONSTRAINT IF EXISTS bank_settlements_commission_id_fkey,
  ADD CONSTRAINT bank_settlements_commission_id_fkey
    FOREIGN KEY (commission_id) REFERENCES commissions(id) ON DELETE CASCADE;

ALTER TABLE income_entries
  DROP CONSTRAINT IF EXISTS income_entries_dealer_id_fkey,
  ADD CONSTRAINT income_entries_dealer_id_fkey
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE;

ALTER TABLE expense_entries
  DROP CONSTRAINT IF EXISTS expense_entries_dealer_id_fkey,
  ADD CONSTRAINT expense_entries_dealer_id_fkey
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE;

ALTER TABLE dealer_ads
  DROP CONSTRAINT IF EXISTS dealer_ads_dealer_id_fkey,
  ADD CONSTRAINT dealer_ads_dealer_id_fkey
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE;

ALTER TABLE lifting_records
  DROP CONSTRAINT IF EXISTS lifting_records_dealer_id_fkey,
  ADD CONSTRAINT lifting_records_dealer_id_fkey
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE;

ALTER TABLE mdm_distributions
  DROP CONSTRAINT IF EXISTS mdm_distributions_dealer_id_fkey,
  ADD CONSTRAINT mdm_distributions_dealer_id_fkey
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE;

ALTER TABLE mdm_monthly_records
  DROP CONSTRAINT IF EXISTS mdm_monthly_records_dealer_id_fkey,
  ADD CONSTRAINT mdm_monthly_records_dealer_id_fkey
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE;

ALTER TABLE social_audit_meetings
  DROP CONSTRAINT IF EXISTS social_audit_meetings_dealer_id_fkey,
  ADD CONSTRAINT social_audit_meetings_dealer_id_fkey
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE;

ALTER TABLE audit_findings
  DROP CONSTRAINT IF EXISTS audit_findings_dealer_id_fkey,
  ADD CONSTRAINT audit_findings_dealer_id_fkey
    FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE;
