-- Rollback is not supported for this migration because it would require destructive changes.
-- The schema created in 0001_init.sql is already production-oriented and reversible only via a full schema drop.

ALTER TABLE jobs
    ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_jobs_worker_id ON jobs(worker_id);
CREATE INDEX IF NOT EXISTS idx_queues_retry_policy_id ON queues(retry_policy_id);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(org_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_queue_id ON scheduled_jobs(queue_id);
