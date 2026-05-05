import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, SetThrustCommand, NextWeaponStageCommand, UpdateStageTicksCommand } from '../core/Command.js';
import { WeaponStageComponent } from '../components/WeaponStages.js';
import { logger } from '../core/Logger.js';

/**
 * WeaponStageSystem: Manages multi-stage weapon transitions.
 */
export class WeaponStageSystem implements ISystem {
    readonly name = 'WeaponStageSystem';
    readonly phase = SystemPhase.Lifecycle;
    readonly dependencies = [];

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const ws = entity.getComponent(WeaponStageComponent);
            if (!ws) continue;

            const currentStage = ws.stages[ws.currentStageIndex];
            if (!currentStage) continue;

            const nextElapsed = ws.currentStageElapsedTicks + 1;
            if (nextElapsed >= currentStage.durationTicks) {
                if (ws.currentStageIndex < ws.stages.length - 1) {
                    commands.push(new NextWeaponStageCommand(entity.id));
                    const nextStage = ws.stages[ws.currentStageIndex + 1];
                    commands.push(new SetThrustCommand(entity.id, nextStage.thrustN));
                    logger.info(`Weapon ${entity.id} advanced to stage: ${nextStage.name}`);
                } else {
                    commands.push(new SetThrustCommand(entity.id, 0));
                }
            } else {
                commands.push(new SetThrustCommand(entity.id, currentStage.thrustN));
                commands.push(new UpdateStageTicksCommand(entity.id, 1));
            }
        }

        return commands;
    }
}
