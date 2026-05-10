import { defineTool } from '../../core/tool_builder.js';
import { simGetStreamContract } from '../../../sdk_v2/contracts/sim/sim.contracts.js';
import { SimulationEvent } from '../../../engine/core/Types.js';

/**
 * sim_get_stream: SSE streaming implementation for real-time simulation events.
 * Listens to the World's event bus and yields chunks to the Fastify route.
 */
export const sim_get_stream = defineTool(simGetStreamContract, async function* (input, ctx) {
    const match = ctx.app.matchService.getMatch(input.matchId);
    
    // Internal queue to buffer events between yields
    const queue: SimulationEvent[] = [];
    let resolveNext: ((value: void) => void) | null = null;

    // Event listener to push data into our queue
    const handler = (event: SimulationEvent) => {
        queue.push(event);
        if (resolveNext) {
            resolveNext();
            resolveNext = null;
        }
    };

    // Subscribe to all world events
    match.world.events.onAny(handler);

    try {
        // Continue yielding as long as the connection is open
        while (!ctx.signal?.aborted) {
            // If no events are buffered, wait for the next one
            if (queue.length === 0) {
                await new Promise<void>((resolve) => {
                    resolveNext = resolve;
                    // Ensure we wake up if the connection is aborted while waiting
                    ctx.signal?.addEventListener('abort', () => resolve());
                });
            }

            // Check again if we were woken up by an abort
            if (ctx.signal?.aborted) break;

            // Drain the queue and yield each event
            while (queue.length > 0) {
                const event = queue.shift()!;
                yield event;
            }
        }
    } finally {
        // Absolute cleanup: Unsubscribe when the generator finishes or is aborted
        match.world.events.offAny(handler);
    }
});
