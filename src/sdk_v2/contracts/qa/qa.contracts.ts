import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';
import { Vector3Schema } from '../domain/primitives.schema.js';

// --- Schemas ---

export const TestWeaponInputSchema = z.object({
    weaponProfileId: z.string().describe("ID of the weapon to test"),
    shooterProfileId: z.string().default('ddg-destroyer').describe("ID of the shooter platform"),
    targetProfileId: z.string().default('transport-helo').describe("ID of the target platform"),
    rangeM: z.number().default(10000).describe("Horizontal distance to target in meters"),
    altitudeM: z.number().default(500).describe("Target altitude in meters"),
    rounds: z.number().default(1).describe("Number of rounds to fire"),
});

export const TestWeaponOutputSchema = z.object({
    matchId: z.string(),
    outcome: z.string().describe("Summary of the test outcome (e.g. 'Impact', 'Miss')"),
    metrics: z.object({
        impacts: z.array(Vector3Schema),
        biasM: z.number(),
        cep50M: z.number(),
        munitionsFired: z.number(),
    }),
    agentAnalysis: z.string().describe("AI-driven analysis of the test results, highlighting logic errors or anomalies."),
});

// --- Contracts ---

export const qaTestWeaponContract = defineContract({
    domain: 'qa',
    action: 'test_weapon',
    description: 'Automated weapon testing with AI diagnostic analysis.',
    inputSchema: TestWeaponInputSchema,
    outputSchema: TestWeaponOutputSchema,
    rest: { method: 'POST', path: '/qa/test-weapon' }
});
