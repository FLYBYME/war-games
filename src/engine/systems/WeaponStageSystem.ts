import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, UpdateThrustCommand, NextWeaponStageCommand, UpdateStageTicksCommand, DestroyEntityCommand } from '../core/Command.js';
import { WeaponStageComponent } from '../components/WeaponStages.js';
import { FuelComponent } from '../components/Propulsion.js';
import { GuidanceComponent } from '../components/Guidance.js';
import { logger } from '../core/Logger.js';

/**
 * WeaponStageSystem: Manages multi-stage weapon transitions and self-destruction.
 */
export class WeaponStageSystem implements ISystem {
    readonly name = 'WeaponStageSystem';
    readonly phase = SystemPhase.Lifecycle;
    readonly dependencies = [];

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const ws = entity.getComponent(WeaponStageComponent);
            const fuel = entity.getComponent(FuelComponent);
            const guidance = entity.getComponent(GuidanceComponent);

            // 1. Self-Destruct Check (Test 98)
            // If no fuel remains AND lock is lost for too long (20s / 200 ticks), self-destruct
            if (fuel && fuel.currentKg <= 0 && guidance) {
                const ticksSinceLock = world.currentTick - guidance.lastLockTick;
                if (ticksSinceLock > 200) {
                    logger.info(`Munition ${entity.id} self-destructing (fuel exhausted and lock lost)`);
                    commands.push(new DestroyEntityCommand(entity.id));
                    continue;
                }
            }

            if (!ws) continue;

            const currentStage = ws.stages[ws.currentStageIndex];
            if (!currentStage) continue;

            const nextElapsed = ws.currentStageElapsedTicks + 1;
            if (nextElapsed >= currentStage.durationTicks) {
                if (ws.currentStageIndex < ws.stages.length - 1) {
                    commands.push(new NextWeaponStageCommand(entity.id));
                    const nextStage = ws.stages[ws.currentStageIndex + 1];
                    commands.push(new UpdateThrustCommand(entity.id, nextStage.thrustN));
                    logger.info(`Weapon ${entity.id} advanced to stage: ${nextStage.name}`);
                } else {
                    commands.push(new UpdateThrustCommand(entity.id, 0));
                }
            } else {
                commands.push(new UpdateThrustCommand(entity.id, currentStage.thrustN));
                commands.push(new UpdateStageTicksCommand(entity.id, 1));
            }
        }

        return commands;
    }
}
