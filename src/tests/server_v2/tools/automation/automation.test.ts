import { describe, it, expect, vi, beforeEach } from 'vitest';
import { automation_list_events } from '../../../../server_v2/tools/automation/automation_list_events.js';
import { automation_trigger_event } from '../../../../server_v2/tools/automation/automation_trigger_event.js';
import { createMockMatchHandle, createMockMatchService, createMockContext } from '../../utils/mock_factory.js';
import { ScenarioAutomationSystem } from '../../../../engine/systems/ScenarioAutomationSystem.js';

// Mock MatchService
vi.mock('../../../../server_v2/services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Automation Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('automation_list_events', () => {
        it('should list pending and triggered scenario events', async () => {
            const handle = createMockMatchHandle();
            const autoSystem = {
                events: [{ id: 'e1', description: 'Pending Event', tick: 100 }],
                triggeredEvents: [{ id: 'e2', description: 'Done Event', tick: 50 }]
            };
            (handle as any).world.getSystem = vi.fn(() => autoSystem);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await automation_list_events.call({ matchId: handle.id }, ctx);

            expect(result.events).toHaveLength(2);
            expect(result.events[0].status).toBe('Pending');
            expect(result.events[1].status).toBe('Triggered');
        });
    });

    describe('automation_trigger_event', () => {
        it('should force a pending event into the triggered queue', async () => {
            const handle = createMockMatchHandle();
            const event = { id: 'e1', description: 'Pending' };
            const autoSystem = {
                events: [event],
                triggeredEvents: [] as any[]
            };
            (handle as any).world.getSystem = vi.fn(() => autoSystem);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await automation_trigger_event.call({
                matchId: handle.id,
                eventId: 'e1'
            }, ctx);

            expect(result.success).toBe(true);
            expect(autoSystem.events).toHaveLength(0);
            expect(autoSystem.triggeredEvents).toHaveLength(1);
        });
    });
});
