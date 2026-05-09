import { Side, Vector3 } from './Types.js';
import { Entity } from './Entity.js';
import { CollisionComponent } from '../components/Collision.js';
import { World } from './World.js';
import { ProfileRegistry } from './ProfileRegistry.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { SensorComponent, DetectionComponent } from '../components/Sensors.js';
import { SensorType, EMBand, SensorMode, MountingType } from './Types.js';
import { TrackComponent } from '../components/Track.js';
import { CombatComponent, Magazine, Mount } from '../components/Combat.js';
import { HealthComponent } from '../components/Health.js';
import { PropulsionComponent, FuelComponent } from '../components/Propulsion.js';
import { WeaponStageComponent, WeaponStage as CompWeaponStage } from '../components/WeaponStages.js';
import { AeroComponent } from '../components/Aero.js';
import { EnvironmentComponent } from '../components/Environment.js';
import { NavigationComponent } from '../components/Navigation.js';
import { DoctrineComponent } from '../components/Doctrine.js';
import { DatalinkComponent } from '../components/Datalink.js';
import { MissionComponent, MissionType, MissionStatus } from '../components/Missions.js';
import { FacilityComponent, FacilityType, LogisticsComponent } from '../components/Logistics.js';
import { TaskGraphComponent } from '../components/TaskGraph.js';

import { RCSComponent } from '../components/Signatures.js';
import { AcousticSignatureComponent } from '../components/Subsurface.js';

import type { EntityProfile } from './Types.js';

import { TelemetryComponent } from '../components/Telemetry.js';

export interface SpawnParams {
    id?: string;
    profileId?: string;
    profile?: EntityProfile;
    pos?: Vector3 | [number, number, number];
    position?: Vector3;
    heading?: number;
    pitch?: number;
    side: Side;
    speedKts?: number;
}

/**
 * EntityManager: The V3 Hydrator.
 * Translates Profile Blueprints into instantiated Entities with Components.
 */
export class EntityManager {
    constructor(
        private world: World,
        private profiles: ProfileRegistry
    ) { }

