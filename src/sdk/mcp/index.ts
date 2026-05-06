import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { WarGamesClient, Side } from "../index.js";
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * WarGamesMCP: Pure tool-centric bridge for the War-Games SDK.
 * 
 * Mandate: No Resources are used, as per architectural direction. 
 * All data retrieval (ViewState, Matches, Profiles) is handled via Tools.
 */
class WarGamesMCP {
    private server: Server;
    private client: WarGamesClient;

    constructor() {
        this.client = new WarGamesClient({ url: process.env.WARGAMES_URL || "ws://localhost:3000" });

        this.server = new Server(
            { name: "war-games-mcp", version: "1.0.0" },
            { capabilities: { tools: {} } }
        );

        this.setupHandlers();
    }

    private setupHandlers() {
        // 1. List Tools (Pure Bridge from SDK Dispatcher)
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: this.client.tools.getTools().map(t => ({
                name: t.name,
                description: t.description,
                inputSchema: zodToJsonSchema(t.inputSchema as any) as any
            }))
        }));

        // 2. Call Tool (Delegated to SDK ToolDispatcher)
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            
            try {
                if (this.client.connectionState !== 'Connected') {
                    await this.client.connect();
                }

                const matchId = process.env.WARGAMES_MATCH_ID || 'default';
                const side = (process.env.WARGAMES_SIDE as Side) || Side.Blue;
                
                console.error(`[MCP] Executing tool: ${name} for match: ${matchId}, side: ${side}`);

                // Ensure client is joined to the target match context
                if (this.client.currentMatchId !== matchId || this.client.currentSide !== side) {
                    console.error(`[MCP] Joining match: ${matchId} as ${side}`);
                    this.client.joinMatch(side, matchId);
                }

                const result = await this.client.tools.execute(name, matchId, side, args);

                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                };
            } catch (err: any) {
                return {
                    content: [{ type: "text", text: `Error: ${err.message}` }],
                    isError: true
                };
            }
        });
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("War-Games MCP tool-centric bridge active");
    }
}

const mcp = new WarGamesMCP();
mcp.run().catch(console.error);
