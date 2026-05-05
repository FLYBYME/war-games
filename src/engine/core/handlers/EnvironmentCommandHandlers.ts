import { CommandHandler } from '../CommandDispatcher.js';
import { World } from '../World.js';
import { UpdateEnvironmentCommand, SetEnvironmentCommand } from '../Command.js';
import { EnvironmentComponent } from '../../components/Environment.js';
import { EnvironmentSystem } from '../../systems/EnvironmentSystem.js';

export class UpdateEnvironmentHandler implements CommandHandler<UpdateEnvironmentCommand> {
    execute(cmd: UpdateEnvironmentCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const env = entity?.getComponent(EnvironmentComponent);
        if (env) {
            env.terrainHeightM = cmd.terrainHeightM;
            env.airDensity = cmd.airDensity;
            env.pressureRatio = cmd.pressureRatio;
            env.isGrounded = cmd.isGrounded;
            env.waterTemperatureC = cmd.waterTemperatureC;
            env.soundSpeedMPS = cmd.soundSpeedMPS;
            env.layerDepthM = cmd.layerDepthM;
            env.isSubmerged = cmd.isSubmerged;
            env.precipitationRateMMhr = cmd.precipitationRateMMhr;
            env.cloudCover = cmd.cloudCover;
            env.seaState = cmd.seaState;
        }
    }
}

export class SetEnvironmentHandler implements CommandHandler<SetEnvironmentCommand> {
    execute(cmd: SetEnvironmentCommand, world: World): void {
        const envSystem = (world as any).systems.find((s: any) => s.name === 'EnvironmentSystem') as EnvironmentSystem;
        if (envSystem) {
            if (cmd.key in envSystem.globalWeather) {
                (envSystem.globalWeather as any)[cmd.key] = cmd.value;
            }
        }
    }
}
