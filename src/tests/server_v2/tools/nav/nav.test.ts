import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nav_get } from '../../../../server_v2/tools/nav/nav_get.js';
import { nav_update } from '../../../../server_v2/tools/nav/nav_update.js';
import { nav_add_waypoint } from '../../../../server_v2/tools/nav/nav_add_waypoint.js';
import { nav_clear_waypoints } from '../../../../server_v2/tools/nav/nav_clear_waypoints.js';
import { nav_join_formation } from '../../../../server_v2/tools/nav/nav_join_formation.js';
import { nav_break_formation } from '../../../../server_v2/tools/nav/nav_break_formation.js';
import { createMockMatchHandle, createMockMatchService, createMockContext, createMockEntity } from '../../utils/mock_factory.js';
import { NavigationComponent, FormationComponent, NavState } from '../../../../engine/components/Navigation.js';
import { SetSpeedCommand, SetHeadingCommand, SetAltitudeCommand, AddWaypointCommand, ClearWaypointsCommand, JoinFormationCommand, BreakFormationCommand } from '../../../../engine/core/Command.js';

// Mock MatchService
vi.mock('../../../../server_v2/services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Navigation Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('nav_get', () => {
        it('should return navigation and formation state', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            const nav = new NavigationComponent(NavState.Waypoint, [{ position: { x: 100, y: 100, z: 0 }, speedKts: 500 }]);
            nav.desiredSpeedKts = 500;
            nav.desiredAltitudeM = 5000;
            nav.desiredHeadingDeg = 90;
            
            const form = new FormationComponent('leader-1', { x: -100, y: 0, z: 0 });
            
            entity.getComponent = vi.fn((ctor: any) => {
                if (ctor.name === 'NavigationComponent') return nav;
                if (ctor.name === 'FormationComponent') return form;
                return null;
            });
            
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await nav_get.call({ matchId: handle.id, entityId: 'e1' }, ctx);

            expect(result.entityId).toBe('e1');
            expect(result.desiredSpeedKts).toBe(500);
            expect(result.autopilotMode).toBe(NavState.Waypoint);
            expect(result.waypoints).toHaveLength(1);
            expect(result.formationLeaderId).toBe('leader-1');
        });
    });

    describe('nav_update', () => {
        it('should queue external commands and return state', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            (handle as any).world.getEntity = vi.fn(() => entity);
            (handle as any).world.queueExternalCommand = vi.fn();

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await nav_update.call({
                matchId: handle.id,
                entityId: 'e1',
                desiredSpeedKts: 600,
                desiredHeading: 180
            }, ctx);

            expect(result.entityId).toBe('e1');
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledTimes(2);
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(SetSpeedCommand));
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(SetHeadingCommand));
        });
    });

    describe('nav_add_waypoint', () => {
        it('should queue AddWaypointCommand', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            (handle as any).world.getEntity = vi.fn(() => entity);
            (handle as any).world.queueExternalCommand = vi.fn();

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await nav_add_waypoint.call({
                matchId: handle.id,
                entityId: 'e1',
                position: { x: 5000, y: 5000, z: 1000 },
                speedKts: 400
            }, ctx);

            expect(result.waypoints).toHaveLength(1);
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(AddWaypointCommand));
        });
    });

    describe('nav_clear_waypoints', () => {
        it('should queue ClearWaypointsCommand', async () => {
            const handle = createMockMatchHandle();
            (handle as any).world.queueExternalCommand = vi.fn();

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await nav_clear_waypoints.call({
                matchId: handle.id,
                entityId: 'e1'
            }, ctx);

            expect(result.success).toBe(true);
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(ClearWaypointsCommand));
        });
    });

    describe('nav_join_formation', () => {
        it('should queue JoinFormationCommand', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            (handle as any).world.getEntity = vi.fn(() => entity);
            (handle as any).world.queueExternalCommand = vi.fn();

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await nav_join_formation.call({
                matchId: handle.id,
                entityId: 'e1',
                leaderId: 'leader-1',
                offset: { x: -100, y: 0, z: 0 }
            }, ctx);

            expect(result.formationLeaderId).toBe('leader-1');
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(JoinFormationCommand));
        });
    });

    describe('nav_break_formation', () => {
        it('should queue BreakFormationCommand', async () => {
            const handle = createMockMatchHandle();
            (handle as any).world.queueExternalCommand = vi.fn();

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await nav_break_formation.call({
                matchId: handle.id,
                entityId: 'e1'
            }, ctx);

            expect(result.success).toBe(true);
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(BreakFormationCommand));
        });
    });
});
