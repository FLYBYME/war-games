import { z } from 'zod';
import type { ToolContract } from '../../sdk_v2/contracts/core/tool_contract.js';

// ─── Server Tool Registry ────────────────────────────────────────────────────

/**
 * ServerToolRegistry: Holds all server tool implementations.
 * The Fastify route generator iterates over this.
 */
export class ServerToolRegistry {
    private readonly tools = new Map<string, ServerTool>();

    public register(tool: ServerTool): void {
        const key = `${tool.contract.domain}_${tool.contract.action}`;
        if (this.tools.has(key)) {
            throw new Error(`Duplicate server tool: ${key}`);
        }
        this.tools.set(key, tool);
    }

    public get(key: string): ServerTool | undefined {
        return this.tools.get(key);
    }

    public entries(): IterableIterator<[string, ServerTool]> {
        return this.tools.entries();
    }

    public values(): IterableIterator<ServerTool> {
        return this.tools.values();
    }

    public get size(): number {
        return this.tools.size;
    }
}

/**
 * globalServerToolRegistry: The singleton server tool registry.
 */
export const globalServerToolRegistry = new ServerToolRegistry();

// ─── Server Context ──────────────────────────────────────────────────────────

/**
 * IMatchService: Interface for the server's match lifecycle manager.
 * The server tool implementations depend on this to access live ECS state.
 */
export interface IMatchService {
    getMatch(matchId: string): IMatchHandle;
    listMatches(): IMatchHandle[];
    createMatch(scenarioId: string, name: string): Promise<IMatchHandle>;
    deleteMatch(matchId: string): boolean;
}

/**
 * IMatchHandle: A reference to a live, in-memory simulation match.
 * Tools use this to access the ECS world and command dispatcher.
 */
export interface IMatchHandle {
    readonly id: string;
    readonly name: string;
    readonly scenarioId: string;
    readonly isPaused: boolean;
    readonly currentTick: number;
    readonly timeCompression: number;
}

/**
 * IServerApp: The application context available to all server tool handlers.
 */
export interface IServerApp {
    readonly matchService: IMatchService;
}

/**
 * ToolContext: The runtime context passed to every tool handler.
 */
export interface ToolContext {
    readonly app: IServerApp;
}

// ─── Server Tool Definition ──────────────────────────────────────────────────

/**
 * ServerTool: Combines a shared contract with a server-side handler implementation.
 * The handler receives validated input and a ToolContext, and returns typed output.
 */
export interface ServerTool<
    TInput extends z.ZodTypeAny = z.ZodTypeAny,
    TOutput extends z.ZodTypeAny = z.ZodTypeAny
> {
    /** The shared contract (input/output schemas + REST metadata) */
    readonly contract: ToolContract<TInput, TOutput>;
    /** The server-side implementation */
    readonly call: (input: z.infer<TInput>, ctx: ToolContext) => Promise<z.infer<TOutput>>;
}

/**
 * defineTool: Type-safe factory for creating server tool implementations.
 * Ensures the handler signature matches the contract's schemas.
 * Automatically registers the tool in the globalServerToolRegistry.
 */
export function defineTool<
    TInput extends z.ZodTypeAny,
    TOutput extends z.ZodTypeAny
>(
    contract: ToolContract<TInput, TOutput>,
    handler: (input: z.infer<TInput>, ctx: ToolContext) => Promise<z.infer<TOutput>>
): ServerTool<TInput, TOutput> {
    const tool = { contract, call: handler };
    globalServerToolRegistry.register(tool);
    return tool;
}

