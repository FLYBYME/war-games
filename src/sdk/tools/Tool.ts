import { Side } from "../schemas/domain.js";
import * as Z from "zod";

/**
 * WarGamesTool: The universal interface for interacting with the simulation.
 * Serves as the foundation for UI, CLI, AI Agents, and MCP.
 */
export interface WarGamesTool<
    TInput extends Z.ZodObject<any> = Z.ZodObject<any>,
    TOutput extends Z.ZodTypeAny = Z.ZodTypeAny
> {
    name: string;
    description: string;
    inputSchema: TInput;
    outputSchema: TOutput;
    /**
     * The implementation of the tool.
     * @param matchId The ID of the match to operate on.
     * @param side The side affiliation of the caller.
     * @param args The validated input arguments.
     */
    call(matchId: string | undefined, side: Side | undefined, args: Z.infer<TInput>): Promise<Z.infer<TOutput>>;
}

/**
 * defineTool: Helper for type-safe tool definitions.
 */
export function defineTool<TInput extends Z.ZodObject<any>, TOutput extends Z.ZodTypeAny>(
    tool: WarGamesTool<TInput, TOutput>
): WarGamesTool<TInput, TOutput> {
    return tool;
}
