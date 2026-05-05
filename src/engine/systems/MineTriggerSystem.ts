import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, DetonateCommand } from '../core/Command.js';
import { DetectionComponent } from '../components/Sensors.js';
import { Side } from '../core/Types.js';
import { HealthComponent } from '../components/Health.js';

/**
 * MineTriggerSystem: Processes detonation logic for naval mines.
 * If a hostile entity is detected within the mine's trigger range, it explodes.
 */
export class MineTriggerSystem implements ISystem {
    readonly name = 'MineTriggerSystem';
    readonly phase = SystemPhase.Lifecycle;
    readonly dependencies = ['SensorSystem'];

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const profile = world.profileRegistry.get(entity.profileId);
            if (profile?.type !== 'Mine') continue;

            const detection = entity.getComponent(DetectionComponent);
            if (!detection) continue;

            const health = entity.getComponent(HealthComponent);
            if (health && health.hp <= 0) continue;

            // Check for hostile detections
            for (const targetId of detection.detectedEntityIds) {
                const target = world.getEntity(targetId);
                if (target && target.side !== entity.side && target.side !== Side.Neutral) {
                    // BOOM!
                    commands.push(new DetonateCommand(entity.id, 100, 500)); // radius, damage
                    break; // One detonation per mine
                }
            }
        }

        return commands;
    }
}
