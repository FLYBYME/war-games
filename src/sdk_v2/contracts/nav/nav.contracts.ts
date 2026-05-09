import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';
import { Vector3Schema } from '../domain/primitives.schema.js';

// ─── Shared Navigation State ─────────────────────────────────────────────────

export const WaypointSchema = z.object({
    id: z.string().describe("Waypoint identifier"),
    position: Vector3Schema.describe("Waypoint position"),
    speedKts: z.number().optional().describe("Desired speed at this waypoint")
}).describe("A single navigation waypoint");

export const NavigationStateSchema = z.object({
    entityId: z.string().describe("Entity ID"),
    desiredSpeedKts: z.number().describe("Desired speed in knots"),
    desiredAltitudeM: z.number().describe("Desired altitude in meters"),
    desiredHeading: z.number().describe("Desired heading in degrees"),
    autopilotMode: z.string().describe("Current autopilot mode"),
    waypoints: z.array(WaypointSchema).describe("Active waypoint list"),
    formationLeaderId: z.string().optional().describe("Formation leader ID"),
    formationOffset: Vector3Schema.optional().describe("Offset from leader")
}).describe("Full navigation state");

// ─── nav_get ─────────────────────────────────────────────────────────────────

export const NavGetInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID")
});

export const navGetContract = defineContract({
    domain: 'nav',
    action: 'get',
    description: 'Check current destination, course, and autopilot mode.',
    inputSchema: NavGetInputSchema,
    outputSchema: NavigationStateSchema,
    rest: { method: 'GET', path: '/matches/:matchId/entities/:entityId/navigation' }
});

// ─── nav_update ──────────────────────────────────────────────────────────────

export const NavUpdateInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID"),
    desiredSpeedKts: z.number().optional().describe("New desired speed"),
    desiredAltitudeM: z.number().optional().describe("New desired altitude"),
    desiredHeading: z.number().optional().describe("New desired heading")
});

export const navUpdateContract = defineContract({
    domain: 'nav',
    action: 'update',
    description: 'Adjust cruise speed, altitude, or heading.',
    inputSchema: NavUpdateInputSchema,
    outputSchema: NavigationStateSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/entities/:entityId/navigation' }
});

// ─── nav_list_waypoints ──────────────────────────────────────────────────────

export const NavListWaypointsInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID")
});

export const NavListWaypointsOutputSchema = z.object({
    waypoints: z.array(WaypointSchema).describe("Active waypoints")
});

export const navListWaypointsContract = defineContract({
    domain: 'nav',
    action: 'list_waypoints',
    description: 'Retrieve the active flight plan or route.',
    inputSchema: NavListWaypointsInputSchema,
    outputSchema: NavListWaypointsOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/entities/:entityId/navigation/waypoints' }
});

// ─── nav_add_waypoint ────────────────────────────────────────────────────────

export const NavAddWaypointInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID"),
    position: Vector3Schema.describe("Waypoint position"),
    speedKts: z.number().describe("Speed at this waypoint")
});

export const navAddWaypointContract = defineContract({
    domain: 'nav',
    action: 'add_waypoint',
    description: 'Append a waypoint to the navigation path.',
    inputSchema: NavAddWaypointInputSchema,
    outputSchema: NavListWaypointsOutputSchema,
    rest: { method: 'POST', path: '/matches/:matchId/entities/:entityId/navigation/waypoints' }
});

// ─── nav_clear_waypoints ─────────────────────────────────────────────────────

export const NavClearWaypointsInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID")
});

export const NavClearWaypointsOutputSchema = z.object({
    success: z.boolean().describe("Whether waypoints were cleared")
});

export const navClearWaypointsContract = defineContract({
    domain: 'nav',
    action: 'clear_waypoints',
    description: 'Clear all waypoints and stop navigation.',
    inputSchema: NavClearWaypointsInputSchema,
    outputSchema: NavClearWaypointsOutputSchema,
    rest: { method: 'DELETE', path: '/matches/:matchId/entities/:entityId/navigation/waypoints' }
});

// ─── nav_join_formation ──────────────────────────────────────────────────────

export const NavJoinFormationInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID"),
    leaderId: z.string().describe("Formation leader entity ID"),
    offset: Vector3Schema.describe("Relative offset from leader")
});

export const navJoinFormationContract = defineContract({
    domain: 'nav',
    action: 'join_formation',
    description: 'Attach unit to a leader for collective movement.',
    inputSchema: NavJoinFormationInputSchema,
    outputSchema: NavigationStateSchema,
    rest: { method: 'POST', path: '/matches/:matchId/entities/:entityId/navigation/formation' }
});

// ─── nav_break_formation ─────────────────────────────────────────────────────

export const NavBreakFormationInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID")
});

export const NavBreakFormationOutputSchema = z.object({
    success: z.boolean().describe("Whether formation was broken")
});

export const navBreakFormationContract = defineContract({
    domain: 'nav',
    action: 'break_formation',
    description: 'Detach unit from formation.',
    inputSchema: NavBreakFormationInputSchema,
    outputSchema: NavBreakFormationOutputSchema,
    rest: { method: 'DELETE', path: '/matches/:matchId/entities/:entityId/navigation/formation' }
});
