import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, DetonateCommand } from '../core/Command.js';
import { TransformComponent } from '../components/Physics.js';
import { VectorMath } from '../math/VectorMath.js';
import { ProfileRegistry } from '../core/ProfileRegistry.js';
import { EntityProfile } from '../core/Types.js';

/**
 * MineTriggerSystem: Evaluates proximity detonation for static mines.
 */
export class MineTriggerSystem implements ISystem {
    readonly name = 'MineTriggerSystem';
    readonly phase = SystemPhase.Decision;
    readonly dependencies = ['PhysicsSystem'];

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const mine of world.getEntities()) {
            const profileRegistry = world.profileRegistry as ProfileRegistry;
            const profile = profileRegistry.get(mine.profileId || '') as EntityProfile | undefined;
            if (profile?.type !== 'Mine') continue;

            const transform = mine.getComponent(TransformComponent);
            if (!transform) continue;

            // Simple proximity trigger
            const triggerRadius = 50; 
            const nearby = world.getNearbyEntities(transform.position, triggerRadius);

            for (const target of nearby) {
                if (target.id === mine.id) continue;
                if (target.side === mine.side) continue; // Selective triggering

                const targetTransform = target.getComponent(TransformComponent);
                if (targetTransform) {
                    const dist = VectorMath.distance(transform.position, targetTransform.position);
                    if (dist < triggerRadius) {
                        commands.push(new DetonateCommand(mine.id, 100, 500));
                        break; 
                    }
                }
            }
        }

        return commands;
    }
}
