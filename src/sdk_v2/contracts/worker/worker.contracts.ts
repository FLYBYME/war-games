import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';

// ─── Worker Schemas ──────────────────────────────────────────────────────────

export const WorkerStatsSchema = z.object({
    id: z.number().describe("Worker instance ID"),
    busy: z.boolean().describe("Whether worker is currently processing a job"),
    jobsProcessed: z.number().describe("Total jobs completed by this instance"),
    errors: z.number().describe("Total error count for this instance"),
    memory: z.object({
        heapUsed: z.number().describe("Heap memory used in bytes"),
        heapTotal: z.number().describe("Total heap allocated in bytes"),
        external: z.number().describe("External memory (Buffers, etc) in bytes"),
        rss: z.number().describe("Resident Set Size in bytes")
    }).optional().describe("Memory usage metrics"),
    load: z.number().min(0).max(1).optional().describe("Event Loop Utilization (0-1)")
});

export const WorkerPoolStatsSchema = z.object({
    poolName: z.string().describe("Name of the worker pool"),
    workerCount: z.number().describe("Total workers in the pool"),
    activeJobs: z.number().describe("Number of workers currently busy"),
    queuedJobs: z.number().describe("Number of jobs waiting for an available worker"),
    workers: z.array(WorkerStatsSchema).describe("Individual worker instance stats")
});

// ─── worker_list ─────────────────────────────────────────────────────────────

export const WorkerListInputSchema = z.object({});
export const WorkerListOutputSchema = z.object({
    pools: z.array(WorkerPoolStatsSchema).describe("List of active pools")
});

export const workerListContract = defineContract({
    domain: 'worker',
    action: 'list',
    description: 'List all active worker pools and their high-level status.',
    inputSchema: WorkerListInputSchema,
    outputSchema: WorkerListOutputSchema,
    rest: { method: 'GET', path: '/workers' }
});

// ─── worker_get_stats ─────────────────────────────────────────────────────────

export const WorkerGetStatsInputSchema = z.object({
    poolName: z.string().describe("Name of the pool to inspect")
});

export const workerGetStatsContract = defineContract({
    domain: 'worker',
    action: 'get_stats',
    description: 'Get detailed performance metrics for a specific worker pool.',
    inputSchema: WorkerGetStatsInputSchema,
    outputSchema: WorkerPoolStatsSchema,
    rest: { method: 'GET', path: '/workers/:poolName' }
});
