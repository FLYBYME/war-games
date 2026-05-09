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

// ─── sim_update ──────────────────────────────────────────────────────────────

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
    description: 'Adjust simulation speed or toggle pause state.',
    inputSchema: SimUpdateInputSchema,
    outputSchema: SimUpdateOutputSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/simulation' }
});
