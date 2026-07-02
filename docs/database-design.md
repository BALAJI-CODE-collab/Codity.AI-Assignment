# Database Design

## Overview

The database uses PostgreSQL and a relational schema to model organizations, users, projects, queues, retry policies, jobs, workers, and observability data for a distributed job scheduler.

## Normalization

The design follows third normal form (3NF) by storing each fact in one place and avoiding transitive dependencies. For example:

- user profile data lives in the users table.
- membership relationships are represented in organization_members rather than duplicated across users and organizations.
- queue and project data are separated so a queue belongs to exactly one project and a project belongs to exactly one organization.
- job execution history is stored separately from the current job state to preserve auditability.

## Why UUIDs were chosen

UUIDs are used for primary keys to support distributed and multi-worker systems where records may be created independently across nodes or services. They avoid coordination around sequence generators and reduce the risk of key collisions in sharded or federated deployments.

## Key relationships

- users to organizations: many-to-many through organization_members.
- organizations to projects: one-to-many.
- projects to queues: one-to-many.
- queues to retry_policies: many-to-one, nullable because a queue may not use a custom policy.
- queues to jobs: one-to-many.
- workers to jobs: one-to-many with a nullable worker assignment for job claiming.
- jobs to job_executions: one-to-many.
- jobs to job_logs: one-to-many.
- jobs to dead_letter_queue: one-to-one-ish in practice, with a record inserted when a job is moved to the dead-letter queue.

## Cascade behavior

- Deleting an organization cascades to related projects and memberships.
- Deleting a project cascades to its queues and related jobs.
- Deleting a queue cascades to jobs, scheduled jobs, and dead-letter entries.
- Deleting a job cascades to executions, logs, and dead-letter records.
- Deleting a worker sets worker_id to NULL on jobs and executions, but cascades heartbeats and other worker-owned records.
- Deleting a retry policy sets queue.retry_policy_id to NULL.

## Indexes

The schema creates indexes for the main access patterns:

- jobs(queue_id, status, run_at) for queue-based scheduling and retrieval.
- jobs(status) for status-based monitoring.
- worker_heartbeats(worker_id, timestamp) for worker health analysis.
- job_executions(job_id) for execution history lookup.
- scheduled_jobs(next_run_at) where is_active = true for upcoming scheduled work.

Additional indexes were added for:

- jobs(priority, run_at) to support priority-aware scheduling.
- job_logs(job_id, timestamp) to accelerate log retrieval.
- queues(retry_policy_id) for policy-based lookups.
- projects(org_id) and organizations(name) for common organizational queries.

## Performance considerations

The design favors predictable access patterns for queue processing and operational monitoring. JSONB payloads keep job-specific data flexible while remaining queryable. The schema uses constrained enums and CHECK clauses to preserve data quality without excessive overhead.

In Phase 3, job claiming will use PostgreSQL SELECT ... FOR UPDATE SKIP LOCKED so multiple workers can safely race to claim different jobs without contending on rows that are already locked. The lock is taken on the specific job row, and SKIP LOCKED causes a worker to ignore rows claimed by another worker. This prevents duplicate job execution while preserving throughput across a pool of workers.

## Design decisions

- UUID primary keys were chosen for distributed compatibility.
- JSONB payloads remain flexible for heterogeneous job definitions.
- Enum types constrain state transitions for jobs, workers, and logs.
- The design avoids introducing unnecessary tables while still supporting retries, execution history, observability, and scheduling.
