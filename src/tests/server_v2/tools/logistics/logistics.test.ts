import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logistics_get } from '../../../../server_v2/tools/logistics/logistics_get.js';
import { logistics_apply_damage } from '../../../../server_v2/tools/logistics/logistics_apply_damage.js';
import { logistics_transfer } from '../../../../server_v2/tools/logistics/logistics_transfer.js';
import { logistics_land } from '../../../../server_v2/tools/logistics/logistics_land.js';
import { logistics_launch } from '../../../../server_v2/tools/logistics/logistics_launch.js';
import { createMockMatchHandle, createMockMatchService, createMockContext, createMockEntity } from '../../utils/mock_factory.js';
import { FuelComponent } from '../../../../engine/components/Propulsion.js';
import { HealthComponent } from '../../../../engine/components/Health.js';
import { ApplyDamageCommand, TransferResourcesCommand, LandAtFacilityCommand, LaunchAircraftCommand } from '../../../../engine/core/Command.js';

// Mock MatchService
vi.mock('../../../../server_v2/services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Logistics Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('logistics_get', () => {
        it('should return logistics state', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            const fuel = new FuelComponent({ maxKg: 1000, currentKg: 800 });
            const health = new HealthComponent({ maxHp: 100, hp: 90 });
            
            entity.getComponent = vi.fn((ctor: any) => {
                if (ctor.name === 'FuelComponent') return fuel;
                if (ctor.name === 'HealthComponent') return health;
                return null;
            });
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await logistics_get.call({ matchId: handle.id, entityId: 'e1' }, ctx);

            expect(result.entityId).toBe('e1');
            expect(result.fuelCurrentKg).toBe(800);
            expect(result.hp).toBe(90);
        });
    });

    describe('logistics_apply_damage', () => {
        it('should queue ApplyDamageCommand', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            entity.addComponent(new HealthComponent({ hp: 100 }));
            (handle as any).world.getEntity = vi.fn(() => entity);
            (handle as any).world.queueExternalCommand = vi.fn();

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await logistics_apply_damage.call({
                matchId: handle.id,
                entityId: 'e1',
                damage: 30
            }, ctx);

            expect(result.newHp).toBe(70);
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(ApplyDamageCommand));
        });
    });

    describe('logistics_transfer', () => {
        it('should queue TransferResourcesCommand', async () => {
            const handle = createMockMatchHandle();
            (handle as any).world.queueExternalCommand = vi.fn();

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await logistics_transfer.call({
                matchId: handle.id,
                fromId: 'e1',
                toId: 'e2',
                fuelKg: 500
            }, ctx);

            expect(result.success).toBe(true);
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(TransferResourcesCommand));
        });
    });

    describe('logistics_land', () => {
        it('should queue LandAtFacilityCommand', async () => {
            const handle = createMockMatchHandle();
            (handle as any).world.queueExternalCommand = vi.fn();

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await logistics_land.call({
                matchId: handle.id,
                entityId: 'e1',
                facilityId: 'base-1'
            }, ctx);

            expect(result.success).toBe(true);
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(LandAtFacilityCommand));
        });
    });

    describe('logistics_launch', () => {
        it('should queue LaunchAircraftCommand', async () => {
            const handle = createMockMatchHandle();
            (handle as any).world.queueExternalCommand = vi.fn();

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await logistics_launch.call({
                matchId: handle.id,
                entityId: 'e1'
            }, ctx);

            expect(result.success).toBe(true);
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(LaunchAircraftCommand));
        });
    });
});
