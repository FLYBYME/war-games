import { defineTool } from '../../core/tool_builder.js';
import { simGetStreamContract } from '../../../sdk_v2/contracts/sim/sim.contracts.js';
import { SimulationEvent } from '../../../engine/core/Types.js';

/**
 * sim_get_stream: SSE streaming implementation for real-time simulation events.
 * Listens to the World's event bus and yields chunks to the Fastify route.
 */
export const sim_get_stream = defineTool(simGetStreamContract, async function* (input, ctx) {
    const match = ctx.app.matchService.getMatch(input.matchId);
    console.log(`[sim_get_stream] Streaming world ${input.matchId}`);

    const queue: SimulationEvent[] = [];
    let wakeUp: (() => void) | null = null;

    const handler = (event: SimulationEvent) => {
        queue.push(event);
        if (wakeUp) {
            wakeUp();
            wakeUp = null;
        }
    };

    match.world.events.onAny(handler);

    try {
        while (!ctx.signal?.aborted) {
            // 1. Drain everything currently in the queue
            while (queue.length > 0) {
                yield queue.shift()!;
            }

            // 2. Wait for the next event ONLY if the queue is empty
            if (queue.length === 0 && !ctx.signal?.aborted) {
                await new Promise<void>((resolve) => {
                    // Check again inside the promise to catch events that arrived 
                    // during the microtask tick before this promise was created.
                    if (queue.length > 0 || ctx.signal?.aborted) {
                        resolve();
                    } else {
                        wakeUp = resolve;
                    }
                });
            }
        }
    } finally {
        match.world.events.offAny(handler);
        wakeUp = null;
    }
});
