import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sim_get_stream } from '../../../../server_v2/tools/sim/sim_get_stream.js';
import { createMockMatchHandle, createMockMatchService, createMockContext } from '../../utils/mock_factory.js';
import { SimulationEvent } from '../../../../engine/core/Types.js';

describe('Sim Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('sim_get_stream', () => {
        it('should stream simulation events from the event bus', async () => {
            const mockMatch = createMockMatchHandle({ id: 'm1' });
            
            // Setup mock event bus
            let capturedHandler: ((event: SimulationEvent) => void) | null = null;
            (mockMatch.world.events as any) = {
                onAny: vi.fn((handler) => { capturedHandler = handler; }),
                offAny: vi.fn()
            };

            const matchService = createMockMatchService([mockMatch]);
            
            // Mock AbortController to end the stream
            const ac = new AbortController();
            const ctx = {
                ...createMockContext(matchService),
                signal: ac.signal
            };

            const stream = sim_get_stream.call({ matchId: 'm1' }, ctx);
            
            // Start consuming the stream
            const events: SimulationEvent[] = [];
            const consumePromise = (async () => {
                for await (const event of stream) {
                    events.push(event);
                    if (events.length === 2) ac.abort(); // Stop after 2 events
                }
            })();

            // Simulate events firing in the engine
            expect(capturedHandler).toBeDefined();
            
            capturedHandler!({ type: 'TickCompleted', tick: 1, data: {} } as any);
            capturedHandler!({ type: 'WeaponFired', tick: 2, data: {} } as any);

            await consumePromise;

            expect(events).toHaveLength(2);
            expect(events[0].type).toBe('TickCompleted');
            expect(events[1].type).toBe('WeaponFired');
            expect(mockMatch.world.events.offAny).toHaveBeenCalled();
        });

        it('should unsubscribe on abort', async () => {
            const mockMatch = createMockMatchHandle({ id: 'm1' });
            (mockMatch.world.events as any) = {
                onAny: vi.fn(),
                offAny: vi.fn()
            };

            const matchService = createMockMatchService([mockMatch]);
            const ac = new AbortController();
            const ctx = {
                ...createMockContext(matchService),
                signal: ac.signal
            };

            const stream = sim_get_stream.call({ matchId: 'm1' }, ctx);
            
            // Abort immediately
            ac.abort();

            const events = [];
            for await (const event of stream) {
                events.push(event);
            }

            expect(events).toHaveLength(0);
            expect(mockMatch.world.events.offAny).toHaveBeenCalled();
        });
    });
});
