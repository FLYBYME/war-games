import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';

// ─── sim_get ─────────────────────────────────────────────────────────────────

export const SimGetInputSchema = z.object({
    matchId: z.string().describe("The match ID")
});

export const SimGetOutputSchema = z.object({
    tick: z.number().describe("Current simulation tick"),
    timestamp: z.number().describe("Simulation wall-clock timestamp"),
    isPaused: z.boolean().describe("Whether the simulation is paused"),
    timeCompression: z.number().describe("Current time compression factor"),
    tickRateHz: z.number().describe("Target tick rate in hertz"),
    elapsedSeconds: z.number().describe("Elapsed simulation time in seconds")
});

export const simGetContract = defineContract({
    domain: 'sim',
    action: 'get',
    description: 'Get the current simulation status including tick, speed, and pause state.',
    inputSchema: SimGetInputSchema,
    outputSchema: SimGetOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/simulation' }
});

// ─── sim_step ────────────────────────────────────────────────────────────────

export const SimStepInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    ticks: z.number().optional().default(1).describe("Number of ticks to advance")
});

export const SimStepOutputSchema = z.object({
    tick: z.number().describe("Tick after stepping"),
    elapsedTicks: z.number().describe("Total ticks stepped")
});

export const simStepContract = defineContract({
    domain: 'sim',
    action: 'step',
    description: 'Manually advance the simulation by one or more ticks.',
    inputSchema: SimStepInputSchema,
    outputSchema: SimStepOutputSchema,
    rest: { method: 'POST', path: '/matches/:matchId/simulation/step' }
});

// ─── sim_update (DEPRECATED) ────────────────────────────────────────────────

export const SimUpdateInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    timeCompression: z.number().optional().describe("New time compression factor"),
    isPaused: z.boolean().optional().describe("Set pause state")
});

export const SimUpdateOutputSchema = z.object({
    tick: z.number().describe("Current tick after update"),
    isPaused: z.boolean().describe("Current pause state"),
    timeCompression: z.number().describe("Current time compression")
});

export const simUpdateContract = defineContract({
    domain: 'sim',
    action: 'update',
    description: 'DEPRECATED: Use sim_pause, sim_resume, or sim_set_speed instead.',
    inputSchema: SimUpdateInputSchema,
    outputSchema: SimUpdateOutputSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/simulation' }
});

// ─── sim_pause ──────────────────────────────────────────────────────────────

export const simPauseContract = defineContract({
    domain: 'sim',
    action: 'pause',
    description: 'Pause the simulation match.',
    inputSchema: SimGetInputSchema,
    outputSchema: SimUpdateOutputSchema,
    rest: { method: 'POST', path: '/matches/:matchId/simulation/pause' }
});

// ─── sim_resume ─────────────────────────────────────────────────────────────

export const simResumeContract = defineContract({
    domain: 'sim',
    action: 'resume',
    description: 'Resume a paused simulation match.',
    inputSchema: SimGetInputSchema,
    outputSchema: SimUpdateOutputSchema,
    rest: { method: 'POST', path: '/matches/:matchId/simulation/resume' }
});

// ─── sim_set_speed ──────────────────────────────────────────────────────────

export const SimSetSpeedInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    timeCompression: z.number().describe("New time compression factor (e.g. 1.0, 5.0, 10.0)")
});

export const simSetSpeedContract = defineContract({
    domain: 'sim',
    action: 'set_speed',
    description: 'Set the simulation time compression factor.',
    inputSchema: SimSetSpeedInputSchema,
    outputSchema: SimUpdateOutputSchema,
    rest: { method: 'POST', path: '/matches/:matchId/simulation/speed' }
});

// ─── sim_get_metrics ─────────────────────────────────────────────────────────

export const SimGetMetricsInputSchema = z.object({
    matchId: z.string().optional().describe("Optional match ID to get specific metrics for")
});

export const SimMetricsOutputSchema = z.object({
    memory: z.object({
        rss: z.number().describe("Resident Set Size in bytes"),
        heapUsed: z.number().describe("Heap memory used in bytes"),
        heapTotal: z.number().describe("Total heap allocated in bytes"),
        external: z.number().describe("External memory (Buffers, etc) in bytes")
    }),
    uptime: z.number().describe("Process uptime in seconds"),
    tracerSize: z.number().optional().describe("Number of logs in the tracer for the specified match"),
    octreeNodeCount: z.number().optional().describe("Number of nodes in the octree for the specified match")
});

export const simGetMetricsContract = defineContract({
    domain: 'sim',
    action: 'get_metrics',
    description: 'Get real-time performance and memory metrics for the simulation server.',
    inputSchema: SimGetMetricsInputSchema,
    outputSchema: SimMetricsOutputSchema,
    rest: { method: 'GET', path: '/simulation/metrics' }
});

// ─── sim_get_stream ─────────────────────────────────────────────────────────

import { SimulationEventSchema } from '../domain/events.schema.js';

export const simGetStreamContract = defineContract({
    domain: 'sim',
    action: 'get_stream',
    description: 'Open a real-time SSE stream for simulation events (ticks, combat, etc.) for a specific match.',
    inputSchema: SimGetInputSchema,
    outputSchema: SimulationEventSchema,
    rest: { 
        method: 'GET', 
        path: '/matches/:matchId/simulation/stream',
        isStream: true 
    }
});
