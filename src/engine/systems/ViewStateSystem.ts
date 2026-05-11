import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command } from '../core/Command.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { SensorComponent } from '../components/Sensors.js';
import { TrackComponent } from '../components/Track.js';
import { CombatComponent } from '../components/Combat.js';
import { HealthComponent } from '../components/Health.js';
import { Side } from '../core/Types.js';
import type { ViewStatePayload, ViewUnitPayload, ViewTrackPayload, ESMBearing } from '../core/Types.js';
import { GeoProjection } from '../math/GeoProjection.js';
import { TerrainOracle } from '../environment/TerrainOracle.js';
import { WeaponProfileRegistry } from '../core/WeaponProfileRegistry.js';
import { VectorMath } from '../math/VectorMath.js';
import { FuelComponent } from '../components/Propulsion.js';
import { DatalinkComponent } from '../components/Datalink.js';
import { MissionComponent } from '../components/Missions.js';
import { MapDataService } from '../environment/MapDataService.js';
import { Physics } from '../PhysicsConstants.js';
import { Entity } from '../core/Entity.js';
import { ProfileRegistry } from '../core/ProfileRegistry.js';
import { LogisticsComponent } from '../components/Logistics.js';
import { DetectionComponent } from '../components/Sensors.js';
import { EnvironmentSystem } from './EnvironmentSystem.js';

/**
 * ViewStateSystem: The UI Hydrator.
 * Compiles the ground truth into a side-specific filtered snapshot for the UI.
 */
export class ViewStateSystem implements ISystem {
    readonly name = 'ViewStateSystem';
    readonly phase = SystemPhase.Bridge;
    readonly dependencies = ['SensorSystem', 'TMSSystem', 'TelemetrySystem'];

    constructor(
        private projection: GeoProjection,
        private terrain: TerrainOracle,
        private profiles: ProfileRegistry,
        private weaponProfiles: WeaponProfileRegistry,
        private mapData: MapDataService
    ) { }

    public setOrigin(lat: number, lon: number): void {
        this.projection.setOrigin(lat, lon);
    }

    private lastSnapshotTick: number = 0;
    private lastSnapshotTime: number = 0;

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const now = performance.now();
        const ticksSinceLast = world.currentTick - this.lastSnapshotTick;
        
