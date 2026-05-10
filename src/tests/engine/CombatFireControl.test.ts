import { describe, it, expect, vi, beforeEach } from 'vitest';
import { World } from '../../engine/core/World';
import { FireWeaponHandler, FireSalvoHandler } from '../../engine/core/handlers/CombatCommandHandlers';
import { FireWeaponCommand, FireSalvoCommand } from '../../engine/core/Command';
import { CombatComponent, Magazine, Mount } from '../../engine/components/Combat';
import { TransformComponent, KinematicsComponent } from '../../engine/components/Physics';
import { Entity } from '../../engine/core/Entity';
import { Side, GuidanceType, TrackStatus, IdentificationStatus } from '../../engine/core/Types';
import { DeterministicRandom } from '../../engine/math/DeterministicRandom';
import { FireControl } from '../../engine/math/FireControl';
import { WRAExecutorSystem } from '../../engine/systems/WRAExecutorSystem';
import { TrackComponent } from '../../engine/components/Track';
import { DoctrineComponent } from '../../engine/components/Doctrine';
import { GuidanceComponent } from '../../engine/components/Guidance';

describe('Combat & Fire Control Unit Tests (Tests 61-80)', () => {
    let world: World;
    let fireWeaponHandler: FireWeaponHandler;
    let fireSalvoHandler: FireSalvoHandler;

    beforeEach(() => {
        world = new World();
        // @ts-ignore
        world.random = new DeterministicRandom(1234);
        fireWeaponHandler = new FireWeaponHandler();
        fireSalvoHandler = new FireSalvoHandler();

        // Register basic weapon profiles
        world.weaponProfiles.register('aim-120', {
            id: 'aim-120',
            name: 'AIM-120 AMRAAM',
            type: 'Missile',
            maxRangeM: 100000,
            maxSpeedKts: 2200,
            cruiseSpeedKts: 1800,
            guidance: GuidanceType.Active,
            warheadType: 'BlastFrag' as any,
            warheadYieldKg: 20
        });

        world.weaponProfiles.register('76mm-shell', {
            id: '76mm-shell',
            name: '76mm Shell',
            type: 'Gun',
            maxRangeM: 15000,
            maxSpeedKts: 1800,
            cruiseSpeedKts: 1800,
            guidance: GuidanceType.Ballistic,
            burst: { 
                caliberMm: 76, 
                dispersionDeg: 0.1,
                muzzleVelocity: { x: 900, y: 0, z: 0 },
                roundsPerSecond: 1
            }
        });

        // Register entity profiles for projectiles
        world.profileRegistry.register('aim-120-projectile', {
            type: 'Weapon',
            kinematics: { massKg: 150, dragCoeff: 0.02, maxSpeedKts: 4000, cruiseSpeedKts: 2000 }
        });

        world.profileRegistry.register('76mm-shell-projectile', {
            type: 'Weapon',
            kinematics: { massKg: 6, dragCoeff: 0.1, maxSpeedKts: 2000, cruiseSpeedKts: 1800 }
        });
    });

    const setupShooter = (id: string, side: Side) => {
        const shooter = new Entity(id, side);
        shooter.addComponent(new TransformComponent({ position: { x: 0, y: 0, z: 0 } }));
        shooter.addComponent(new KinematicsComponent({ velocity: { x: 0, y: 0, z: 0 }, massKg: 10000, dragCoeff: 0.1, thrustN: 0 }));
        
        const magazine: Magazine = {
            name: 'VLS',
            weaponProfileId: 'aim-120',
            capacity: 10,
            currentCount: 10
        };

        const mount: Mount = {
            name: 'Mount 1',
            magazineIndices: [0],
            activeMagazineIndex: 0,
            reloadTicks: 10,
            lastFireTick: -100,
            minAzimuth: -180,
            maxAzimuth: 180,
            minElevation: -20,
            maxElevation: 90,
            currentAzimuth: 0,
            currentElevation: 0,
            slewRate: 45,
            alignmentThresholdDeg: 1.0
        };

        shooter.addComponent(new CombatComponent({ 
            mounts: [mount], 
            magazines: [magazine] 
        }));
        
        shooter.addComponent(new TrackComponent());
        
        world.addEntity(shooter);
        return shooter;
    };

    const setupTarget = (id: string, side: Side, pos: { x: number, y: number, z: number }) => {
        const target = new Entity(id, side);
        target.addComponent(new TransformComponent({ position: pos }));
        world.addEntity(target);
        return target;
    };

    it('should successfully fire weapon and check magazine capacity (Test 61, 64)', () => {
        const shooter = setupShooter('ship', Side.Blue);
        setupTarget('tgt', Side.Red, { x: 5000, y: 5000, z: 0 });
        
        const combat = shooter.getComponent(CombatComponent)!;
        expect(combat.magazines[0].currentCount).toBe(10);

        const cmd = new FireWeaponCommand('ship', 0, 'tgt');
        fireWeaponHandler.execute(cmd, world);

        expect(combat.magazines[0].currentCount).toBe(9); 
    });

    it('should fail to fire if magazine is empty (Test 62)', () => {
        const shooter = setupShooter('ship', Side.Blue);
        setupTarget('tgt', Side.Red, { x: 5000, y: 5000, z: 0 });
        
        const combat = shooter.getComponent(CombatComponent)!;
        combat.magazines[0].currentCount = 0;

        const cmd = new FireWeaponCommand('ship', 0, 'tgt');
        fireWeaponHandler.execute(cmd, world);

        expect(combat.magazines[0].currentCount).toBe(0);
    });

    it('should delay firing if mount is not aligned (Test 63)', () => {
        const shooter = setupShooter('ship', Side.Blue);
        setupTarget('tgt', Side.Red, { x: 10000, y: 0, z: 0 }); 
        
        const combat = shooter.getComponent(CombatComponent)!;
        const mount = combat.mounts[0];
        
        combat.magazines[0].weaponProfileId = '76mm-shell';
        mount.currentAzimuth = 0; 
        mount.slewRate = 10; 
 

        const cmd = new FireWeaponCommand('ship', 0, 'tgt');
        try {
            fireWeaponHandler.execute(cmd, world);
        } catch (e) {
            // Expected rejection due to misalignment
        }

        expect(combat.magazines[0].currentCount).toBe(10); 
        expect(mount.currentTargetId).toBe('tgt'); 
    });

    it('should fire immediately if it is a missile (VLS/Missile skip alignment) (Test 73)', () => {
        const shooter = setupShooter('ship', Side.Blue);
        setupTarget('tgt', Side.Red, { x: 10000, y: 0, z: 0 });
        
        const combat = shooter.getComponent(CombatComponent)!;
        combat.mounts[0].currentAzimuth = 0;

        const cmd = new FireWeaponCommand('ship', 0, 'tgt');
        fireWeaponHandler.execute(cmd, world);

        expect(combat.magazines[0].currentCount).toBe(9); 
    });

    it('should calculate correct lead angle in ballistic solution (Test 69, 70)', () => {
        const shooterPos = { x: 0, y: 0, z: 0 };
        const shooterVel = { x: 0, y: 0, z: 0 };
        const targetPos = { x: 1000, y: 1000, z: 0 }; 
        const targetVel = { x: 100, y: 0, z: 0 }; 
        const projectileSpeed = 500; 
        
        const solution = FireControl.calculateAdvancedBallisticSolution(
            shooterPos, shooterVel, targetPos, targetVel, projectileSpeed, 10, 0.05, 76, { x: 0, y: 0, z: 0 }, 1.225
        );

        expect(solution).toBeDefined();
        expect(solution!.azimuthDeg).toBeLessThan(45);
    });

    it('should account for wind deflection in ballistic solution (Test 71)', () => {
        const shooterPos = { x: 0, y: 0, z: 0 };
        const shooterVel = { x: 0, y: 0, z: 0 };
        const targetPos = { x: 0, y: 2000, z: 0 }; 
        const targetVel = { x: 0, y: 0, z: 0 };
        const projectileSpeed = 400;
        const windVel = { x: 50, y: 0, z: 0 }; 
        
        const solutionNoWind = FireControl.calculateAdvancedBallisticSolution(
            shooterPos, shooterVel, targetPos, targetVel, projectileSpeed, 10, 0.05, 76, { x: 0, y: 0, z: 0 }, 1.225
        );
        const solutionWind = FireControl.calculateAdvancedBallisticSolution(
            shooterPos, shooterVel, targetPos, targetVel, projectileSpeed, 10, 0.05, 76, windVel, 1.225
        );

        expect(solutionNoWind!.azimuthDeg).toBe(90); 
        expect(solutionWind!.azimuthDeg).toBeGreaterThan(90);
    });

    it('should consume specified quantity in FireSalvoCommand (Test 74)', () => {
        const shooter = setupShooter('ship', Side.Blue);
        setupTarget('tgt', Side.Red, { x: 5000, y: 5000, z: 0 });
        
        const combat = shooter.getComponent(CombatComponent)!;
        combat.magazines[0].weaponProfileId = '76mm-shell';
        
        const cmd = new FireSalvoCommand('ship', 0, 'tgt', 5);
        fireSalvoHandler.execute(cmd, world);

        expect(combat.magazines[0].currentCount).toBe(5); 
    });

    it('should prioritize closer incoming weapons for point defense (Test 78, 79)', async () => {
        const wraExecutor = new WRAExecutorSystem(world.weaponProfiles);
        const shooter = setupShooter('ship', Side.Blue);
        shooter.addComponent(new DoctrineComponent()); 

        const tracks = shooter.getComponent(TrackComponent)!;
        
        // Track 1: Missile far away (10km)
        tracks.tracks.set('MISSILE-FAR', {
            id: 'MISSILE-FAR', trueEntityId: 'm1', position: { x: 10000, y: 0, z: 100 }, 
            velocity: { x: -500, y: 0, z: 0 }, cepM: 0, firstSeenTick: 0, lastSeenTick: world.currentTick,
            status: TrackStatus.Active, classification: 'Weapon', identification: IdentificationStatus.HOSTILE, confidence: 1.0
        });

        // Track 2: Missile closer (2km) - Should be prioritized
        tracks.tracks.set('MISSILE-NEAR', {
            id: 'MISSILE-NEAR', trueEntityId: 'm2', position: { x: 2000, y: 0, z: 0 }, 
            velocity: { x: -500, y: 0, z: 0 }, cepM: 0, firstSeenTick: 0, lastSeenTick: world.currentTick,
            status: TrackStatus.Active, classification: 'Weapon', identification: IdentificationStatus.HOSTILE, confidence: 1.0
        });

        // Align mount with m2 (East)
        shooter.getComponent(CombatComponent)!.mounts[0].currentAzimuth = 0; 

        // @ts-ignore
        const mockWorld = {
            getEntities: vi.fn().mockReturnValue([shooter]),
            getEntity: vi.fn().mockImplementation((id: string) => {
                if (id === 'm1' || id === 'm2') return { id };
                return undefined;
            }), 
            timestamp: 0,
            currentTick: world.currentTick,
            random: world.random,
            profileRegistry: world.profileRegistry
        };

        const commands = await wraExecutor.process(mockWorld as any, 0.1);
        
        const fireCmd = commands.find(c => c.constructor.name === 'FireWeaponCommand') as any;
        expect(fireCmd).toBeDefined();
        expect(fireCmd.targetId).toBe('m2');
    });

    it('should respect mount limits (Test 65)', async () => {
        const wraExecutor = new WRAExecutorSystem(world.weaponProfiles);
        const shooter = setupShooter('ship', Side.Blue);
        const doctrine = new DoctrineComponent();
        shooter.addComponent(doctrine);

        const mount = shooter.getComponent(CombatComponent)!.mounts[0];
        mount.minAzimuth = -90;
        mount.maxAzimuth = 90; // Forward arc only

        const tracks = shooter.getComponent(TrackComponent)!;
        // Target at 180 degrees (Behind)
        tracks.tracks.set('TGT-BEHIND', {
            id: 'TGT-BEHIND', trueEntityId: 't1', position: { x: -10000, y: 0, z: 0 }, 
            velocity: { x: 0, y: 0, z: 0 }, cepM: 0, firstSeenTick: 0, lastSeenTick: world.currentTick,
            status: TrackStatus.Active, classification: 'Surface', identification: IdentificationStatus.HOSTILE, confidence: 1.0
        });

        // @ts-ignore
        const mockWorld = {
            getEntities: vi.fn().mockReturnValue([shooter]),
            getEntity: vi.fn().mockImplementation((id: string) => id === 't1' ? { id } : undefined),
            currentTick: 0,
            random: world.random,
            profileRegistry: world.profileRegistry
        };

        const commands = await wraExecutor.process(mockWorld as any, 0.1);
        expect(commands.length).toBe(0); // Should not fire at target behind
    });

    it('should prevent over-engagement based on WRA quantity (Test 67)', async () => {
        const wraExecutor = new WRAExecutorSystem(world.weaponProfiles);
        const shooter = setupShooter('ship', Side.Blue);
        const doctrine = new DoctrineComponent();
        doctrine.wraRules.push({ targetType: 'Surface', weaponType: 'Any', quantity: 2 });
        shooter.addComponent(doctrine);

        const tracks = shooter.getComponent(TrackComponent)!;
        tracks.tracks.set('TGT', {
            id: 'TGT', trueEntityId: 't1', position: { x: 10000, y: 0, z: 0 }, 
            velocity: { x: 0, y: 0, z: 0 }, cepM: 0, firstSeenTick: 0, lastSeenTick: world.currentTick,
            status: TrackStatus.Active, classification: 'Surface', identification: IdentificationStatus.HOSTILE, confidence: 1.0
        });

        // Mock 1 missile already in flight
        const missile = new Entity('m1', Side.Blue);
        missile.addComponent(new GuidanceComponent({ targetId: 't1' }));

        // @ts-ignore
        const mockWorld = {
            getEntities: vi.fn().mockReturnValue([shooter, missile]),
            getEntity: vi.fn().mockImplementation((id: string) => (id === 't1' || id === 'm1') ? { id } : undefined),
            currentTick: 100,
            random: world.random,
            profileRegistry: world.profileRegistry
        };

        const commands = await wraExecutor.process(mockWorld as any, 0.1);
        // Should only fire 1 more (since 1 is in flight and required is 2)
        const fireCmds = commands.filter(c => c.constructor.name === 'FireWeaponCommand');
        expect(fireCmds.length).toBe(1);
    });

    it('should respect weapon range limits (Test 72)', async () => {
        const wraExecutor = new WRAExecutorSystem(world.weaponProfiles);
        const shooter = setupShooter('ship', Side.Blue);
        const doctrine = new DoctrineComponent();
        shooter.addComponent(doctrine);

        const tracks = shooter.getComponent(TrackComponent)!;
        // Target too far (150km, AIM-120 max is 100km)
        tracks.tracks.set('TGT-FAR', {
            id: 'TGT-FAR', trueEntityId: 't-far', position: { x: 150000, y: 0, z: 0 }, 
            velocity: { x: 0, y: 0, z: 0 }, cepM: 0, firstSeenTick: 0, lastSeenTick: world.currentTick,
            status: TrackStatus.Active, classification: 'Air-High', identification: IdentificationStatus.HOSTILE, confidence: 1.0
        });

        // @ts-ignore
        const mockWorld = {
            getEntities: vi.fn().mockReturnValue([shooter]),
            getEntity: vi.fn().mockImplementation((id: string) => id === 't-far' ? { id } : undefined),
            currentTick: 0,
            random: world.random,
            profileRegistry: world.profileRegistry
        };

        const commands = await wraExecutor.process(mockWorld as any, 0.1);
        expect(commands.length).toBe(0);
    });

    it('should engage weapons within CIWS threshold (Test 76)', async () => {
        const wraExecutor = new WRAExecutorSystem(world.weaponProfiles);
        const shooter = setupShooter('ship', Side.Blue);
        shooter.addComponent(new DoctrineComponent()); 

        const tracks = shooter.getComponent(TrackComponent)!;
        
        // Weapon at 10km (Outside 20% CIWS threshold of 15km = 3km)
        tracks.tracks.set('WPN-FAR', {
            id: 'WPN-FAR', trueEntityId: 'w1', position: { x: 10000, y: 0, z: 0 }, 
            velocity: { x: -500, y: 0, z: 0 }, cepM: 0, firstSeenTick: 0, lastSeenTick: world.currentTick,
            status: TrackStatus.Active, classification: 'Weapon', identification: IdentificationStatus.HOSTILE, confidence: 1.0
        });

        // Weapon at 2km (Inside threshold)
        tracks.tracks.set('WPN-NEAR', {
            id: 'WPN-NEAR', trueEntityId: 'w2', position: { x: 2000, y: 0, z: 0 }, 
            velocity: { x: -500, y: 0, z: 0 }, cepM: 0, firstSeenTick: 0, lastSeenTick: world.currentTick,
            status: TrackStatus.Active, classification: 'Weapon', identification: IdentificationStatus.HOSTILE, confidence: 1.0
        });

        const combat = shooter.getComponent(CombatComponent)!;
        combat.magazines[0].weaponProfileId = '76mm-shell';
        combat.mounts[0].currentAzimuth = 0;

        // @ts-ignore
        const mockWorld = {
            getEntities: vi.fn().mockReturnValue([shooter]),
            getEntity: vi.fn().mockImplementation((id: string) => (id === 'w1' || id === 'w2') ? { id } : undefined),
            currentTick: 100,
            random: world.random,
            profileRegistry: world.profileRegistry
        };

        const commands = await wraExecutor.process(mockWorld as any, 0.1);
        const fireCmds = commands.filter(c => c.constructor.name === 'FireWeaponCommand') as any[];
        expect(fireCmds.length).toBe(1);
        expect(fireCmds[0].targetId).toBe('w2');
    });

    it('should coordinate multiple mounts for a single target (Test 80)', async () => {
        const wraExecutor = new WRAExecutorSystem(world.weaponProfiles);
        const shooter = setupShooter('ship', Side.Blue);
        const doctrine = new DoctrineComponent();
        doctrine.wraRules.push({ targetType: 'Surface', weaponType: 'Any', quantity: 2 });
        shooter.addComponent(doctrine);

        const combat = shooter.getComponent(CombatComponent)!;
        // Add a second mount
        combat.mounts.push({ ...combat.mounts[0], name: 'Mount 2' });
        combat.magazines[0].currentCount = 10;

        const tracks = shooter.getComponent(TrackComponent)!;
        tracks.tracks.set('TGT', {
            id: 'TGT', trueEntityId: 't1', position: { x: 10000, y: 0, z: 0 }, 
            velocity: { x: 0, y: 0, z: 0 }, cepM: 0, firstSeenTick: 0, lastSeenTick: world.currentTick,
            status: TrackStatus.Active, classification: 'Surface', identification: IdentificationStatus.HOSTILE, confidence: 1.0
        });

        // @ts-ignore
        const mockWorld = {
            getEntities: vi.fn().mockReturnValue([shooter]),
            getEntity: vi.fn().mockImplementation((id: string) => id === 't1' ? { id } : undefined),
            currentTick: 100,
            random: world.random,
            profileRegistry: world.profileRegistry
        };

        const commands = await wraExecutor.process(mockWorld as any, 0.1);
        // Should fire 1 from each mount (total 2)
        const fireCmds = commands.filter(c => c.constructor.name === 'FireWeaponCommand') as any[];
        expect(fireCmds.length).toBe(2);
        expect(fireCmds[0].mountIndex).toBe(0);
        expect(fireCmds[1].mountIndex).toBe(1);
    });
});
