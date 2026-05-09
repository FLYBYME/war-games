import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';
import { Vector3Schema } from '../domain/primitives.schema.js';

// ─── Shared Kinematics Output ────────────────────────────────────────────────

export const KinematicsStateSchema = z.object({
    position: Vector3Schema.describe("Current position"),
    velocity: Vector3Schema.describe("Current velocity vector"),
    acceleration: Vector3Schema.describe("Current acceleration vector"),
    heading: z.number().describe("Heading in degrees [0-360]"),
    pitch: z.number().describe("Pitch in degrees"),
    roll: z.number().describe("Roll in degrees"),
    speedKts: z.number().describe("Current speed in knots"),
    altitudeM: z.number().describe("Current altitude in meters"),
    massKg: z.number().describe("Current mass in kilograms")
}).describe("Full kinematics state");

// ─── kinematics_get ──────────────────────────────────────────────────────────

export const KinematicsGetInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID")
});

export const kinematicsGetContract = defineContract({
    domain: 'kinematics',
    action: 'get',
    description: 'Retrieve high-fidelity position, velocity, and orientation data.',
    inputSchema: KinematicsGetInputSchema,
    outputSchema: KinematicsStateSchema,
    rest: { method: 'GET', path: '/matches/:matchId/entities/:entityId/kinematics' }
});

// ─── kinematics_update ───────────────────────────────────────────────────────

export const KinematicsUpdateInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID"),
    velocity: Vector3Schema.optional().describe("New velocity vector"),
    heading: z.number().optional().describe("New heading in degrees"),
    pitch: z.number().optional().describe("New pitch in degrees"),
    speedKts: z.number().optional().describe("New speed in knots"),
    altitudeM: z.number().optional().describe("New altitude in meters")
});

export const kinematicsUpdateContract = defineContract({
    domain: 'kinematics',
    action: 'update',
    description: 'Adjust velocity or heading vectors directly.',
    inputSchema: KinematicsUpdateInputSchema,
    outputSchema: KinematicsStateSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/entities/:entityId/kinematics' }
});

// ─── kinematics_set_position ─────────────────────────────────────────────────

export const KinematicsSetPositionInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID"),
    position: Vector3Schema.describe("New position")
});

export const kinematicsSetPositionContract = defineContract({
    domain: 'kinematics',
    action: 'set_position',
    description: 'Teleport a unit to a new coordinate.',
    inputSchema: KinematicsSetPositionInputSchema,
    outputSchema: KinematicsStateSchema,
    rest: { method: 'PUT', path: '/matches/:matchId/entities/:entityId/kinematics/position' }
});

// ─── kinematics_apply_force ──────────────────────────────────────────────────

export const KinematicsApplyForceInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID"),
    force: Vector3Schema.describe("Force vector in Newtons")
});

export const KinematicsApplyForceOutputSchema = z.object({
    success: z.boolean().describe("Whether the force was applied")
});

export const kinematicsApplyForceContract = defineContract({
    domain: 'kinematics',
    action: 'apply_force',
    description: 'Apply an impulse force to a unit, bypassing propulsion.',
    inputSchema: KinematicsApplyForceInputSchema,
    outputSchema: KinematicsApplyForceOutputSchema,
    rest: { method: 'POST', path: '/matches/:matchId/entities/:entityId/kinematics/force' }
});
