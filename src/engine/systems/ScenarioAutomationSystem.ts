import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command } from '../core/Command.js';
import { ScenarioEvent, ScenarioAssertion, ScenarioTrigger } from '../core/Types.js';
import { CommandFactory } from '../core/CommandFactory.js';
import { Side, SimulationEvent, EngineCommandPayload } from '../core/Types.js';
import { KinematicsComponent, TransformComponent } from '../components/Physics.js';
import { FuelComponent } from '../components/Propulsion.js';
import { HealthComponent } from '../components/Health.js';
import { VectorMath } from '../math/VectorMath.js';
import { logger } from '../core/Logger.js';

/**
 * ScenarioAutomationSystem: Executes scripted events and validates assertions.
 * Supports Tick, Tactical Event, Proximity, and Condition triggers.
 */
export class ScenarioAutomationSystem implements ISystem {
    readonly name = 'ScenarioAutomationSystem';
    readonly phase = SystemPhase.Doctrine;
    readonly dependencies = [];

    private events: ScenarioEvent[] = [];
    private assertions: ScenarioAssertion[] = [];
    private triggeredEvents: ScenarioEvent[] = [];
    private occurredEventTypes = new Set<string>();
    private assertionResults: { type: string, tick: number, success: boolean, message: string }[] = [];

    public setup(events: ScenarioEvent[], assertions: ScenarioAssertion[], world: IWorldView) {
        // Normalize events: if tick is present but no trigger, create a tick trigger
        this.events = events.map(e => {
            if (e.tick !== undefined && !e.trigger) {
                return { ...e, trigger: { type: 'tick', tick: e.tick } } as ScenarioEvent;
            }
            return e;
        });

        this.assertions = assertions.map(a => {
            if ('tick' in a && a.tick !== undefined && !('trigger' in a && a.trigger)) {
                return { ...a, trigger: { type: 'tick' as const, tick: a.tick } };
            }
            return a;
        });

        this.triggeredEvents = [];
        this.occurredEventTypes.clear();
        this.assertionResults = [];

        // Subscribe to all events for tracking and triggers
        world.events.onAny((evt: SimulationEvent) => {
            if (evt.type) this.occurredEventTypes.add(evt.type);
            this.handleTacticalEvent(evt);
        });
        
        logger.info(`Automation Setup: ${this.events.length} events, ${this.assertions.length} assertions`);
    }

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        // 1. Evaluate Proximity & Condition Triggers
        const remainingEvents: ScenarioEvent[] = [];
        for (const event of this.events) {
            let triggered = false;
            const trigger = event.trigger;

            if (!trigger) continue;

            if (trigger.type === 'tick') {
                if (trigger.tick <= world.currentTick) triggered = true;
            } else if (trigger.type === 'proximity') {
                const e1 = world.getEntity(trigger.entityId);
                const e2 = world.getEntity(trigger.targetId);
                if (e1 && e2) {
                    const t1 = e1.getComponent(TransformComponent);
                    const t2 = e2.getComponent(TransformComponent);
                    if (t1 && t2) {
                        const dist = VectorMath.distance(t1.position, t2.position);
                        if (dist <= trigger.radiusM) triggered = true;
                    }
                }
            } else if (trigger.type === 'condition') {
                triggered = this.evaluateCondition(world, trigger);
            }

            if (triggered) {
                this.triggeredEvents.push(event);
            } else if (trigger.type !== 'tactical_event') {
                // Tactical events are handled asynchronously via EventBus
                remainingEvents.push(event);
            } else {
                remainingEvents.push(event);
            }
        }
        this.events = remainingEvents;

        // 2. Execute Triggered Events
        while (this.triggeredEvents.length > 0) {
            const event = this.triggeredEvents.shift()!;
            try {
                const cmdPayload = event.command as EngineCommandPayload & { side?: Side };
                const side = cmdPayload.side || Side.Blue;
                const cmd = CommandFactory.create(cmdPayload, side);
                if (cmd) {
                    commands.push(cmd);
                    logger.info(`Scenario Automation: Triggered command ${event.command.type} at tick ${world.currentTick}`);
                }
            } catch (err: unknown) {
                const error = err as Error;
                logger.error(`Scenario Automation: Failed to trigger command`, { error: error.message });
            }
        }

        // 3. Evaluate Assertions
        const remainingAssertions: ScenarioAssertion[] = [];
        for (const assertion of this.assertions) {
            let evaluate = false;
            const trigger = 'trigger' in assertion ? (assertion.trigger as ScenarioTrigger | undefined) : undefined;

            if (!trigger) {
                // If no trigger, it might be a cumulative assertion (e.g. event_occurred byTick)
                if (assertion.type === 'event_occurred') {
                    if (assertion.byTick === undefined || world.currentTick >= assertion.byTick) {
                        evaluate = true;
                    } else {
                        remainingAssertions.push(assertion);
                        continue;
                    }
                } else {
                    continue;
                }
            }

            if (!evaluate && trigger) {
                if (trigger.type === 'tick') {
                    if (trigger.tick <= world.currentTick) evaluate = true;
                }
                if (!evaluate) {
                    // Other triggers for assertions (future work, keep it simple for now)
                    remainingAssertions.push(assertion);
                    continue;
                }
            }

            if (evaluate) {
                const passed = this.evaluateAssertion(world, assertion);
                if (!passed) {
                    // If it's a sticky assertion (like event_occurred without a trigger),
                    // we might want to keep checking it.
                    if (assertion.type === 'event_occurred') {
                        if (assertion.byTick === undefined || world.currentTick < assertion.byTick) {
                            remainingAssertions.push(assertion);
                            continue;
                        }
                    }
                }
            } else {
                remainingAssertions.push(assertion);
            }
        }
        this.assertions = remainingAssertions;

