import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { World } from '../core/World.js';
import { Command } from '../core/Command.js';
import { Side, Track, ViewStateSnapshot, Vector3 } from '../core/Types.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { HealthComponent } from '../components/Health.js';
import { TrackComponent } from '../components/Track.js';
import { FuelComponent } from '../components/Propulsion.js';
import { LogisticsComponent } from '../components/Logistics.js';
import { DoctrineComponent } from '../components/Doctrine.js';
import { GeoProjection } from '../math/GeoProjection.js';
import { NavigationComponent } from '../components/Navigation.js';
import { SensorComponent, DetectionComponent } from '../components/Sensors.js';
import { CombatComponent } from '../components/Combat.js';
import { DatalinkComponent } from '../components/Datalink.js';
import { MissionComponent } from '../components/Missions.js';
import { TerrainOracle } from '../environment/TerrainOracle.js';
import { WeaponProfileRegistry } from '../core/WeaponProfileRegistry.js';
import { TelemetrySystem } from './TelemetrySystem.js';
import { EnvironmentSystem } from './EnvironmentSystem.js';
import { DatalinkSystem } from './DatalinkSystem.js';
import { ThreatMapSystem } from './ThreatMapSystem.js';
import { MapDataService } from '../environment/MapDataService.js';
import { TaskGraphComponent } from '../components/TaskGraph.js';

/**
 * ViewStateSystem: Serializes side-specific tactical snapshots.
 * This is the bridge between the high-fidelity engine and the UI.
 */
export class ViewStateSystem implements ISystem {
    readonly name = 'ViewStateSystem';
    readonly phase = SystemPhase.Bridge;
    readonly dependencies = [];

