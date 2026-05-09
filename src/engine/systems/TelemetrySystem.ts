import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command } from '../core/Command.js';
import { TransformComponent, KinematicsComponent, SideComponent } from '../components/Physics.js';
import { HealthComponent } from '../components/Health.js';
import { FuelComponent } from '../components/Propulsion.js';
import { MissionComponent } from '../components/Missions.js';
import { TelemetryComponent, KinematicSnapshot } from '../components/Telemetry.js';
import { VectorMath } from '../math/VectorMath.js';
import { SimulationEvent, Side } from '../core/Types.js';

/**
 * TelemetrySystem: Captures sim milestones and historical kinematic data.
 */
export class TelemetrySystem implements ISystem {
    readonly name = 'TelemetrySystem';
    readonly phase = SystemPhase.Bridge;
    readonly dependencies = ['PhysicsSystem'];
    
    public externalWriter?: {
        writeTelemetry: (data: any) => Promise<void>;
        writeEvent: (event: SimulationEvent) => Promise<void>;
    };

    private events: SimulationEvent[] = [];


    private sideLosses: Map<Side, number> = new Map([
        [Side.Blue, 0],
        [Side.Red, 0],
        [Side.Neutral, 0]
    ]);
    private munitionsExpended: number = 0;
    private subscribed = false;
    private tombstones: Map<string, KinematicSnapshot[]> = new Map();

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        // Telemetry is reactive; process is mostly a no-op unless we do periodic aggregation.
        // During the first run, we subscribe to the world event bus.
        if (!this.subscribed) {
            world.events.onAny((event: SimulationEvent) => {
                this.recordEvent(event, world);
            });
            world.events.on('WeaponFired', () => {
                this.munitionsExpended++;
                if (this.externalWriter) {
                    this.externalWriter.writeEvent({ type: 'WeaponFired', tick: world.currentTick, data: {} });
                }
            });
            this.subscribed = true;
        }

        // 1. Capture Kinematics for units with TelemetryComponent
        for (const entity of world.getEntities()) {
            const tel = entity.getComponent(TelemetryComponent);
            const transform = entity.getComponent(TransformComponent);
            const kin = entity.getComponent(KinematicsComponent);
            const health = entity.getComponent(HealthComponent);
            const fuel = entity.getComponent(FuelComponent);
            const mission = entity.getComponent(MissionComponent);

            if (tel && transform) {
                const speed = kin ? (VectorMath.magnitude(kin.velocity) * 1.94384) : 0; // m/s to knots
                const fuelPct = (fuel && fuel.maxKg > 0) ? (fuel.currentKg / fuel.maxKg) : 1.0;
                
                tel.history.push({
                    tick: world.currentTick,
                    pos: { ...transform.position },
                    speedKts: speed,
                    altM: transform.position.z,
                    hp: health?.hp ?? 100,
                    isDestroyed: health?.isDestroyed ?? false,
                    fuelPct,
                    mission: mission ? {
                        type: mission.missionType,
                        status: mission.status
                    } : undefined
                });

                if (tel.history.length > tel.maxHistory) {
                    tel.history.shift();
                }

                if (this.externalWriter) {
                    this.externalWriter.writeTelemetry({
                        tick: world.currentTick,
                        entityId: entity.id,
                        side: entity.getComponent(SideComponent)?.side || 'Neutral',
                        x: transform.position.x,
                        y: transform.position.y,
                        z: transform.position.z,
                        speedKts: speed,
                        heading: transform.heading,
                        hp: health?.hp ?? 100,
                        isDestroyed: health?.isDestroyed ?? false,
                        fuelPct,
                        missionType: mission?.missionType,
                        missionStatus: mission?.status
                    }).catch(console.error);
                }
            }
        }

        return [];
    }

    /**
     * recordEvent: Manual entry for tactical events (can be called by other systems).
     */
    public recordEvent(event: SimulationEvent, world?: IWorldView): void {
        const ignore = ['TickCompleted', 'ViewStateUpdated', 'metrics:performance'];
        if (ignore.includes(event.type)) return;

        this.events.push(event);

        if (event.type === 'EntityRemoved' && event.entityId && world) {
            const entity = world.getEntity(event.entityId);
            const tel = entity?.getComponent(TelemetryComponent);
            if (tel) {
                this.tombstones.set(event.entityId, [...tel.history]);
            }
        }
        
        // Handle side losses (e.g. from EntityDestroyed)
        const e = event as any; // Narrowing union access for telemetry purposes
        if (event.type === 'EntityDestroyed' && e.data) {
            const side = e.data.side || Side.Neutral;
            const value = e.data.pointValue || 100;
            const current = this.sideLosses.get(side) || 0;
            this.sideLosses.set(side, current + value);
        }

        if (this.events.length > 1000) {
            this.events.shift();
        }

        if (this.externalWriter) {
            const e = event as any;
            this.externalWriter.writeEvent({
                tick: world?.currentTick || 0,
                type: event.type,
                entityId: e.entityId,
                data: JSON.stringify(e.data || {})
            } as any).catch(console.error);
        }
    }

    public getLosses() {
        return {
            blue: this.sideLosses.get(Side.Blue) || 0,
            red: this.sideLosses.get(Side.Red) || 0,
            munitionsExpended: this.munitionsExpended
        };
    }

    public getRecentEvents(count: number = 50): SimulationEvent[] {
        return this.events.slice(-count);
    }

    public getEntityHistory(entityId: string, world: IWorldView, count?: number): KinematicSnapshot[] | undefined {
        let history: KinematicSnapshot[] | undefined;
        const entity = world.getEntity(entityId);
        if (entity) {
            const tel = entity.getComponent(TelemetryComponent);
            history = tel?.history;
        } else {
            history = this.tombstones.get(entityId);
        }

        if (!history) return undefined;

        if (count && history.length > count) {
            const result = [];
            for (let i = 0; i < count; i++) {
                const index = Math.floor((i / (count - 1)) * (history.length - 1));
                result.push(history[index]);
            }
            return result;
        }

        return history;
    }
}