        return commands;
    }

    private handleTacticalEvent(evt: SimulationEvent) {
        const data = evt.data as { type?: string, category?: string } | undefined;
        
        if (data) {
            if (data.type) this.occurredEventTypes.add(data.type);
            if (data.category) this.occurredEventTypes.add(data.category);
        }

        const remainingEvents: ScenarioEvent[] = [];

        for (const event of this.events) {
            const trigger = event.trigger;
            if (trigger?.type === 'tactical_event' && data) {
                if (data.type === trigger.eventType || data.category === trigger.eventType) {
                    // TODO: Apply filters
                    this.triggeredEvents.push(event);
                } else {
                    remainingEvents.push(event);
                }
            } else {
                remainingEvents.push(event);
            }
        }
        this.events = remainingEvents;
    }

    private evaluateCondition(world: IWorldView, trigger: ScenarioTrigger): boolean {
        if (trigger.type !== 'condition') return false;
        
        const entity = world.getEntity(trigger.entityId);
        if (!entity) return false;

        let currentValue: number | undefined;

        if (trigger.property === 'hp_pct') {
            const health = entity.getComponent(HealthComponent);
            if (health) currentValue = (health.hp / health.maxHp) * 100;
        } else if (trigger.property === 'fuel_pct') {
            const fuel = entity.getComponent(FuelComponent);
            if (fuel) currentValue = (fuel.currentKg / fuel.maxKg) * 100;
        } else if (trigger.property === 'speed_kts') {
            const kin = entity.getComponent(KinematicsComponent);
            if (kin) currentValue = VectorMath.magnitude(kin.velocity) * 1.94384;
        }

        if (currentValue === undefined) return false;

        switch (trigger.operator) {
            case '<': return currentValue < trigger.value;
            case '>': return currentValue > trigger.value;
            case '==': return Math.abs(currentValue - trigger.value) < 0.1;
            default: return false;
        }
    }

    private evaluateAssertion(world: IWorldView, assertion: ScenarioAssertion): boolean {
        let success = false;
        let message = '';

        switch (assertion.type) {
            case 'exists': {
                const entity = world.getEntity(assertion.params.entityId);
                success = !!entity;
                message = success ? `Entity ${assertion.params.entityId} exists` : `Entity ${assertion.params.entityId} NOT found`;
                break;
            }
            case 'dead': {
                const entity = world.getEntity(assertion.params.entityId);
                success = !entity;
                message = success ? `Entity ${assertion.params.entityId} is dead` : `Entity ${assertion.params.entityId} is still alive`;
                break;
            }
            case 'speed_at_least': {
                const entity = world.getEntity(assertion.params.entityId);
                if (entity) {
                    const kin = entity.getComponent(KinematicsComponent);
                    if (kin) {
                        const speedKts = VectorMath.magnitude(kin.velocity) * 1.94384;
                        success = speedKts >= assertion.params.speedKts;
                        message = `Entity ${assertion.params.entityId} speed: ${speedKts.toFixed(1)} kts (Target: >= ${assertion.params.speedKts})`;
                    }
                }
                break;
            }
            case 'pos_within': {
                const entity = world.getEntity(assertion.params.entityId);
                if (entity) {
                    const transform = entity.getComponent(TransformComponent);
                    if (transform) {
                        const dist = VectorMath.distance(transform.position, assertion.params.position);
                        success = dist <= assertion.params.radiusM;
                        message = `Entity ${assertion.params.entityId} distance to target: ${dist.toFixed(0)}m (Target: <= ${assertion.params.radiusM}m)`;
                    }
                }
                break;
            }
            case 'event_occurred': {
                success = this.occurredEventTypes.has(assertion.event);
                message = success ? `Event ${assertion.event} occurred` : `Event ${assertion.event} NEVER occurred`;
                break;
            }
        }

        const tick = world.currentTick;
        this.assertionResults.push({
            type: assertion.type,
            tick,
            success,
            message
        });

        if (success) {
            logger.info(`Assertion PASSED [Tick ${tick}]: ${message}`);
        } else {
            // Only log failure if it's NOT a sticky assertion still in progress
            const isSticky = assertion.type === 'event_occurred' && (assertion.byTick === undefined || tick < assertion.byTick);
            if (!isSticky) {
                logger.warn(`Assertion FAILED [Tick ${tick}]: ${message}`);
            }
        }
        
        return success;
    }

    public getResults() {
        return this.assertionResults;
    }
}
