import { z } from 'zod';

// ─── HTTP Method Types ───────────────────────────────────────────────────────

/**
 * HttpMethod: Supported REST methods for tool contracts.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// ─── REST Route Metadata ─────────────────────────────────────────────────────

/**
 * RestMeta: Describes how a tool maps to a REST endpoint.
 */
export interface RestMeta {
    /** HTTP method */
    readonly method: HttpMethod;
    /** URL path pattern with :param placeholders */
    readonly path: string;
    /** Whether this tool returns an event stream (SSE) */
    readonly isStream?: boolean;
}

// ─── Tool Contract ───────────────────────────────────────────────────────────

/**
 * ToolContract: The shared, declarative interface that defines a single tool.
 * This is the source of truth consumed by:
 *   - Server (auto-route registration)
 *   - SDK (generated client methods)
 *   - AI Agents (MCP/LLM tool definitions)
 *
 * TInput and TOutput are Zod schemas that define the tool's interface.
 */
export interface ToolContract<
    TInput extends z.ZodTypeAny = z.ZodTypeAny,
    TOutput extends z.ZodTypeAny = z.ZodTypeAny
> {
    /** Domain namespace, e.g. 'match', 'entity', 'combat' */
    readonly domain: string;
    /** Action name, e.g. 'list', 'get', 'fire' */
    readonly action: string;
    /** Human-readable description for docs and AI agents */
    readonly description: string;
    /** Zod schema for validated input */
    readonly inputSchema: TInput;
    /** Zod schema for validated output */
    readonly outputSchema: TOutput;
    /** REST endpoint mapping */
    readonly rest: RestMeta;
}

/**
 * defineContract: Type-safe factory for creating tool contracts.
 * Ensures all contracts are structurally identical and inferred correctly.
 * Automatically registers the contract in the globalContractRegistry.
 */
export function defineContract<
    TInput extends z.ZodTypeAny,
    TOutput extends z.ZodTypeAny,
    TContract extends ToolContract<TInput, TOutput>
>(contract: TContract): TContract {
    globalContractRegistry.register(contract);
    return contract;
}

// ─── Tool Key Generation ─────────────────────────────────────────────────────

/**
 * toolKey: Generates a canonical tool key from domain and action.
 * Convention: domain_action (e.g., 'match_list', 'combat_fire')
 */
export function toolKey(contract: ToolContract): string {
    return `${contract.domain}_${contract.action}`;
}

// ─── Contract Registry ───────────────────────────────────────────────────────

/**
 * ContractRegistry: A typed map of all registered tool contracts.
 * The server iterates this to auto-generate Fastify routes.
 * The SDK generator reads this to produce the client class.
 */
export class ContractRegistry {
    private readonly contracts = new Map<string, ToolContract>();

    public register(contract: ToolContract): void {
        const key = toolKey(contract);
        if (this.contracts.has(key)) {
            return;
        }
        this.contracts.set(key, contract);
    }

    public get(key: string): ToolContract | undefined {
        return this.contracts.get(key);
    }

    public entries(): IterableIterator<[string, ToolContract]> {
        return this.contracts.entries();
    }

    public values(): IterableIterator<ToolContract> {
        return this.contracts.values();
    }

    public get size(): number {
        return this.contracts.size;
    }
}

/**
 * globalContractRegistry: The singleton contract registry.
 * All contract modules register themselves here on import.
 */
export const globalContractRegistry = new ContractRegistry();
