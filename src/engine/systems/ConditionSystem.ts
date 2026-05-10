import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, ApplyDamageCommand } from '../core/Command.js';
import { HealthComponent } from '../components/Health.js';

/**
 * ConditionSystem: Processes damage over time from fires and flooding.
 */
export class ConditionSystem implements ISystem {
    readonly name = 'ConditionSystem';
    readonly phase = SystemPhase.Lifecycle;
    readonly dependencies = ['HealthSystem'];

    public async process(world: IWorldView, dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const health = entity.getComponent(HealthComponent);
            if (!health || health.isDestroyed) continue;

            // 1. Fire Damage (Test 108)
            if (health.fires > 0) {
                const fireDamage = health.fires * 5.0 * dt;
                commands.push(new ApplyDamageCommand(entity.id, fireDamage));
                
                // Fire spread chance (Simplified)
                if (world.random.next() < 0.05 * dt) {
                    health.fires++;
                }
            }

            // 2. Flooding Damage (Test 108)
            if (health.flooding > 0) {
                const floodDamage = health.flooding * 3.0 * dt;
                commands.push(new ApplyDamageCommand(entity.id, floodDamage));
                
                // Slow down entity due to weight (Simplified, affects kinematics indirectly)
            }
        }

        return commands;
    }
}
