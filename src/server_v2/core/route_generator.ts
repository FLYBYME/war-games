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
    readonly isStream?: boolean;
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
            outputSchema: contract.outputSchema,
            isStream: contract.rest.isStream
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
    readonly signal?: AbortSignal;
}

function getTypeName(schema: z.ZodTypeAny): string {
    return (schema._def as any).typeName;
}

/**
 * createHandler: Creates a Fastify-compatible handler function for a server tool.
 * Merges URL params, query, and body into a single input object,
 * applies type coercion for strings (from URL/query),
 * validates it against the contract's schema, and invokes the tool handler.
 */
export function createHandler(
    tool: ServerTool,
    ctx: ToolContext
): (request: RequestParams) => Promise<z.infer<z.ZodTypeAny>> {
    return async (request: RequestParams) => {
        // 1. Merge all input sources into a flat object
        const rawInput: Record<string, any> = {
            ...request.params,
            ...request.query,
            ...request.body
        };

        // 2. Apply Type Coercion
        const inputSchema = tool.contract.inputSchema;
        const schemaTypeName = getTypeName(inputSchema);

        if (schemaTypeName === 'ZodObject') {
            const shape = (inputSchema as any).shape;
            for (const [key, value] of Object.entries(rawInput)) {
                if (typeof value !== 'string') continue;
                
                const fieldSchema = shape[key];
                if (!fieldSchema) continue;

                const unwrapped = unwrapZod(fieldSchema);
                const typeName = getTypeName(unwrapped);

                if (typeName === 'ZodNumber') {
                    const num = parseFloat(value);
                    if (!isNaN(num)) rawInput[key] = num;
                } else if (typeName === 'ZodBoolean') {
                    if (value === 'true' || value === '1') rawInput[key] = true;
                    else if (value === 'false' || value === '0') rawInput[key] = false;
                } else if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
                    try {
                        rawInput[key] = JSON.parse(value);
                    } catch {
                        // Ignore parse errors, let Zod handle validation
                    }
                }
            }
        }

        // 3. Validate against the contract's input schema
        const validatedInput = tool.contract.inputSchema.parse(rawInput);

        // 4. Create tool-specific context with signal
        const toolCtx: ToolContext = {
            ...ctx,
            signal: request.signal
        };

        // 5. Execute the tool handler
        const result = await tool.call(validatedInput, toolCtx);

        // 6. Validate output (development-time safety net)
        // If it's a stream, we return the AsyncIterable without top-level Zod parsing.
        if (tool.contract.rest.isStream) {
            return result;
        }

        return tool.contract.outputSchema.parse(result);
    };
}

/**
 * unwrapZod: Recursively unwraps optional/nullable/default Zod types 
 * to find the underlying primitive schema.
 */
function unwrapZod(schema: z.ZodTypeAny): z.ZodTypeAny {
    let current = schema;
    while (true) {
        const typeName = getTypeName(current);
        if (typeName === 'ZodOptional' || typeName === 'ZodNullable' || typeName === 'ZodDefault') {
            current = (current._def as any).innerType;
        } else if (typeName === 'ZodEffects') {
            current = (current._def as any).schema;
        } else {
            break;
        }
    }
    return current;
}
