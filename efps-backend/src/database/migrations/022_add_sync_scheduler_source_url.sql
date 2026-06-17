-- ============================================================
-- Add source_url to sync_scheduler_config for govt CSV download
-- ============================================================
ALTER TABLE sync_scheduler_config
  ADD COLUMN IF NOT EXISTS source_url TEXT;
