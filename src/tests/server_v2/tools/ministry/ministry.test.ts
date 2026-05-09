import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ministry_get_evaluation } from '../../../../server_v2/tools/ministry/ministry_get_evaluation.js';
import { createMockMatchHandle, createMockMatchService, createMockContext, createMockEntity } from '../../utils/mock_factory.js';
import { MissionSystem } from '../../../../engine/systems/MissionSystem.js';
import { MissionComponent, MissionType } from '../../../../engine/components/Missions.js';

// Mock MatchService
vi.mock('../../../../server_v2/services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Ministry Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('ministry_get_evaluation', () => {
        it('should return DesiredState from AI Ministry', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1', 'Blue');
            const mission = new MissionComponent({ missionType: MissionType.Patrol });
            entity.getComponent = vi.fn((ctor: any) => ctor.name === 'MissionComponent' ? mission : null);
            
            const missionSystem = {
                evaluateMinistry: vi.fn(() => ({
                    objectiveId: 'Patrol-Alpha',
                    targetPosition: { x: 1000, y: 1000, z: 5000 },
                    resourceNeeds: { 'f-16': 2 }
                }))
            };
            (handle as any).world.getSystem = vi.fn(() => missionSystem);
            (handle as any).world.getEntities = vi.fn(() => [entity]);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await ministry_get_evaluation.call({ matchId: handle.id, side: 'Blue' }, ctx);

            expect(result.objectiveId).toBe('Patrol-Alpha');
            expect(result.resourceNeeds).toContain('f-16');
        });
    });
});
