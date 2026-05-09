import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';

// ─── Orbital State ───────────────────────────────────────────────────────────

export const OrbitalStateSchema = z.object({
    entityId: z.string().describe("Satellite entity ID"),
    semiMajorAxisKm: z.number().describe("Semi-major axis (a)"),
    eccentricity: z.number().describe("Eccentricity (e)"),
    inclinationDeg: z.number().describe("Inclination (i) in degrees"),
    raanDeg: z.number().describe("RAAN (Ω) in degrees"),
    argumentOfPerigeeDeg: z.number().describe("Argument of Perigee (ω)"),
    meanAnomalyDeg: z.number().describe("Mean Anomaly (M)"),
    epochTick: z.number().describe("Tick of orbital element definition")
}).describe("Keplerian orbital elements");

// ─── orbital_get_elements ────────────────────────────────────────────────────

export const OrbitalGetInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The satellite entity ID")
});

export const orbitalGetContract = defineContract({
    domain: 'orbital',
    action: 'get_elements',
    description: 'Fetch the Keplerian orbital elements for a satellite.',
    inputSchema: OrbitalGetInputSchema,
    outputSchema: OrbitalStateSchema,
    rest: { method: 'GET', path: '/matches/:matchId/entities/:entityId/orbital' }
});

// ─── orbital_update_elements ─────────────────────────────────────────────────

export const OrbitalUpdateInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The satellite entity ID"),
    semiMajorAxisKm: z.number().optional().describe("Adjust orbit height"),
    inclinationDeg: z.number().optional().describe("Adjust inclination")
});

export const orbitalUpdateContract = defineContract({
    domain: 'orbital',
    action: 'update_elements',
    description: 'Manually adjust a satellite\'s orbit (Station Keeping).',
    inputSchema: OrbitalUpdateInputSchema,
    outputSchema: OrbitalStateSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/entities/:entityId/orbital' }
});

// ─── orbital_predict_pass ────────────────────────────────────────────────────

export const OrbitalPredictInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The satellite entity ID"),
    latMin: z.number().describe("Bounding box Latitude min"),
    latMax: z.number().describe("Bounding box Latitude max"),
    lonMin: z.number().describe("Bounding box Longitude min"),
    lonMax: z.number().describe("Bounding box Longitude max")
});

export const OrbitalPredictOutputSchema = z.object({
    nextPassTick: z.number().describe("Predicted tick of next LOS pass"),
    durationTicks: z.number().describe("Expected pass duration in ticks")
});

export const orbitalPredictPassContract = defineContract({
    domain: 'orbital',
    action: 'predict_pass',
    description: 'Predict when a satellite will have LOS over a specific region.',
    inputSchema: OrbitalPredictInputSchema,
    outputSchema: OrbitalPredictOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/entities/:entityId/orbital/passes' }
});
