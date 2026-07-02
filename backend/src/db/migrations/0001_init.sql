CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE organization_member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE job_status AS ENUM ('queued', 'scheduled', 'claimed', 'running', 'completed', 'failed', 'dead_letter');
CREATE TYPE execution_status AS ENUM ('running', 'succeeded', 'failed');
CREATE TYPE worker_status AS ENUM ('idle', 'busy', 'dead');
CREATE TYPE retry_strategy AS ENUM ('fixed', 'linear', 'exponential');
CREATE TYPE job_type AS ENUM ('immediate', 'delayed', 'scheduled', 'recurring', 'batch');
CREATE TYPE log_level AS ENUM ('debug', 'info', 'warning', 'error');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organization_members (
    user_id UUID NOT NULL,
    org_id UUID NOT NULL,
    role organization_member_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, org_id),
    CONSTRAINT fk_organization_members_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_organization_members_org
        FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_projects_org
        FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT uq_projects_org_name UNIQUE (org_id, name)
);

CREATE TABLE retry_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy retry_strategy NOT NULL,
    base_delay_ms INTEGER NOT NULL CHECK (base_delay_ms >= 0),
    max_delay_ms INTEGER NOT NULL CHECK (max_delay_ms >= 0),
    max_attempts INTEGER NOT NULL CHECK (max_attempts >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_retry_policies_delay CHECK (base_delay_ms <= max_delay_ms)
);

CREATE TABLE queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    priority INTEGER NOT NULL DEFAULT 100 CHECK (priority >= 0),
    max_concurrency INTEGER NOT NULL DEFAULT 1 CHECK (max_concurrency >= 1),
    retry_policy_id UUID,
    is_paused BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_queues_project
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_queues_retry_policy
        FOREIGN KEY (retry_policy_id) REFERENCES retry_policies(id) ON DELETE SET NULL,
    CONSTRAINT uq_queues_project_name UNIQUE (project_id, name)
);

CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostname VARCHAR(255) NOT NULL,
    status worker_status NOT NULL DEFAULT 'idle',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID NOT NULL,
    worker_id UUID,
    type job_type NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status job_status NOT NULL DEFAULT 'queued',
    priority INTEGER NOT NULL DEFAULT 100 CHECK (priority >= 0),
    run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 1 CHECK (max_attempts >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_jobs_queue
        FOREIGN KEY (queue_id) REFERENCES queues(id) ON DELETE CASCADE,
    CONSTRAINT fk_jobs_worker
        FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE SET NULL,
    CONSTRAINT chk_jobs_attempts_lte_max_attempts CHECK (attempts <= max_attempts)
);

CREATE TABLE job_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    worker_id UUID,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status execution_status NOT NULL,
    error_message TEXT,
    duration_ms BIGINT,
    CONSTRAINT fk_job_executions_job
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_job_executions_worker
        FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE SET NULL,
    CONSTRAINT chk_finished_at_logic CHECK (
        (status = 'running' AND finished_at IS NULL) OR
        (status IN ('succeeded', 'failed') AND finished_at IS NOT NULL)
    )
);

CREATE TABLE scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID NOT NULL,
    cron_expression VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    next_run_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_scheduled_jobs_queue
        FOREIGN KEY (queue_id) REFERENCES queues(id) ON DELETE CASCADE
);

CREATE TABLE worker_heartbeats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active_job_count INTEGER NOT NULL DEFAULT 0 CHECK (active_job_count >= 0),
    CONSTRAINT fk_worker_heartbeats_worker
        FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE TABLE job_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    execution_id UUID,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level log_level NOT NULL,
    message TEXT NOT NULL,
    CONSTRAINT fk_job_logs_job
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_job_logs_execution
        FOREIGN KEY (execution_id) REFERENCES job_executions(id) ON DELETE SET NULL
);

CREATE TABLE dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_job_id UUID NOT NULL,
    queue_id UUID NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    failure_reason TEXT NOT NULL,
    moved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_dead_letter_queue_job
        FOREIGN KEY (original_job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_dead_letter_queue_queue
        FOREIGN KEY (queue_id) REFERENCES queues(id) ON DELETE CASCADE
);

CREATE INDEX idx_jobs_queue_status_run_at ON jobs(queue_id, status, run_at);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_worker_heartbeats_worker_timestamp ON worker_heartbeats(worker_id, timestamp);
CREATE INDEX idx_job_executions_job_id ON job_executions(job_id);
CREATE INDEX idx_scheduled_jobs_next_run_at_active ON scheduled_jobs(next_run_at) WHERE is_active = true;
CREATE INDEX idx_jobs_priority_run_at ON jobs(priority, run_at);
CREATE INDEX idx_job_logs_job_timestamp ON job_logs(job_id, timestamp);
CREATE INDEX idx_job_executions_status ON job_executions(status);
