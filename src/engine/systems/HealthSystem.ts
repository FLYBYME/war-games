import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, ApplyDamageCommand, DestroyEntityCommand } from '../core/Command.js';
import { HealthComponent } from '../components/Health.js';

/**
 * HealthSystem: Damage & Lifecycle.
 * Processes external damage events (like impacts).
 */
export class HealthSystem implements ISystem {
    readonly name = 'HealthSystem';
    readonly phase = SystemPhase.Lifecycle;
    readonly dependencies = ['CombatSystem'];

    private destructionTicks = new Map<string, number>();

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const health = entity.getComponent(HealthComponent);
            if (!health) continue;

            if (health.isDestroyed || health.hp <= 0) {
                if (!health.isDestroyed) health.isDestroyed = true;

                if (!this.destructionTicks.has(entity.id)) {
                    this.destructionTicks.set(entity.id, world.currentTick);
                }

                const delay = 10; // 1 second at 10Hz
                if (world.currentTick - this.destructionTicks.get(entity.id)! >= delay) {
                    commands.push(new DestroyEntityCommand(entity.id));
                    this.destructionTicks.delete(entity.id);
                }
            }
        }

        return commands;
    }
}
