import { defineTool } from '../../core/tool_builder.js';
import { simGetStreamContract } from '../../../sdk_v2/contracts/sim/sim.contracts.js';
import { SimulationEvent } from '../../../engine/core/Types.js';

/**
 * sim_get_stream: SSE streaming implementation for real-time simulation events.
 * Listens to the World's event bus and yields chunks to the Fastify route.
 */
export const sim_get_stream = defineTool(simGetStreamContract, async function* (input, ctx) {
    const match = ctx.app.matchService.getMatch(input.matchId);
    
    const queue: SimulationEvent[] = [];
    let resolver: (() => void) | null = null;

    const handler = (event: SimulationEvent) => {
        queue.push(event);
        if (resolver) {
            resolver();
            resolver = null;
        }
    };

    match.world.events.onAny(handler);

    const abortHandler = () => {
        if (resolver) {
            resolver();
            resolver = null;
        }
    };
    ctx.signal?.addEventListener('abort', abortHandler);

    try {
        while (!ctx.signal?.aborted) {
            // Drain the queue first
            while (queue.length > 0) {
                yield queue.shift()!;
            }

            // Wait for the next batch of events or an abort
            if (!ctx.signal?.aborted) {
                await new Promise<void>((resolve) => {
                    resolver = resolve;
                });
            }
        }
    } finally {
        match.world.events.offAny(handler);
        ctx.signal?.removeEventListener('abort', abortHandler);
    }
});
