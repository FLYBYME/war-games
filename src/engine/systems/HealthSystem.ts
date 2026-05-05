import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, ApplyDamageCommand } from '../core/Command.js';
import { HealthComponent } from '../components/Health.js';

/**
 * HealthSystem: Damage & Lifecycle.
 * Processes external damage events (like impacts).
 */
export class HealthSystem implements ISystem {
    readonly name = 'HealthSystem';
    readonly phase = SystemPhase.Lifecycle;
    readonly dependencies = ['CombatSystem'];

    public async process(_world: IWorldView, _dt: number): Promise<Command[]> {
        // In a more complex sim, this might process a damage buffer
        // For now, it's a placeholder for lifecycle maintenance
        return [];
    }
}
