import * as z from "zod";
import * as fs from "fs";
import { defineTool } from "./Tool.js";
import { WarGamesClient } from "../WarGamesClient.js";
import { Side, Vector3Schema } from "../schemas/domain.js";
import { SimulationEvent } from "../schemas/events.js";

/**
 * createTacticalTools: Factory for the core tactical command and query set.
 */
export function createTacticalTools(client: WarGamesClient) {
    /**
     * get_tactical_status: Universal query for the current match state.
     */
    const get_tactical_status = defineTool({
        name: "get_tactical_status",
        description: "Returns the current tactical situation and high-level command assessment.",
        inputSchema: z.object({}),
        outputSchema: z.object({
            tick: z.number(),
            units: z.array(z.any()),
            tracks: z.array(z.any()),
            assessment: z.object({
                totalFuelKg: z.number(),
                threatLevel: z.enum(['Low', 'Medium', 'High']),
                commandSummary: z.string(),
                criticalAlerts: z.array(z.string()),
                suggestedActions: z.array(z.string())
            })
        }),
        async call(matchId, side, _args) {
            const vs = await client.getLatestViewState();
            if (!vs) throw new Error("ViewState unavailable");

            let totalFuel = 0;
            const alerts: string[] = [];
            const suggestions: string[] = [];

            vs.units.forEach(u => {
                totalFuel += (u as any).fuel?.current || 0;
                if (u.hp < 40) alerts.push(`URGENT: ${u.profileId || u.id} heavily damaged (${u.hp}%). Consider RTB.`);
                if ((u as any).fuelPct < 0.2) suggestions.push(`Refuel required for ${u.id}. Current fuel: ${Math.round((u as any).fuelPct * 100)}%`);
            });

            const hostileCount = vs.tracks.filter(t => t.classification === 'Hostile').length;
            const threatLevel: 'Low' | 'Medium' | 'High' = hostileCount > 8 ? 'High' : hostileCount > 2 ? 'Medium' : 'Low';

            if (hostileCount > 0) {
                suggestions.push(`Assign CAP missions to intercept ${hostileCount} hostile tracks.`);
            }

            // Analyze Threat Map
            const threatZones = (vs as any).threatMap || [];
            if (threatZones.length > 0) {
                suggestions.push(`Navigate strike packages around ${threatZones.length} identified SAM/Radar threat zones.`);
            }

            return {
                tick: vs.tick,
                units: vs.units.map(u => ({
                    id: u.id,
                    profileId: u.profileId,
                    side: u.side,
                    pos: u.pos,
                    heading: u.rot,
                    speedKts: u.speedKts,
                    hp: u.hp,
                    fuelPct: Math.round((u.fuelPct || 1.0) * 100),
                    mission: u.mission ? `${u.mission.type} (${u.mission.status})` : 'Idle',
                    activeTasks: (u as any).taskGraph?.activeTasks.map((t: any) => t.type).join(', ') || 'None'
                })),
                tracks: vs.tracks.map(t => ({
                    id: t.id,
                    classification: t.classification,
                    pos: t.pos,
                    speedKts: t.speedKts
                })),
                assessment: {
                    totalFuelKg: totalFuel,
                    threatLevel,
                    commandSummary: `Theater status: ${vs.units.length} units active. ${hostileCount} hostiles tracked. ${threatZones.length} threat zones identified.`,
                    criticalAlerts: alerts,
                    suggestedActions: suggestions
                }
            };
        }
    });

    /**
     * set_paused: Simulation flow control.
     */
    const set_paused = defineTool({
        name: "set_paused",
        description: "Pauses or resumes the simulation.",
        inputSchema: z.object({ paused: z.boolean() }),
        outputSchema: z.object({ success: z.boolean() }),
        async call(matchId, side, args) {
            if (args.paused) client.pause();
            else client.resume(1);
            return { success: true };
        }
    });

    /**
     * set_time_compression: Simulation speed control.
     */
    const set_time_compression = defineTool({
        name: "set_time_compression",
        description: "Sets the simulation time compression rate (0-30).",
        inputSchema: z.object({ rate: z.number().min(0).max(30) }),
        outputSchema: z.object({ success: z.boolean() }),
        async call(matchId, side, args) {
            client.setTimeCompression(args.rate);
            return { success: true };
        }
    });

    /**
     * get_unit_details: Detailed inspection of a specific unit.
     */
    const get_unit_details = defineTool({
        name: "get_unit_details",
        description: "Returns technical details for a specific unit, including sensor status and task graph.",
        inputSchema: z.object({ unitId: z.string() }),
        outputSchema: z.any(),
        async call(matchId, side, args) {
            const vs = await client.getLatestViewState();
            const unit = vs?.units.find(u => u.id === args.unitId);
            if (!unit) throw new Error(`Unit ${args.unitId} not found or not visible.`);
            return unit;
        }
    });

    /**
     * set_unit_course: Direct navigation control.
     */
    const set_unit_course = defineTool({
        name: "set_unit_course",
        description: "Orders a unit to move to a specific coordinate at a specified speed.",
        inputSchema: z.object({
            unitId: z.string(),
            destination: z.object({
                x: z.number().describe("Longitude / X coordinate"),
                y: z.number().describe("Latitude / Y coordinate")
            }),
            speedKts: z.number()
        }),
        outputSchema: z.object({ success: z.boolean(), message: z.string() }),
        async call(matchId, side, args) {
            await client.dispatchRest({
                type: 'SetCourse',
                entityId: args.unitId,
                position: { ...args.destination, z: 0 },
                speedKts: args.speedKts
            });
            return { success: true, message: `Course set for ${args.unitId}` };
        }
    });

    /**
     * assign_mission: High-level operational control.
     */
    const assign_mission = defineTool({
        name: "assign_mission",
        description: "Assigns a mission (Patrol, Strike, ASW, Escort) to a unit or group.",
        inputSchema: z.object({
            unitId: z.string(),
            missionType: z.enum(['Patrol', 'Strike', 'ASW', 'Escort']),
            params: z.object({
                center: z.object({ x: z.number(), y: z.number() }).optional().describe("Center of patrol zone"),
                radiusM: z.number().optional().describe("Radius of patrol zone in meters"),
                targetId: z.string().optional().describe("Primary target for Strike/Escort missions")
            }).optional()
        }),
        outputSchema: z.object({ success: z.boolean(), message: z.string() }),
        async call(matchId, side, args) {
            await client.dispatchRest({
                type: 'SetMission',
                entityId: args.unitId,
                missionType: args.missionType,
                params: args.params
            });
            return { success: true, message: `Mission ${args.missionType} assigned to ${args.unitId}` };
        }
    });

    /**
     * set_emcon: Electronic signature management.
     */
    const set_emcon = defineTool({
        name: "set_emcon",
        description: "Sets EMCON (Emission Control) state. 'Active' allows radar, 'Silent' disables active emissions.",
        inputSchema: z.object({
            state: z.enum(['Active', 'Silent']),
            unitId: z.string().optional().describe("If omitted, applies to the entire side.")
        }),
        outputSchema: z.object({ success: z.boolean(), message: z.string() }),
        async call(matchId, side, args) {
            await client.dispatchRest({
                type: 'SetEMCON',
                entityId: args.unitId,
                state: args.state
            });
            return { success: true, message: `EMCON set to ${args.state}${args.unitId ? ' for ' + args.unitId : ''}` };
        }
    });

    /**
     * engage_target: Tactical weapon release.
     */
    const engage_target = defineTool({
        name: "engage_target",
        description: "Orders a unit to engage a specific target track with its active weapon mounts.",
        inputSchema: z.object({
            unitId: z.string(),
            targetId: z.string(),
            mountIndex: z.number().optional().default(0)
        }),
        outputSchema: z.object({ success: z.boolean(), message: z.string() }),
        async call(matchId, side, args) {
            await client.dispatchRest({
                type: 'FireWeapon',
                entityId: args.unitId,
                targetId: args.targetId,
                mountIndex: args.mountIndex
            });
            return { success: true, message: `Engagement ordered: ${args.unitId} -> ${args.targetId}` };
        }
    });

    /**
     * spawn_unit: Dynamic scenario injection.
     */
    const spawn_unit = defineTool({
        name: "spawn_unit",
        description: "Spawns a new unit from the database into the live match.",
        inputSchema: z.object({
            profileId: z.string().describe("e.g. 'f-35a', 'ddg-51'"),
            side: z.enum(['Blue', 'Red', 'Neutral']),
            pos: z.object({ x: z.number(), y: z.number(), z: z.number() }),
            heading: z.number().optional().default(0)
        }),
        outputSchema: z.object({ success: z.boolean(), unitId: z.string() }),
        async call(matchId, side, args) {
            const id = `${args.profileId}-${Math.floor(Math.random() * 1000)}`;
            await client.dispatchRest({
                type: 'SpawnEntity',
                id,
                profileId: args.profileId,
                side: args.side as any,
                position: args.pos,
                heading: args.heading,
                speedKts: 0
            });
            return { success: true, unitId: id };
        }
    });

    /**
     * wait: Time advancement.
     */
    const wait = defineTool({
        name: "wait",
        description: "Advances the simulation clock by a specific duration. Automatically halts if tactical events occur.",
        inputSchema: z.object({ durationMinutes: z.number() }),
        outputSchema: z.object({
            success: z.boolean(),
            elapsedSeconds: z.number(),
            interruptedByEvent: z.boolean().optional(),
            currentTick: z.number().optional(),
            elapsedTicks: z.number().optional()
        }),
        async call(matchId, side, args) {
            return await client.stepRest(args.durationMinutes);
        }
    });

    /**
     * list_matches: Returns a list of all active matches on the server.
     */
    const list_matches = defineTool({
        name: "list_matches",
        description: "Returns a list of all active tactical matches and their status.",
        inputSchema: z.object({}),
        outputSchema: z.array(z.any()),
        async call(_matchId, _side, _args) {
            return await client.listMatches();
        }
    });


    /**
     * query_profile_data: Returns specifications for a platform type
     */
    const query_profile_data = defineTool({
        name: "query_profile_data",
        description: "Queries the technical specifications for a unit profile.",
        inputSchema: z.object({
            profileId: z.string()
        }),
        outputSchema: z.any(),
        async call(matchId, side, args) {
            return await client.scenario.getProfile(args.profileId);
        }
    });

    return [
        get_tactical_status,
        // set_paused,
        // set_time_compression,
        get_unit_details,
        set_unit_course,
        assign_mission,
        set_emcon,
        engage_target,
        spawn_unit,
        wait,
        list_matches,
        query_profile_data
    ];
}
