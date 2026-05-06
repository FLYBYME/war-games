import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command } from '../core/Command.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { TelemetryComponent, TacticalEvent, EventSeverity } from '../components/Telemetry.js';
import { HealthComponent } from '../components/Health.js';
import { VectorMath } from '../math/VectorMath.js';

/**
 * TelemetrySystem: Captures sim milestones and historical kinematic data.
 */
export class TelemetrySystem implements ISystem {
    readonly name = 'TelemetrySystem';
    readonly phase = SystemPhase.Bridge;
    readonly dependencies = ['PhysicsSystem'];

    private events: TacticalEvent[] = [];
    private sideLosses: Map<string, number> = new Map([
        ['Blue', 0],
        ['Red', 0],
        ['Neutral', 0]
    ]);
    private munitionsExpended: number = 0;

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        // Telemetry is reactive; process is mostly a no-op unless we do periodic aggregation.
        // During the first run, we subscribe to the world event bus.
        if (!(world as any)._telemetrySubscribed) {
            (world as any).events.on('TacticalEvent', (event: TacticalEvent) => {
                this.recordEvent(event);
            });
            (world as any).events.on('WeaponFired', () => {
                this.munitionsExpended++;
            });
            (world as any)._telemetrySubscribed = true;
        }

        // 1. Capture Kinematics for units with TelemetryComponent
        for (const entity of world.getEntities()) {
            const tel = entity.getComponent(TelemetryComponent);
            const transform = entity.getComponent(TransformComponent);
            const kin = entity.getComponent(KinematicsComponent);

            if (tel && transform) {
                const speed = kin ? (VectorMath.magnitude(kin.velocity) * 1.94384) : 0; // m/s to knots
                tel.record({
                    tick: world.currentTick,
                    pos: { ...transform.position },
                    speedKts: speed,
                    altM: transform.position.z
                });
                if (entity.id === 'ship-1' && world.currentTick % 100 === 0) console.log(`Telemetry recorded for ship-1: ${tel.history.length} samples`);
            }
        }

        return [];
    }

    /**
     * recordEvent: Manual entry for tactical events (can be called by other systems).
     */
    public recordEvent(event: TacticalEvent): void {
        this.events.push(event);
        if (event.category === 'LOSS' && event.payload) {
            const side = event.payload.side || 'Unknown';
            const value = event.payload.pointValue || 100;
            const current = this.sideLosses.get(side) || 0;
            this.sideLosses.set(side, current + value);
        }

        if (this.events.length > 1000) {
            this.events.shift();
        }
    }

    public getLosses() {
        return {
            blue: this.sideLosses.get('Blue') || 0,
            red: this.sideLosses.get('Red') || 0,
            munitionsExpended: this.munitionsExpended
        };
    }

    public getRecentEvents(count: number = 50): TacticalEvent[] {
        return this.events.slice(-count);
    }
}

