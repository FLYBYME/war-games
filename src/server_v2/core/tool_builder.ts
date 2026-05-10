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

import { IWorldView } from '../../engine/core/ISystem.js';

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
    readonly world: IWorldView;
}

import { TerrainService } from '../services/TerrainService.js';
import { WorkerService } from '../services/WorkerService.js';
import { AgentService } from '../services/AgentService.js';

/**
 * IServerApp: The application context available to all server tool handlers.
 */
export interface IServerApp {
    readonly matchService: IMatchService;
    readonly terrainService: TerrainService;
    readonly workerService: WorkerService;
    readonly agentService: AgentService;
    readonly log: any;
}

/**
 * ToolContext: The runtime context passed to every tool handler.
 */
export interface ToolContext {
    readonly app: IServerApp;
    readonly signal?: AbortSignal;
}

// ─── Server Tool Definition ──────────────────────────────────────────────────

/**
 * ServerTool: Combines a shared contract with a server-side handler implementation.
 * The base type uses a union for the call return type.
 */
export interface ServerTool<
    TInput extends z.ZodTypeAny = z.ZodTypeAny,
    TOutput extends z.ZodTypeAny = z.ZodTypeAny
> {
    /** The shared contract (input/output schemas + REST metadata) */
    readonly contract: ToolContract<TInput, TOutput>;
    /** The server-side implementation */
    readonly call: (
        input: z.infer<TInput>, 
        ctx: ToolContext
    ) => Promise<z.infer<TOutput>> | AsyncIterable<z.infer<TOutput>>;
}

/**
 * StandardServerTool: A tool that returns a single Promise result.
 */
export interface StandardServerTool<
    TInput extends z.ZodTypeAny = z.ZodTypeAny,
    TOutput extends z.ZodTypeAny = z.ZodTypeAny
> extends ServerTool<TInput, TOutput> {
    readonly call: (input: z.infer<TInput>, ctx: ToolContext) => Promise<z.infer<TOutput>>;
}

/**
 * StreamingServerTool: A tool that returns an AsyncIterable (SSE).
 */
export interface StreamingServerTool<
    TInput extends z.ZodTypeAny = z.ZodTypeAny,
    TOutput extends z.ZodTypeAny = z.ZodTypeAny
> extends ServerTool<TInput, TOutput> {
    readonly call: (input: z.infer<TInput>, ctx: ToolContext) => AsyncIterable<z.infer<TOutput>>;
}

/**
 * defineTool: Type-safe factory for creating server tool implementations.
 * Overloaded to return either a StandardServerTool or a StreamingServerTool
 * based on the contract's isStream flag.
 */
export function defineTool<
    TInput extends z.ZodTypeAny,
    TOutput extends z.ZodTypeAny,
    TContract extends ToolContract<TInput, TOutput>
>(
    contract: TContract,
    handler: (
        input: z.infer<TInput>, 
        ctx: ToolContext
    ) => TContract['rest'] extends { isStream: true } 
        ? AsyncIterable<z.infer<TOutput>> 
        : Promise<z.infer<TOutput>>
): TContract['rest'] extends { isStream: true } 
    ? StreamingServerTool<TInput, TOutput> 
    : StandardServerTool<TInput, TOutput>;

export function defineTool(contract: any, handler: any): any {
    const tool = { contract, call: handler };
    globalServerToolRegistry.register(tool);
    return tool;
}

