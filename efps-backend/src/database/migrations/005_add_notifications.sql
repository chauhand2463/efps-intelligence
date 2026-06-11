-- 005_add_notifications.sql

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id   UUID REFERENCES dealers(id),
  title       VARCHAR(255) NOT NULL,
  body        TEXT NOT NULL,
  type        VARCHAR(30) DEFAULT 'info',
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_dealer ON notifications(dealer_id, is_read);
