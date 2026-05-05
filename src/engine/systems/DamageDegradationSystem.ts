import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, ApplyDamageCommand, ApplySubsystemDamageCommand } from '../core/Command.js';
import { HealthComponent, SubsystemType } from '../components/Health.js';

/**
 * DamageDegradationSystem: Processes over-time effects like fires and flooding.
 * Handles the transition from a "Functional" state to a "Mission Kill".
 */
export class DamageDegradationSystem implements ISystem {
    readonly name = 'DamageDegradationSystem';
    readonly phase = SystemPhase.Lifecycle;
    readonly dependencies = ['CombatSystem']; // Process after immediate hits

    public async process(world: IWorldView, dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const health = entity.getComponent(HealthComponent);
            if (!health || health.isDestroyed) continue;

            // 1. Fire Degradation
            if (health.fires > 0) {
                // Fires cause structural damage every second
                const fireDamage = health.fires * 2 * dt;
                commands.push(new ApplyDamageCommand(entity.id, fireDamage));

                // Fires have a chance to spread to subsystems
                if (Math.random() < (0.1 * health.fires * dt)) {
                    const functionalSubs = health.subsystems.filter(s => s.isFunctional);
                    if (functionalSubs.length > 0) {
                        const targetSub = functionalSubs[Math.floor(Math.random() * functionalSubs.length)];
                        commands.push(new ApplySubsystemDamageCommand(entity.id, targetSub.id, 10 * dt));
                    }
                }
            }

            // 2. Flooding Degradation
            if (health.flooding > 0) {
                // Flooding causes severe structural integrity loss
                const floodingRate = health.flooding * 0.05 * dt; // 5% integrity per second at max flooding
                const newIntegrity = Math.max(0, health.structuralIntegrity - floodingRate);
                
                // If integrity hits 0, the ship sinks
                if (newIntegrity <= 0) {
                    commands.push(new ApplyDamageCommand(entity.id, health.hp + 1)); // Instant kill
                }

                // Update integrity (via some command or direct update - using a generic command here)
                // In a professional sim, we'd have a specific UpdateIntegrityCommand
            }

            // 3. Automated Damage Control (Simplified)
            // Chance to put out fires or patch flooding based on crew/tech level
            if (health.fires > 0 && Math.random() < (0.05 * dt)) {
                // Fire extinguished
                // commands.push(new SetConditionCommand(entity.id, 'fires', health.fires - 1));
            }
        }

        return commands;
    }
}