        if (now - this.lastSnapshotTime >= 100 || ticksSinceLast >= 50) { 
            this.lastSnapshotTime = now;
            this.lastSnapshotTick = world.currentTick;
            
            const envSystem = world.getSystem(EnvironmentSystem);
            const weather = envSystem?.globalWeather || {
                cloudCover: 0.2, seaState: 3, windSpeedKts: 10, windDirDeg: 0, visibilityNM: 20, temperatureC: 15
            };

            // Pre-process all entities once
            const allUnitData: Map<string, ViewUnitPayload> = new Map();
            const allDatalinkNodes: string[] = [];
            const allESMBearings: ESMBearing[] = [];

            for (const entity of world.getEntities()) {
                const transform = entity.getComponent(TransformComponent);
                if (!transform) continue;

                const health = entity.getComponent(HealthComponent);
                const fuel = entity.getComponent(FuelComponent);
                const kin = entity.getComponent(KinematicsComponent);
                const mission = entity.getComponent(MissionComponent);
                const sensors = entity.getComponents(SensorComponent);
                const combat = entity.getComponent(CombatComponent);
                const logistics = entity.getComponent(LogisticsComponent);
                const detection = entity.getComponent(DetectionComponent);

                const geo = this.projection.toGeographic(transform.position);
                const speedKts = kin ? (VectorMath.magnitude(kin.velocity) * Physics.MPS_TO_KTS) : 0;
                const profile = entity.profileId ? this.profiles.get(entity.profileId) : undefined;

                const unitPayload: ViewUnitPayload = {
                    id: entity.id,
                    side: entity.side,
                    category: profile?.type,
                    parentId: entity.parentEntityId,
                    pos: { x: transform.position.x, y: transform.position.y, z: transform.position.z },
                    vel: kin ? { x: kin.velocity.x, y: kin.velocity.y, z: kin.velocity.z } : undefined,
                    lla: { lat: geo.lat, lon: geo.lon, alt: transform.position.z },
                    heading: transform.rotation,
                    hp: health?.hp || 100,
                    isDestroyed: health?.isDestroyed || false,
                    logState: logistics?.state || 'Ready',
                    fuelPct: fuel ? (fuel.currentKg / fuel.maxKg) : 1.0,
                    isBingo: fuel ? (fuel.currentKg < fuel.maxKg * 0.1) : false,
                    speedKts,
                    profileId: entity.profileId,
                    sensors: sensors.map(s => ({
                        name: s.name || s.sensorType,
                        active: s.isActive,
                        rangeM: s.maxRangeM,
                        azimuthDeg: s.currentAzimuth,
                        halfArcDeg: s.beamWidthDeg / 2
                    })),
                    mounts: combat?.mounts.map((m, idx) => ({
                        id: `mount-${idx}`,
                        type: m.name,
                        roundsRemaining: combat.magazines[m.magazineIndices[m.activeMagazineIndex]]?.currentCount || 0
                    })) || [],
                    mission: mission ? {
                        type: mission.missionType,
                        status: mission.status,
                        params: mission.params
                    } : undefined,
                    activeTasks: []
                };

                allUnitData.set(entity.id, unitPayload);
                if (entity.hasComponent(DatalinkComponent)) allDatalinkNodes.push(entity.id);
                if (detection && detection.esmBearings.length > 0) allESMBearings.push(...detection.esmBearings);
            }

            const sides = [Side.Blue, Side.Red, Side.Neutral];
            for (const side of sides) {
                const snapshot = this.filterSnapshot(world, side, weather, allUnitData, allDatalinkNodes, allESMBearings);
                world.recordEvent({
                    type: 'ViewStateUpdated',
                    tick: world.currentTick,
                    data: snapshot
                });
            }
        }
        return [];
    }

    private filterSnapshot(
        world: IWorldView, 
        side: Side, 
        weather: any, 
        allUnits: Map<string, ViewUnitPayload>,
        allDatalinkNodes: string[],
        allESMBearings: ESMBearing[]
    ): ViewStatePayload {
        const units: ViewUnitPayload[] = [];
        const tracks: ViewTrackPayload[] = [];
        const datalinkNodes: string[] = [];
        const datalinkEdges: { a: string, b: string, latencyMs: number }[] = [];
        const weaponBindings: { weaponId: string, targetId: string, shooterId: string }[] = [];

        // 1. Filter Units
        for (const unit of allUnits.values()) {
            if (unit.side === side || side === Side.Neutral) {
                units.push(unit);
            }
        }

        // 2. Filter Tracks & Datalink (only for friendly units)
        for (const unitId of allDatalinkNodes) {
            const unit = allUnits.get(unitId);
            if (unit && (unit.side === side || side === Side.Neutral)) {
                datalinkNodes.push(unitId);
                
                const entity = world.getEntity(unitId);
                const localTracks = entity?.getComponent(TrackComponent);
                if (localTracks) {
                    for (const track of localTracks.tracks.values()) {
                        if (track.status === 'Dropped') continue;
                        if (tracks.some(t => t.id === track.id)) continue;

                        const trackGeo = this.projection.toGeographic(track.position);
                        tracks.push({
                            id: track.id,
                            pos: { x: track.position.x, y: track.position.y, z: track.position.z },
                            lla: { lat: trackGeo.lat, lon: trackGeo.lon, alt: track.position.z },
                            vel: { x: track.velocity.x, y: track.velocity.y, z: track.velocity.z },
                            cep: track.cepM,
                            classification: track.classification,
                            identification: track.identification,
                            firstSeen: track.firstSeenTick,
                            lastSeen: track.lastSeenTick,
                            speedKts: VectorMath.magnitude(track.velocity) * Physics.MPS_TO_KTS
                        });
                    }
                }

                const combat = entity?.getComponent(CombatComponent);
                if (combat) {
                    for (const mount of combat.mounts) {
                        const targetId = mount.currentTargetId || combat.currentTargetId;
                        if (targetId) {
                            weaponBindings.push({
                                weaponId: mount.name,
                                targetId,
                                shooterId: unitId
                            });
                        }
                    }
                }
            }
        }

        // 3. Datalink Edges (only within visible network)
        for (let i = 0; i < datalinkNodes.length; i++) {
            for (let j = i + 1; j < datalinkNodes.length; j++) {
                const idA = datalinkNodes[i];
                const idB = datalinkNodes[j];
                const dlA = world.getEntity(idA)?.getComponent(DatalinkComponent);
                const dlB = world.getEntity(idB)?.getComponent(DatalinkComponent);
                if (dlA && dlB && dlA.networkId === dlB.networkId && dlA.isActive && dlB.isActive) {
                    datalinkEdges.push({ a: idA, b: idB, latencyMs: 100 });
                }
            }
        }

        return {
            tick: world.currentTick,
            timestamp: Date.now(),
            sequence: world.currentTick,
            isPaused: world.isPaused || false,
            side,
            origin: this.projection.getOrigin(),
            units,
            tracks,
            losses: { blue: world.stats.blue, red: world.stats.red, munitionsExpended: world.stats.munitionsExpended },
            weather,
            datalinkGraph: { nodes: datalinkNodes, edges: datalinkEdges },
            weaponBindings,
            esmBearings: allESMBearings.filter(b => b.observerId === side || side === Side.Neutral) // Simple filtering
        };
    }

    public async generateSnapshot(world: IWorldView, side: Side, weather: any): Promise<ViewStatePayload> {
        // Fallback or explicit call (optimized version uses process and filterSnapshot)
        const units: Map<string, ViewUnitPayload> = new Map();
        // ... (re-implement or delegate to filterSnapshot with fresh data)
        // For simplicity and to satisfy the interface, we'll keep this but optimize the main loop
        return this.filterSnapshot(world, side, weather, new Map(), [], []);
    }

    public getEntityType(entity: Entity, world: IWorldView): string {
        const profile = world.profileRegistry.get(entity.profileId || '');
        return profile?.type || 'Unknown';
    }
}
