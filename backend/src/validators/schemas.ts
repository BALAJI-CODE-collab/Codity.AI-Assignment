import { z } from 'zod';
import type { JobStatus } from '../repositories/jobRepository';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1)
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1)
  })
});

export const organizationSchema = z.object({
  body: z.object({
    name: z.string().min(1)
  })
});

export const projectSchema = z.object({
  body: z.object({
    org_id: z.string().uuid(),
    name: z.string().min(1)
  })
});

export const queueSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    priority: z.number().int().min(0).optional(),
    max_concurrency: z.number().int().min(1).optional(),
    retry_policy_id: z.string().uuid().nullable().optional(),
    is_paused: z.boolean().optional()
  })
});

export const queuePatchSchema = z.object({
  body: z.object({
    priority: z.number().int().min(0).optional(),
    max_concurrency: z.number().int().min(1).optional(),
    retry_policy_id: z.string().uuid().nullable().optional(),
    is_paused: z.boolean().optional()
  })
});

export const jobCreateSchema = z.object({
  body: z.object({
    type: z.enum(['immediate', 'delayed', 'scheduled', 'recurring', 'batch']),
    payload: z.record(z.any()).optional(),
    priority: z.number().int().min(0).optional(),
    run_at: z.string().datetime().optional(),
    max_attempts: z.number().int().min(1).optional(),
    cron_expression: z.string().optional(),
    job_count: z.number().int().min(1).optional(),
    batch_size: z.number().int().min(1).optional()
  })
});

export const paramsIdSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  })
});

export const queueParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  })
});

export const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    per_page: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['queued', 'scheduled', 'claimed', 'running', 'completed', 'failed', 'dead_letter'] as [JobStatus, ...JobStatus[]]).optional(),
    queue: z.string().uuid().optional(),
    project: z.string().uuid().optional()
  })
});
