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
    MissionParamsSchema,
    EngineCommandPayloadSchema,
    EngineCommandPayload
} from "../schemas/index.js";

/**
 * generateCommandTools: Dynamically maps the Zod command schemas to LLM tools.
 */
export function generateCommandTools(client: WarGamesClient) {
    return EngineCommandPayloadSchema.options.map(schema => {
        if (!(schema instanceof z.ZodObject)) {
            throw new Error(`Unexpected schema type in EngineCommandPayload: ${typeof schema}`);
        }

        const objSchema = schema as z.AnyZodObject;
        // Extract the literal command type (e.g. 'SetCourse')
        const commandType = (objSchema.shape.type as z.ZodLiteral<string>)._def.value;
        
        // The LLM doesn't need to pass the 'type' field, we re-inject it.
        const inputSchema = objSchema.omit({ type: true });

        return defineTool({
            name: `engine_${commandType.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()}`,
            description: schema.description || `Execute ${commandType} command on the engine.`,
            inputSchema,
            outputSchema: z.object({ success: z.boolean(), commandType: z.string() }),
            async call(_matchId, _side, args) {
                const payload = EngineCommandPayloadSchema.parse({ type: commandType, ...args });
                const result = await client.dispatchRest(payload);
                return { success: result.success, commandType: result.commandType };
            }
        });
    });
}

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
                const isOrdnance = u.category === 'Weapon' || u.category === 'Mine';
                if (!isOrdnance && u.hp < 40) alerts.push(`URGENT: ${u.profileId || u.id} heavily damaged (${u.hp}%). Consider RTB.`);
                if (!isOrdnance && u.fuelPct < 0.2) suggestions.push(`Refuel required for ${u.id}. Current fuel: ${Math.round(u.fuelPct * 100)}%`);
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
            const profile = await client.scenario.getProfile(args.profileId);
            if (!profile) throw new Error(`Profile ${args.profileId} not found.`);
            return profile;
        }
    });

    return [
        get_tactical_status,
        get_unit_details,
        list_matches,
        query_profile_data,
        wait,
        ...generateCommandTools(client)
    ];
}
