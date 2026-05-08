import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command } from '../core/Command.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { TelemetryComponent } from '../components/Telemetry.js';
import { VectorMath } from '../math/VectorMath.js';
import { SimulationEvent, Side } from '../core/Types.js';

/**
 * TelemetrySystem: Captures sim milestones and historical kinematic data.
 */
export class TelemetrySystem implements ISystem {
    readonly name = 'TelemetrySystem';
    readonly phase = SystemPhase.Bridge;
    readonly dependencies = ['PhysicsSystem'];

    private events: SimulationEvent[] = [];
    private sideLosses: Map<Side, number> = new Map([
        [Side.Blue, 0],
        [Side.Red, 0],
        [Side.Neutral, 0]
    ]);
    private munitionsExpended: number = 0;
    private subscribed = false;

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        // Telemetry is reactive; process is mostly a no-op unless we do periodic aggregation.
        // During the first run, we subscribe to the world event bus.
        if (!this.subscribed) {
            world.events.onAny((event: SimulationEvent) => {
                this.recordEvent(event);
            });
            world.events.on('WeaponFired', () => {
                this.munitionsExpended++;
            });
            this.subscribed = true;
        }

        // 1. Capture Kinematics for units with TelemetryComponent
        for (const entity of world.getEntities()) {
            const tel = entity.getComponent(TelemetryComponent);
            const transform = entity.getComponent(TransformComponent);
            const kin = entity.getComponent(KinematicsComponent);

            if (tel && transform) {
                const speed = kin ? (VectorMath.magnitude(kin.velocity) * 1.94384) : 0; // m/s to knots
                
                tel.history.push({
                    tick: world.currentTick,
                    pos: { ...transform.position },
                    speedKts: speed,
                    altM: transform.position.z
                });

                if (tel.history.length > tel.maxHistory) {
                    tel.history.shift();
                }
            }
        }

        return [];
    }

    /**
     * recordEvent: Manual entry for tactical events (can be called by other systems).
     */
    public recordEvent(event: SimulationEvent): void {
        this.events.push(event);
        
        // Handle side losses (e.g. from EntityDestroyed)
        if (event.type === 'EntityDestroyed' && event.data) {
            const data = event.data as { side?: Side, pointValue?: number };
            const side = data.side || Side.Neutral;
            const value = data.pointValue || 100;
            const current = this.sideLosses.get(side) || 0;
            this.sideLosses.set(side, current + value);
        }

        if (this.events.length > 1000) {
            this.events.shift();
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
}
