import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mission_list } from '../../../../server_v2/tools/mission/mission_list.js';
import { mission_create } from '../../../../server_v2/tools/mission/mission_create.js';
import { mission_get_tasks } from '../../../../server_v2/tools/mission/mission_get_tasks.js';
import { createMockMatchHandle, createMockMatchService, createMockContext, createMockEntity } from '../../utils/mock_factory.js';
import { MissionComponent, MissionType, MissionStatus } from '../../../../engine/components/Missions.js';
import { TaskGraphComponent } from '../../../../engine/components/TaskGraph.js';
import { TaskGraphManager, TaskType, TaskStatus } from '../../../../engine/core/TaskGraph.js';
import { SetMissionCommand } from '../../../../engine/core/Command.js';

// Mock MatchService
vi.mock('../../../../server_v2/services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Mission Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('mission_list', () => {
        it('should return a list of missions for an entity', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            const mission = new MissionComponent({
                missionType: MissionType.Patrol,
                status: MissionStatus.Active,
                params: { center: { x: 0, y: 0, z: 0 }, radiusM: 1000, points: 4, altitudeM: 5000, speedKts: 450 }
            });
            
            entity.getComponent = vi.fn((ctor: any) => ctor.name === 'MissionComponent' ? mission : null);
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await mission_list.call({ matchId: handle.id, entityId: 'e1' }, ctx);

            expect(result.missions).toHaveLength(1);
            expect(result.missions[0].type).toBe(MissionType.Patrol);
        });
    });

    describe('mission_create', () => {
        it('should queue SetMissionCommand', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            (handle as any).world.getEntity = vi.fn(() => entity);
            (handle as any).world.queueExternalCommand = vi.fn();

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await mission_create.call({
                matchId: handle.id,
                entityId: 'e1',
                missionType: MissionType.Patrol,
                params: { center: { x: 0, y: 0, z: 0 }, radiusM: 5000, points: 4, altitudeM: 10000, speedKts: 500 } as any
            }, ctx);

            expect(result.type).toBe(MissionType.Patrol);
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(SetMissionCommand));
        });
    });

    describe('mission_get_tasks', () => {
        it('should return a list of tasks from the task graph', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            const taskComp = new TaskGraphComponent();
            TaskGraphManager.addNode(taskComp.graph, {
                id: 't1',
                task: { type: TaskType.Navigate, payload: { position: { x: 100, y: 100, z: 0 } } },
                dependencies: [],
                status: TaskStatus.Active
            });

            entity.getComponent = vi.fn((ctor: any) => ctor.name === 'TaskGraphComponent' ? taskComp : null);
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await mission_get_tasks.call({ matchId: handle.id, entityId: 'e1' }, ctx);

            expect(result.tasks).toHaveLength(1);
            expect(result.tasks[0].id).toBe('t1');
            expect(result.tasks[0].type).toBe(TaskType.Navigate);
        });
    });
});
