import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sim_get_stream } from '../../../../server_v2/tools/sim/sim_get_stream.js';
import { sim_get } from '../../../../server_v2/tools/sim/sim_get.js';
import { sim_step } from '../../../../server_v2/tools/sim/sim_step.js';
import { sim_update } from '../../../../server_v2/tools/sim/sim_update.js';
import { SimulationEvent } from '../../../../engine/core/Types.js';
import { createMockMatchHandle, createMockMatchService, createMockContext } from '../../utils/mock_factory.js';

// Mock the MatchService module to override isMatchHandle
vi.mock('../../../../server_v2/services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true) // Always return true for mocks in these tests
    };
});

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

    describe('sim_get', () => {
        it('should return current simulation status', async () => {
            const mockMatch = createMockMatchHandle({ id: 'm1', timeCompression: 4 });
            (mockMatch.world as any).currentTick = 500;
            
            const matchService = createMockMatchService([mockMatch]);
            const ctx = createMockContext(matchService);

            const result = await sim_get.call({ matchId: 'm1' }, ctx);

            expect(result.tick).toBe(500);
            expect(result.timeCompression).toBe(4);
        });
    });

    describe('sim_step', () => {
        it('should execute simulation steps', async () => {
            const mockMatch = createMockMatchHandle({ id: 'm1' });
            
            const matchService = createMockMatchService([mockMatch]);
            const ctx = createMockContext(matchService);

            const result = await sim_step.call({ matchId: 'm1', ticks: 10 }, ctx);

            expect(result.tick).toBeDefined();
            expect((mockMatch.world as any).tick).toHaveBeenCalled();
        });
    });

    describe('sim_update', () => {
        it('should update simulation parameters', async () => {
            const mockMatch = createMockMatchHandle({ id: 'm1' });
            const matchService = createMockMatchService([mockMatch]);
            const ctx = createMockContext(matchService);

            const result = await sim_update.call({
                matchId: 'm1',
                timeCompression: 10,
                isPaused: true
            }, ctx);

            expect(result.timeCompression).toBe(10);
            expect(result.isPaused).toBe(true);
        });
    });
});