    public spawn(params: SpawnParams): Entity {
        const id = params.id || `entity-${this.world.random.integer(0, 0xFFFFFFFF).toString(16)}`;
        let profileId = params.profileId;
        const profile = params.profile || (profileId ? this.profiles.get(profileId) : undefined);

        if (!profile) {
            throw new Error(`Profile not found: ${profileId || 'No profile provided'}`);
        }

        // If it's an inline profile without an ID, register it so systems can find it
        if (params.profile && !profileId) {
            profileId = profile.platformClass || profile.type || `inline-${id}`;
            if (!this.profiles.get(profileId)) {
                this.profiles.register(profileId, profile);
            }
        }

        const entity = new Entity(id, params.side, undefined, profileId);

        // Normalize position
        let position: Vector3;
        if (params.position) {
            position = params.position;
        } else if (Array.isArray(params.pos)) {
            position = { x: params.pos[0], y: params.pos[1], z: params.pos[2] };
        } else if (params.pos) {
            position = params.pos;
        } else {
            position = { x: 0, y: 0, z: 0 };
        }

        // 1. Mandatory Physical Presence
        entity.addComponent(new TransformComponent({
            position,
            rotation: params.heading || 0,
            pitch: params.pitch || 0
        }));

        // 2. Physics & Aero
        const hdgRad = (params.heading || 0) * (Math.PI / 180);
        const pitchRad = (params.pitch || 0) * (Math.PI / 180);
        const speedMps = (params.speedKts || 0) * 0.514444;

        const vel = {
            x: speedMps * Math.cos(hdgRad) * Math.cos(pitchRad),
            y: speedMps * Math.sin(hdgRad) * Math.cos(pitchRad),
            z: speedMps * Math.sin(pitchRad)
        };

        if (profile.kinematics) {
            const massEmpty = profile.kinematics.massEmptyKg || profile.kinematics.massKg || 1000;
            const initialFuel = profile.fuel?.maxKg || 0;
            const totalMass = massEmpty + initialFuel;

            entity.addComponent(new KinematicsComponent({
                velocity: vel,
                massKg: totalMass,
                massEmptyKg: massEmpty,
                dragCoeff: (profile.aero?.dragCoeffCd || profile.kinematics.dragCoeff || 0.05),
                thrustN: 0
            }));
        }

        if (profile.aero) {
            entity.addComponent(new AeroComponent({
                wingspanM: profile.aero.wingspanM || 10,
                wingAreaS: profile.aero.wingAreaS || 25,
                dragCoeffCd: profile.aero.dragCoeffCd || 0.02,
                liftCoeffCl: profile.aero.liftCoeffCl || 0.5,
                maxG: profile.aero.maxG || 9
            }));
        } else if (profile.type === 'Aircraft' || profile.type === 'Weapon' || profile.type === 'Helicopter') {
            const defaults = this.getPlatformDefaults(profile.type);
            entity.addComponent(new AeroComponent({
                wingspanM: defaults.wingspanM,
                wingAreaS: defaults.wingAreaS,
                dragCoeffCd: defaults.dragCoeffCd,
                liftCoeffCl: defaults.liftCoeffCl,
                maxG: defaults.maxG
            }));
        }

        if (profile.type === 'Aircraft' || profile.type === 'Helicopter') {
            entity.addComponent(new LogisticsComponent());
        }

        entity.addComponent(new EnvironmentComponent());

        // 3. Propulsion & Fuel
        const isShip = profile.type === 'Ship';
        if (profile.propulsion) {
            entity.addComponent(new PropulsionComponent({
                throttle: 0,
                currentThrustN: 0,
                maxThrustDryN: profile.propulsion.maxThrustDryN || (isShip ? 5000000 : 50000),
                maxThrustAbN: profile.propulsion.maxThrustAbN || (isShip ? 5000000 : 80000),
                spoolRate: profile.propulsion.spoolRate || 0.1,
                sfcDry: profile.propulsion.sfcDry || 0.8,
                sfcAb: profile.propulsion.sfcAb || 2.0,
                abThreshold: profile.propulsion.abThreshold || 0.9
            }));
        }

        if (profile.fuel) {
            entity.addComponent(new FuelComponent({
                maxKg: profile.fuel.maxKg || 5000,
                currentKg: profile.fuel.maxKg || 5000
            }));
        }

        // 4. Autopilot & Comms
        if (profile.type !== 'Weapon' && profile.type !== 'Mine') {
            entity.addComponent(new NavigationComponent());
            entity.addComponent(new DoctrineComponent());
            entity.addComponent(new DatalinkComponent({ networkId: 'default-net' }));
            entity.addComponent(new MissionComponent({ missionType: MissionType.Idle, params: {} }));
            entity.addComponent(new TaskGraphComponent());
        } else if (profile.type === 'Weapon') {
            entity.addComponent(new MissionComponent({ 
                missionType: MissionType.Intercept, 
                params: { targetId: 'unknown' }, 
                status: MissionStatus.Active 
            }));
        }

        if (profile.stages && profile.stages.length > 0) {
            const stages: CompWeaponStage[] = profile.stages.map((s, idx) => ({
                name: s.name || `Stage-${idx}`,
                durationTicks: s.durationTicks || 0,
                thrustN: s.thrustN || 0,
                burnTimeS: s.burnTimeS,
                guidanceMode: s.guidanceMode,
                separateOnComplete: s.separateOnComplete || false
            }));
            entity.addComponent(new WeaponStageComponent(stages));
        }

        if (profile.sensors) {
            entity.addComponent(new DetectionComponent());
            entity.addComponent(new TrackComponent());
            for (const s of profile.sensors) {
                entity.addComponent(new SensorComponent({
                    sensorType: s.type as SensorType,
                    maxRangeM: s.maxRangeM || 20000,
                    isActive: true,
                    name: s.name || `Sensor-${s.type}`
                }));
            }
        }

        if (profile.combat) {
            const magazines = (profile.combat.magazines || []).map((m): Magazine => ({
                name: m.name || `Mag-${m.weaponProfileId}`,
                weaponProfileId: m.weaponProfileId,
                capacity: m.capacity,
                currentCount: m.capacity
            }));

            const mounts = (profile.combat.mounts || []).map((m): Mount => ({
                name: m.name || 'Unknown Mount',
                magazineIndices: m.magazineIndices || [0],
                activeMagazineIndex: 0,
                reloadTicks: m.reloadTicks || 10,
                lastFireTick: 0,
                minAzimuth: m.arcs ? m.arcs[0] : -180,
                maxAzimuth: m.arcs ? m.arcs[1] : 180,
                minElevation: -90,
                maxElevation: 90,
                currentAzimuth: 0,
                currentElevation: 0,
                slewRate: m.slewRate,
                alignmentThresholdDeg: m.alignmentThresholdDeg ?? 1.0
            }));
            entity.addComponent(new CombatComponent({ mounts, magazines }));
        }

        if (profile.aviation) {
            entity.addComponent(new FacilityComponent({
                facilityType: FacilityType.Carrier,
                runways: [{ id: 'deck-1', lengthM: 300, isDamaged: false, isOccupied: false }],
                hangarCapacity: profile.aviation.hangarCapacity || 4,
                fuelReservesKg: profile.aviation.aviationFuelKg || 500000
            }));
        }

        // 5. Health & Vitality
        const healthParams = profile.health || { maxHp: 100 };
        entity.addComponent(new HealthComponent({
            maxHp: healthParams.maxHp || 100,
            hp: healthParams.maxHp || 100
        }));

        // 6. Signatures
        const sigDefaults = this.getSignatureDefaults(profile.type || 'Aircraft');
        const baseRCS = profile.signatures?.baseRCS ?? sigDefaults.rcs;
        entity.addComponent(new RCSComponent({ baseRCS }));

        if (profile.type === 'Ship' || profile.type === 'Submarine') {
            const baseSL = profile.signatures?.acousticSL ?? sigDefaults.sl;
            entity.addComponent(new AcousticSignatureComponent({ baseSL }));
        }

        // 7. Collision Physicality
        const colDefaults = this.getCollisionDefaults(profile.type || 'Aircraft');
        entity.addComponent(new CollisionComponent({
            radiusMeters: colDefaults.radius,
            layer: colDefaults.layer,
            collidesWith: ['surface', 'air', 'missile', 'default']
        }));

        // 8. Telemetry History
        entity.addComponent(new TelemetryComponent());

        this.world.addEntity(entity);
        return entity;
    }

