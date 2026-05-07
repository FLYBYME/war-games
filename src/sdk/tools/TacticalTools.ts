import * as z from "zod";
import { defineTool } from "./Tool.js";
import { WarGamesClient } from "../WarGamesClient.js";
import { 
    SideSchema, 
    Vector3Schema, 
    ViewUnitPayloadSchema, 
    ViewTrackPayloadSchema, 
    EntityProfileSchema,
    MatchInfoSchema,
    MissionTypeSchema,
    MissionParamsSchema
} from "../schemas/index.js";

/**
 * createTacticalTools: Factory for the core tactical command and query set.
 */
export function createTacticalTools(client: WarGamesClient) {
    /**
     * get_tactical_status: Universal query for the current match state.
     */
    const get_tactical_status = defineTool({
        name: "get_tactical_status",
        description: "Returns the current tactical situation, including all visible units and tracks.",
        inputSchema: z.object({}),
        outputSchema: z.object({
            tick: z.number().describe("Current simulation tick"),
            units: z.array(ViewUnitPayloadSchema).describe("List of all visible friendly and neutral units"),
            tracks: z.array(ViewTrackPayloadSchema).describe("List of all tactical tracks (sensor detections)"),
            assessment: z.object({
                threatLevel: z.enum(['Low', 'Medium', 'High']).describe("Automated threat assessment"),
                commandSummary: z.string().describe("High-level tactical summary"),
                criticalAlerts: z.array(z.string()).describe("Immediate issues requiring attention"),
                suggestedActions: z.array(z.string()).describe("AI-generated tactical recommendations")
            })
        }),
        async call(_matchId, _side, _args) {
            const vs = await client.getLatestViewState();
            if (!vs) throw new Error("ViewState unavailable");

            const alerts: string[] = [];
            const suggestions: string[] = [];

            vs.units.forEach(u => {
                if (u.hp < 40) alerts.push(`URGENT: ${u.profileId || u.id} heavily damaged (${u.hp}%). Consider RTB.`);
                if (u.fuelPct < 0.2) suggestions.push(`Refuel required for ${u.id}. Current fuel: ${Math.round(u.fuelPct * 100)}%`);
            });

            const hostileCount = vs.tracks.filter(t => t.identification === 'Hostile').length;
            const threatLevel: 'Low' | 'Medium' | 'High' = hostileCount > 8 ? 'High' : hostileCount > 2 ? 'Medium' : 'Low';

            if (hostileCount > 0) {
                suggestions.push(`Assign CAP missions to intercept ${hostileCount} hostile tracks.`);
            }

            return {
                tick: vs.tick,
                units: vs.units,
                tracks: vs.tracks,
                assessment: {
                    threatLevel,
                    commandSummary: `Theater status: ${vs.units.length} units active. ${hostileCount} hostiles tracked.`,
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
        async call(_matchId, _side, args) {
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
        description: "Sets the simulation time compression rate (0-30). 0 is paused.",
        inputSchema: z.object({ rate: z.number().min(0).max(30) }),
        outputSchema: z.object({ success: z.boolean() }),
        async call(_matchId, _side, args) {
            client.setTimeCompression(args.rate);
            return { success: true };
        }
    });

    /**
     * get_unit_details: Detailed inspection of a specific unit.
     */
    const get_unit_details = defineTool({
        name: "get_unit_details",
        description: "Returns full technical details for a specific unit.",
        inputSchema: z.object({ unitId: z.string() }),
        outputSchema: ViewUnitPayloadSchema,
        async call(_matchId, _side, args) {
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
            destination: Vector3Schema,
            speedKts: z.number()
        }),
        outputSchema: z.object({ success: z.boolean(), message: z.string() }),
        async call(_matchId, _side, args) {
            await client.dispatchRest({
                type: 'SetCourse',
                entityId: args.unitId,
                position: args.destination,
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
        description: "Assigns a mission to a unit or group.",
        inputSchema: z.object({
            unitId: z.string(),
            missionType: MissionTypeSchema,
            params: MissionParamsSchema.optional()
        }),
        outputSchema: z.object({ success: z.boolean(), message: z.string() }),
        async call(_matchId, _side, args) {
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
        description: "Sets EMCON (Emission Control) state.",
        inputSchema: z.object({
            state: z.string().describe("e.g. 'Active', 'Silent', 'Alpha', 'Bravo'"),
            unitId: z.string().optional().describe("If omitted, applies to the entire side.")
        }),
        outputSchema: z.object({ success: z.boolean(), message: z.string() }),
        async call(_matchId, _side, args) {
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
        async call(_matchId, _side, args) {
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
            side: SideSchema,
            pos: Vector3Schema,
            heading: z.number().optional().default(0)
        }),
        outputSchema: z.object({ success: z.boolean(), unitId: z.string() }),
        async call(_matchId, _side, args) {
            const id = `${args.profileId}-${Math.floor(Math.random() * 1000)}`;
            await client.dispatchRest({
                type: 'SpawnEntity',
                id,
                profileId: args.profileId,
                side: args.side,
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
            interruptedByEvent: z.boolean(),
            events: z.array(z.unknown()).optional()
        }),
        async call(_matchId, _side, args) {
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
        outputSchema: z.array(MatchInfoSchema),
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
        outputSchema: EntityProfileSchema,
        async call(_matchId, _side, args) {
            return await client.scenario.getProfile(args.profileId);
        }
    });

    return [
        get_tactical_status,
        set_paused,
        set_time_compression,
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
