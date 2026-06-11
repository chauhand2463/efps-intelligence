-- 012_add_social_audit.sql
-- Component 15: Social Audit (Compliance & Fraud Detection)

CREATE TABLE audit_findings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID REFERENCES dealers(id),
  finding_type    VARCHAR(50) NOT NULL,
  severity        VARCHAR(20) DEFAULT 'medium',
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  entity          VARCHAR(50),
  entity_id       UUID,
  evidence        JSONB,
  status          VARCHAR(20) DEFAULT 'open',
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_findings_dealer ON audit_findings(dealer_id, status);
CREATE INDEX idx_audit_findings_type ON audit_findings(finding_type);
