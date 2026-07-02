ALTER TABLE jobs ADD COLUMN IF NOT EXISTS batch_id UUID;
CREATE INDEX IF NOT EXISTS idx_jobs_batch_id ON jobs(batch_id);
