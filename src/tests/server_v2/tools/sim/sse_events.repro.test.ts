import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sim_get_stream } from '../../../../server_v2/tools/sim/sim_get_stream.js';
import { SimulationEvent, Side } from '../../../../engine/core/Types.js';
import { createMockMatchHandle, createMockMatchService, createMockContext } from '../../utils/mock_factory.js';
import { World } from '../../../../engine/core/World.js';
import { Entity } from '../../../../engine/core/Entity.js';
import { AddDetectionCommand } from '../../../../engine/core/Command.js';

describe('SSE Event Stream Reproduction', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('SHOULD receive EntitySpawned event when an entity is added (PROVES BUG: Current world.addEntity does not emit)', async () => {
        // We need a real World to test event emission, or a very good mock.
        // Let's use a real World but mock the dependencies if needed.
        const world = new World();
        const mockMatch = createMockMatchHandle({ id: 'm1' });
        (mockMatch.world as any) = world; // Inject real world into mock handle

        const matchService = createMockMatchService([mockMatch]);
        const ac = new AbortController();
        const ctx = {
            ...createMockContext(matchService),
            signal: ac.signal
        };

        const stream = sim_get_stream.call({ matchId: 'm1' }, ctx);
        
        const receivedEvents: SimulationEvent[] = [];
        const consumePromise = (async () => {
            for await (const event of stream) {
                receivedEvents.push(event);
                // In a perfect world, we'd get EntitySpawned.
                // For this reproduction, we'll stop after 1 event or a timeout.
                if (receivedEvents.length >= 1) break;
            }
        })();

        // Give generator time to subscribe
        await new Promise(resolve => setTimeout(resolve, 10));

        // Trigger the action
        const entity = new Entity('test-e1', Side.Blue);
        world.addEntity(entity);

        // We'll also emit a TickCompleted just to make sure the stream is actually working
        // and that we can eventually exit the loop if EntitySpawned is missing.
        world.events.emit({ type: 'TickCompleted', tick: 1, data: {} } as any);

        await consumePromise;
        ac.abort();

        // EXPECTATION: The first event should be EntitySpawned.
        // ACTUAL (BUG): It will likely be TickCompleted because EntitySpawned is never emitted.
        const hasSpawnedEvent = receivedEvents.some(e => e.type === 'EntitySpawned');
        expect(hasSpawnedEvent, 'Stream should contain EntitySpawned event after world.addEntity').toBe(true);
    });

    it('SHOULD receive Detection event when AddDetectionCommand is executed (PROVES BUG: Current handler does not emit)', async () => {
        const world = new World();
        const mockMatch = createMockMatchHandle({ id: 'm1' });
        (mockMatch.world as any) = world;

        const matchService = createMockMatchService([mockMatch]);
        const ac = new AbortController();
        const ctx = {
            ...createMockContext(matchService),
            signal: ac.signal
        };

        const stream = sim_get_stream.call({ matchId: 'm1' }, ctx);
        
        const receivedEvents: SimulationEvent[] = [];
        const consumePromise = (async () => {
            for await (const event of stream) {
                receivedEvents.push(event);
                if (receivedEvents.length >= 1) break;
            }
        })();

        await new Promise(resolve => setTimeout(resolve, 10));

        // Add observer entity
        const observer = new Entity('obs', Side.Blue);
        world.addEntity(observer);

        // Execute AddDetectionCommand
        const cmd = new AddDetectionCommand('obs', 'target-1');
        world.resolveCommands([cmd]);

        // Emit TickCompleted to ensure we don't hang if Detection is missing
        world.events.emit({ type: 'TickCompleted', tick: 1, data: {} } as any);

        await consumePromise;
        ac.abort();

        const hasDetectionEvent = receivedEvents.some(e => e.type === 'Detection');
        expect(hasDetectionEvent, 'Stream should contain Detection event after AddDetectionCommand').toBe(true);
    });
});