    constructor(
        private projection: GeoProjection,
        private terrain?: TerrainOracle,
        private weaponProfiles?: WeaponProfileRegistry,
        private mapData?: MapDataService
    ) { }

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const sides = [Side.Blue, Side.Red, Side.Neutral];
        for (const side of sides) {
            try {
                const snapshot = await this.generateSnapshot(world, side);
                world.events.emit({
                    type: 'ViewStateUpdated',
                    tick: world.currentTick,
                    data: snapshot
                });
            } catch (err: any) {
                console.error(`ViewStateSystem: Failed to generate snapshot for ${side} at tick ${world.currentTick}`, err);
            }
        }
        return [];
    }

    public async generateSnapshot(world: IWorldView, observerSide: Side): Promise<any> {
        const units: any[] = [];
        const allTracks: any[] = [];
        const weaponBindings: any[] = [];
        const esmBearings: any[] = [];

        const isGodView = observerSide === Side.Neutral;

        for (const entity of world.getEntities()) {
            const transform = entity.getComponent(TransformComponent);
            if (!transform) continue;

            if (entity.side === observerSide || isGodView) {
                const health = entity.getComponent(HealthComponent);
                const log = entity.getComponent(LogisticsComponent);
                const nav = entity.getComponent(NavigationComponent);
                const sensors = entity.getComponents(SensorComponent);
                const combat = entity.getComponent(CombatComponent);
                const detection = entity.getComponent(DetectionComponent);
                const kinematics = entity.getComponent(KinematicsComponent);
                const taskGraph = entity.getComponent(TaskGraphComponent);
                const mission = entity.getComponent(MissionComponent);
                const fuel = entity.getComponent(FuelComponent);
                const datalink = entity.getComponent(DatalinkComponent);
                const doctrine = entity.getComponent(DoctrineComponent);

                const geo = this.projection.project(transform.position);

                units.push({
                    id: entity.id,
                    side: entity.side,
                    parentId: entity.parentEntityId,
                    profileId: entity.profileId,
                    pos: transform.position,
                    vel: kinematics?.velocity || { x: 0, y: 0, z: 0 },
                    lla: { lat: geo.lat, lon: geo.lon, alt: transform.position.z },
                    rot: transform.rotation,
                    hp: health?.hp || 100,
                    isDestroyed: health?.isDestroyed || false,
                    logState: log?.state || 'None',
                    mission: mission ? {
                        type: mission.missionType,
                        status: mission.status,
                        params: mission.params
                    } : undefined,
                    taskGraph: taskGraph ? {
                        activeTasks: taskGraph.graph.getActiveTasks().map(t => ({
                            id: t.id,
                            type: t.task.type,
                            status: t.status
                        }))
                    } : undefined,
                    doctrine: doctrine ? {
                        roe: doctrine.roe,
                        wraRules: doctrine.wraRules
                    } : undefined,
                    fuel: fuel ? {
                        current: fuel.currentKg,
                        max: fuel.maxKg,
                        pct: fuel.currentKg / fuel.maxKg,
                        burnRate: fuel.burnRateKgHr,
                        isBingo: fuel.isBingo,
                        bingoTicks: fuel.bingoTicks
                    } : undefined,
                    datalink: datalink ? {
                        networkId: datalink.networkId,
                        isActive: datalink.isActive,
                        latency: datalink.latencyTicks
                    } : undefined,
                    fuelPct: fuel ? fuel.currentKg / fuel.maxKg : 1.0,
                    isBingo: fuel?.isBingo || false,
                    sensors: sensors.map(s => ({
                        name: s.name,
                        rangeM: s.maxRangeM,
                        azimuthDeg: s.currentAzimuth || 0,
                        halfArcDeg: s.beamWidthDeg / 2,
                        active: s.isActive
                    })),
                    desiredSpeedKts: nav?.desiredSpeedKts,
                    desiredAltitudeM: nav?.desiredAltitudeM,
                    desiredHeadingDeg: nav?.desiredHeadingDeg,
                    coveragePolygons: {
                        radar: this.calculateHorizonPolygon(transform.position, sensors),
                        wez: this.calculateWEZPolygon(transform.position, combat)
                    },
                    mounts: combat?.mounts.map((m, idx) => {
                        const magIdx = m.magazineIndices[m.activeMagazineIndex];
                        const magazine = combat?.magazines[magIdx];
                        return {
                            id: `${entity.id}-m-${idx}`,
                            type: m.name,
                            roundsRemaining: magazine?.currentCount || 0
                        };
                    }) || []
                });

                if (combat) {
                    if (combat.currentTargetId) {
                        weaponBindings.push({ shooterId: entity.id, weaponId: 'Global', targetId: combat.currentTargetId });
                    }
                    combat.mounts.forEach((m, idx) => {
                        if (m.currentTargetId) {
                            weaponBindings.push({ shooterId: entity.id, weaponId: m.name, targetId: m.currentTargetId });
                        }
                    });
                }

                if (detection && detection.esmBearings) {
                    esmBearings.push(...detection.esmBearings.map((b: any) => ({
                        observerId: entity.id,
                        bearingDeg: b.bearingDeg,
                        confidencePct: b.confidencePct,
                        targetId: b.targetId
                    })));
                }

                const tms = entity.getComponent(TrackComponent);
                if (tms) {
                    for (const track of tms.tracks.values()) {
                        const tGeo = this.projection.project(track.position as Vector3);
                        allTracks.push({
                            id: track.id,
                            pos: track.position,
                            lla: { lat: tGeo.lat, lon: tGeo.lon, alt: track.position.z },
                            vel: track.velocity,
                            classification: track.classification,
                            identification: track.identification,
                            lastSeen: track.lastSeenTick,
                            cep: track.cepM
                        });
                    }
                }
            }
        }

        const tel = (world as World).getSystem<TelemetrySystem>('TelemetrySystem');
        const envSystem = (world as World).getSystem<EnvironmentSystem>('EnvironmentSystem');
        const dlSystem = (world as World).getSystem<DatalinkSystem>('DatalinkSystem');
        const threatSystem = (world as World).getSystem<ThreatMapSystem>('ThreatMapSystem');

        return {
            tick: world.currentTick,
            timestamp: world.timestamp,
            sequence: (world as World).stateSequence || 0,
            isPaused: world.isPaused,
            side: observerSide,
            origin: { lat: this.projection.originLat, lon: this.projection.originLon },
            units,
            tracks: this.deduplicateTracks(allTracks),
            losses: tel ? tel.getLosses() : { blue: 0, red: 0, munitionsExpended: 0 },
            weather: envSystem ? envSystem.globalWeather : {
                precipitationRateMMhr: 0,
                cloudCover: 0.3,
                seaState: 3,
                windSpeedKts: 15,
                windDirDeg: 220,
                visibilityNM: 20,
                temperatureC: 15
            },
            datalinkGraph: dlSystem ? dlSystem.getGraph() : { nodes: [], edges: [] },
            threatMap: threatSystem ? threatSystem.threatZones.get(observerSide) : [],
            weaponBindings,
            esmBearings,
            mapData: this.mapData ? {
                bathymetry: this.mapData.getBathymetry(),
                borders: this.mapData.getBorders()
            } : undefined
        };
    }

    private calculateMaxWEZ(combat: CombatComponent | undefined): number {
        if (!combat || !this.weaponProfiles) return 0;
        let maxRange = 0;
        for (const mag of combat.magazines) {
            const profile = this.weaponProfiles.get(mag.weaponProfileId);
            if (profile && profile.maxRangeM > maxRange) {
                maxRange = profile.maxRangeM;
            }
        }
        return maxRange;
    }

    private calculateHorizonPolygon(pos: any, sensors: SensorComponent[]): any[] {
        if (sensors.length === 0 || !this.terrain) return [];
        const maxRange = Math.max(...sensors.map(s => s.maxRangeM));
        const points = [];
        for (let i = 0; i < 16; i++) {
            const angle = (i * 2 * Math.PI) / 16;
            const dir = { x: Math.cos(angle), y: Math.sin(angle), z: 0 };
            const endPos = { x: pos.x + dir.x * maxRange, y: pos.y + dir.y * maxRange, z: pos.z };
            const geo = this.projection.project(endPos);
            points.push({ lat: geo.lat, lon: geo.lon });
        }
        return points;
    }

    private calculateWEZPolygon(pos: any, combat: CombatComponent | undefined): any[] {
        const maxRange = this.calculateMaxWEZ(combat);
        if (maxRange === 0) return [];
        const points = [];
        for (let i = 0; i < 16; i++) {
            const angle = (i * 2 * Math.PI) / 16;
            const endPos = { x: pos.x + Math.cos(angle) * maxRange, y: pos.y + Math.sin(angle) * maxRange, z: pos.z };
            const geo = this.projection.project(endPos);
            points.push({ lat: geo.lat, lon: geo.lon });
        }
        return points;
    }

    private deduplicateTracks(tracks: any[]): any[] {
        const fused = new Map<string, any>();
        for (const t of tracks) {
            const existing = fused.get(t.id);
            if (!existing || t.cep < existing.cep) {
                fused.set(t.id, t);
            }
        }
        return Array.from(fused.values());
    }

    public setOrigin(lat: number, lon: number): void {
        this.projection.setOrigin(lat, lon);
    }
}