    private getPlatformDefaults(type: string) {
        switch (type) {
            case 'Weapon': return { wingspanM: 1, wingAreaS: 0.5, dragCoeffCd: 0.02, liftCoeffCl: 0.3, maxG: 50 };
            case 'Helicopter': return { wingspanM: 12, wingAreaS: 30, dragCoeffCd: 0.05, liftCoeffCl: 0.8, maxG: 4 };
            default: return { wingspanM: 10, wingAreaS: 25, dragCoeffCd: 0.02, liftCoeffCl: 0.5, maxG: 9 };
        }
    }

    private getSignatureDefaults(type: string) {
        switch (type) {
            case 'Ship': return { rcs: 5000, sl: 140 };
            case 'Submarine': return { rcs: 1, sl: 110 };
            case 'Weapon': return { rcs: 0.1, sl: 0 };
            default: return { rcs: 5, sl: 0 };
        }
    }

    private getCollisionDefaults(type: string) {
        switch (type) {
            case 'Ship': return { radius: 150, layer: 'surface' };
            case 'Aircraft': return { radius: 10, layer: 'air' };
            case 'Weapon': return { radius: 1, layer: 'missile' };
            case 'Facility': return { radius: 200, layer: 'surface' };
            default: return { radius: 5, layer: 'default' };
        }
    }

    public getWorld(): World {
        return this.world;
    }
}
