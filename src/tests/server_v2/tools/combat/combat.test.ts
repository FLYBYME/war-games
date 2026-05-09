import { describe, it, expect, vi, beforeEach } from 'vitest';
import { combat_get } from '../../../../server_v2/tools/combat/combat_get.js';
import { combat_fire } from '../../../../server_v2/tools/combat/combat_fire.js';
import { combat_fire_salvo } from '../../../../server_v2/tools/combat/combat_fire_salvo.js';
import { combat_list_mounts } from '../../../../server_v2/tools/combat/combat_list_mounts.js';
import { combat_get_wra } from '../../../../server_v2/tools/combat/combat_get_wra.js';
import { combat_update_wra } from '../../../../server_v2/tools/combat/combat_update_wra.js';
import { combat_update_roe } from '../../../../server_v2/tools/combat/combat_update_roe.js';
import { createMockMatchHandle, createMockMatchService, createMockContext, createMockEntity } from '../../utils/mock_factory.js';
import { CombatComponent } from '../../../../engine/components/Combat.js';
import { DoctrineComponent } from '../../../../engine/components/Doctrine.js';
import { FireWeaponCommand, FireSalvoCommand, UpdateWRARulesCommand, SetROECommand } from '../../../../engine/core/Command.js';

// Mock MatchService
vi.mock('../../../../server_v2/services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Combat Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('combat_get', () => {
        it('should return combat state of an entity', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            const combat = new CombatComponent({
                mounts: [{
                    name: 'SAM Launcher',
                    magazineIndices: [0],
                    activeMagazineIndex: 0,
                    reloadTicks: 10,
                    lastFireTick: 0,
                    minAzimuth: -180,
                    maxAzimuth: 180,
                    minElevation: 0,
                    maxElevation: 90,
                    slewRate: 20,
                    currentAzimuth: 0,
                    currentElevation: 0
                }],
                magazines: [{
                    name: 'Main Mag',
                    weaponProfileId: 'sm-2',
                    capacity: 20,
                    currentCount: 15
                }]
            });
            const doctrine = new DoctrineComponent({ roe: 'Free' as any });
            
            entity.getComponent = vi.fn((ctor: any) => {
                if (ctor.name === 'CombatComponent') return combat;
                if (ctor.name === 'DoctrineComponent') return doctrine;
                return null;
            });
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await combat_get.call({ matchId: handle.id, entityId: 'e1' }, ctx);

            expect(result.entityId).toBe('e1');
            expect(result.mounts).toHaveLength(1);
            expect(result.mounts[0].weaponType).toBe('sm-2');
            expect(result.roe).toBe('Free');
        });
    });

    describe('combat_fire', () => {
        it('should queue FireWeaponCommand', async () => {
            const handle = createMockMatchHandle();
            (handle as any).world.queueExternalCommand = vi.fn();

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await combat_fire.call({
                matchId: handle.id,
                entityId: 'e1',
                mountIndex: 0,
                targetId: 't1'
            }, ctx);

            expect(result.success).toBe(true);
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(FireWeaponCommand));
        });
    });

    describe('combat_fire_salvo', () => {
        it('should queue FireSalvoCommand', async () => {
            const handle = createMockMatchHandle();
            (handle as any).world.queueExternalCommand = vi.fn();

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await combat_fire_salvo.call({
                matchId: handle.id,
                entityId: 'e1',
                mountIndex: 0,
                targetId: 't1',
                quantity: 4
            }, ctx);

            expect(result.success).toBe(true);
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(FireSalvoCommand));
        });
    });

    describe('combat_update_wra', () => {
        it('should queue UpdateWRARulesCommand', async () => {
            const handle = createMockMatchHandle();
            (handle as any).world.queueExternalCommand = vi.fn();

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await combat_update_wra.call({
                matchId: handle.id,
                entityId: 'e1',
                rules: [{
                    targetType: 'Aircraft',
                    weaponType: 'sm-2',
                    minRangeM: 5000,
                    maxRangePct: 80,
                    quantity: 2
                }]
            }, ctx);

            expect(result.rules).toHaveLength(1);
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(UpdateWRARulesCommand));
        });
    });

    describe('combat_update_roe', () => {
        it('should queue SetROECommand', async () => {
            const handle = createMockMatchHandle();
            (handle as any).world.queueExternalCommand = vi.fn();

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await combat_update_roe.call({
                matchId: handle.id,
                entityId: 'e1',
                roe: 'Hold'
            }, ctx);

            expect(result.roe).toBe('Hold');
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(SetROECommand));
        });
    });
});
