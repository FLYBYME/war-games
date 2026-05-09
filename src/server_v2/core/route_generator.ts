import { z } from 'zod';
import type { ServerTool, ToolContext } from './tool_builder.js';
import type { HttpMethod } from '../../sdk_v2/contracts/core/tool_contract.js';

// ─── Route Metadata ──────────────────────────────────────────────────────────

/**
 * RouteConfig: The configuration generated for a single Fastify route.
 */
export interface RouteConfig {
    readonly method: HttpMethod;
    readonly url: string;
    readonly toolKey: string;
    readonly inputSchema: z.ZodTypeAny;
    readonly outputSchema: z.ZodTypeAny;
}

// ─── Route Generator ─────────────────────────────────────────────────────────

/**
 * generateRoutes: Iterates over all server tools and generates
 * Fastify-compatible route configurations.
 *
 * @param tools - An iterable of [key, ServerTool] pairs
 * @param apiPrefix - URL prefix (e.g., '/api/v2')
 * @returns Array of RouteConfig objects
 */
export function generateRoutes(
    tools: Iterable<[string, ServerTool]>,
    apiPrefix: string = '/api/v2'
): RouteConfig[] {
    const routes: RouteConfig[] = [];

    for (const [key, tool] of tools) {
        const contract = tool.contract;
        routes.push({
            method: contract.rest.method,
            url: `${apiPrefix}${contract.rest.path}`,
            toolKey: key,
            inputSchema: contract.inputSchema,
            outputSchema: contract.outputSchema
        });
    }

    return routes;
}

// ─── Request Handler Factory ─────────────────────────────────────────────────

/**
 * RequestParams: Extracted request parameters from the HTTP context.
 */
export interface RequestParams {
    readonly params: Record<string, string>;
    readonly query: Record<string, string>;
    readonly body: Record<string, string | number | boolean>;
}

/**
 * createHandler: Creates a Fastify-compatible handler function for a server tool.
 * Merges URL params, query, and body into a single input object,
 * validates it against the contract's schema, and invokes the tool handler.
 */
export function createHandler(
    tool: ServerTool,
    ctx: ToolContext
): (request: RequestParams) => Promise<z.infer<z.ZodTypeAny>> {
    return async (request: RequestParams) => {
        // 1. Merge all input sources into a flat object
        const rawInput = {
            ...request.params,
            ...request.query,
            ...request.body
        };

        // 2. Validate against the contract's input schema
        const validatedInput = tool.contract.inputSchema.parse(rawInput);

        // 3. Execute the tool handler
        const result = await tool.call(validatedInput, ctx);

        // 4. Validate output (development-time safety net)
        return tool.contract.outputSchema.parse(result);
    };
}
