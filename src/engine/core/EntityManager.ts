import { EntityId, EntityCategory, Side, Vector3 } from './Types.js';
import { Entity } from './Entity.js';
import { CollisionComponent } from '../components/Collision.js';
import { World } from './World.js';
import { ProfileRegistry } from './ProfileRegistry.js';
import type { MountProfile } from './ProfileRegistry.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { SensorComponent, DetectionComponent } from '../components/Sensors.js';
import { SensorType, EMBand, SensorMode, MountingType } from './Types.js';
import { TrackComponent } from '../components/Track.js';
import { CombatComponent, Magazine, Mount } from '../components/Combat.js';
import { HealthComponent, SubsystemType } from '../components/Health.js';
import { PropulsionComponent, FuelComponent, EngineState } from '../components/Propulsion.js';
import { WeaponStageComponent } from '../components/WeaponStages.js';
import { AeroComponent } from '../components/Aero.js';
import { EnvironmentComponent } from '../components/Environment.js';
import { NavigationComponent } from '../components/Navigation.js';
import { DoctrineComponent } from '../components/Doctrine.js';
import { DatalinkComponent } from '../components/Datalink.js';
import { MissionComponent, MissionType } from '../components/Missions.js';
import { FacilityComponent, FacilityType, LogisticsComponent } from '../components/Logistics.js';
import { TaskGraphComponent } from '../components/TaskGraph.js';

import { RCSComponent } from '../components/Signatures.js';
import { AcousticSignatureComponent } from '../components/Subsurface.js';

import type { EntityProfile, MagazineProfile } from '../../sdk/schemas/index.js';

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
        const id = params.id || `entity-${Math.random().toString(36).substr(2, 9)}`;
        const profile = params.profile || (params.profileId ? this.profiles.get(params.profileId) : undefined);

        if (!profile) {
            throw new Error(`Profile not found: ${params.profileId || 'No profile provided'}`);
        }

        const entity = new Entity(id, params.side, undefined, params.profileId || profile.platformClass || profile.type || 'custom');

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
        entity.addComponent(new TransformComponent(
            position,
            params.heading || 0,
            params.pitch || 0
        ));

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
            entity.addComponent(new KinematicsComponent(
                vel,
                { x: 0, y: 0, z: 0 },
                { x: 0, y: 0, z: 0 },
                profile.kinematics.massEmptyKg || profile.kinematics.massKg || 1000,
                (profile.aero?.dragCoeffCd || profile.kinematics.dragCoeff || 0.05)
            ));
        }

        if (profile.aero) {
            entity.addComponent(new AeroComponent(
                profile.aero.wingspanM || 10,
                profile.aero.wingAreaS || 25,
                profile.aero.dragCoeffCd || 0.02,
                profile.aero.liftCoeffCl || 0.5,
                profile.aero.maxG || 9,
                0.05 // inducedDragFactor
            ));
        } else if (profile.type === 'Aircraft' || profile.type === 'Weapon' || profile.type === 'Helicopter') {
            const isWeapon = profile.type === 'Weapon';
            entity.addComponent(new AeroComponent(
                isWeapon ? 1.0 : 10.0,  // wingspan
                isWeapon ? 0.5 : 25.0,  // wingArea
                0.02,                   // dragCoeffCd
                0.3,                    // liftCoeffCl
                isWeapon ? 50.0 : 9.0,  // maxG
                0.05                    // inducedDragFactor
            ));
        }

        if (profile.type === 'Aircraft' || profile.type === 'Helicopter') {
            entity.addComponent(new LogisticsComponent());
        }

        entity.addComponent(new EnvironmentComponent());

        // 3. Propulsion & Fuel
        const isShip = profile.type === 'Ship';
        if (profile.propulsion) {
            entity.addComponent(new PropulsionComponent(
                0, // throttle
                0, // currentThrustN
                profile.propulsion.maxThrustDryN || (isShip ? 5000000 : 50000),
                profile.propulsion.maxThrustAbN || (isShip ? 5000000 : 80000),
                profile.propulsion.spoolRate || 0.1,
                profile.propulsion.sfcDry || 0.8,
                profile.propulsion.sfcAb || 2.0,
                profile.propulsion.abThreshold || 0.9
            ));
        }

        if (profile.fuel) {
            entity.addComponent(new FuelComponent(
                profile.fuel.maxKg || 5000,
                profile.fuel.maxKg || 5000
            ));
        }

        // 4. Autopilot & Comms
        if (profile.type !== 'Weapon' && profile.type !== 'Mine') {
            entity.addComponent(new NavigationComponent());
            entity.addComponent(new DoctrineComponent());
            entity.addComponent(new DatalinkComponent('default-net'));
            entity.addComponent(new MissionComponent(MissionType.Idle, {}));
            entity.addComponent(new TaskGraphComponent());
        }

        if (profile.stages && profile.stages.length > 0) {
            entity.addComponent(new WeaponStageComponent(profile.stages as any));
        }

        if (profile.sensors) {
            entity.addComponent(new DetectionComponent());
            entity.addComponent(new TrackComponent());
            const sensorAlt = profile.type === 'Ship' ? 25 : 2; // Mount higher on ships
            for (const s of profile.sensors) {
                entity.addComponent(new SensorComponent(
                    s.type as SensorType,
                    s.maxRangeM || 20000,
                    true,
                    360, 50, -110, 3000, EMBand.S, SensorMode.Search, MountingType.Fixed, 30, 0, 0, undefined, undefined, undefined,
                    s.name || `Sensor-${s.type}`
                ));
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
                slewRate: m.slewRate ?? 30,
                alignmentThresholdDeg: m.alignmentThresholdDeg ?? 1.0
            }));
            entity.addComponent(new CombatComponent(mounts, magazines));
        }

        if (profile.aviation) {
            entity.addComponent(new FacilityComponent(
                FacilityType.Carrier,
                [{ id: 'deck-1', lengthM: 300, isDamaged: false, isOccupied: false }], // Runways
                profile.aviation.hangarCapacity || 4, // Hangar size
                [], // hostedEntityIds
                profile.aviation.aviationFuelKg || 500000,
                new Map() // ammoReserves
            ));
        }

        // 5. Health & Vitality
        const healthParams = profile.health || { maxHp: 100 };
        entity.addComponent(new HealthComponent(
            healthParams.maxHp || 100,
            healthParams.maxHp || 100
        ));

        // 6. Signatures
        const baseRCS = profile.signatures?.baseRCS ?? (profile.type === 'Ship' ? 5000 : 5);
        entity.addComponent(new RCSComponent(baseRCS));

        if (profile.type === 'Ship' || profile.type === 'Submarine') {
            const baseSL = profile.signatures?.acousticSL ?? (profile.type === 'Ship' ? 140 : 110);
            entity.addComponent(new AcousticSignatureComponent(baseSL));
        }

        // 7. Collision Physicality
        let colRadius = 5;
        let colLayer = 'default';
        switch (profile.type) {
            case 'Ship': colRadius = 150; colLayer = 'surface'; break;
            case 'Aircraft': colRadius = 10; colLayer = 'air'; break;
            case 'Weapon': colRadius = 1; colLayer = 'missile'; break;
            case 'Facility': colRadius = 200; colLayer = 'surface'; break;
        }
        entity.addComponent(new CollisionComponent(colRadius, undefined, colLayer, ['surface', 'air', 'missile', 'default']));

        // 8. Telemetry History
        entity.addComponent(new TelemetryComponent(500));

        this.world.addEntity(entity);
        return entity;
    }

    public getWorld(): World {
        return this.world;
    }
}
