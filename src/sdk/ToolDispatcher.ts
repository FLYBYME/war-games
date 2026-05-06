import { WarGamesClient } from "./WarGamesClient.js";
import { Side } from "./schemas/domain.js";
import { WarGamesTool } from "./tools/Tool.js";
import { createTacticalTools } from "./tools/TacticalTools.js";

/**
 * ToolDispatcher: Centralised hub for executing SDK tools.
 */
export class ToolDispatcher {
    private tools: Map<string, WarGamesTool<any, any>> = new Map();

    constructor(private client: WarGamesClient) {
        const tacticalTools = createTacticalTools(client);
        tacticalTools.forEach(t => this.tools.set(t.name, t));
    }

    /**
     * execute: Performs a tool call with full Zod validation.
     */
    public async execute<TArgs = any, TResult = any>(name: string, matchId: string, side: Side, args: TArgs): Promise<TResult> {
        const tool = this.tools.get(name);
        if (!tool) throw new Error(`Tool not found: ${name}`);

        const validatedArgs = tool.inputSchema.parse(args);
        const result = await tool.call(matchId, side, validatedArgs);
        return tool.outputSchema.parse(result) as TResult;
    }

    public getTools(): WarGamesTool<any, any>[] {
        return Array.from(this.tools.values());
    }
}
