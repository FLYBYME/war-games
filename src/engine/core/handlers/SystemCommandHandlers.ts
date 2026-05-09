import { CommandHandler } from '../CommandDispatcher.js';
import { World } from '../World.js';
import { SpawnEntityCommand, ChangeSideCommand, SetSimulationSpeedCommand, SetEnvironmentCommand, UpdateEnvironmentCommand, AddDetectionCommand } from '../Command.js';
import { EntityManager } from '../EntityManager.js';
import { EnvironmentComponent } from '../../components/Environment.js';
import { DetectionComponent } from '../../components/Sensors.js';
import { logger } from '../Logger.js';

export class AddDetectionHandler implements CommandHandler<AddDetectionCommand> {
    execute(cmd: AddDetectionCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        if (entity) {
            let detection = entity.getComponent(DetectionComponent);
            if (!detection) {
                detection = new DetectionComponent();
                entity.addComponent(detection);
            }
            detection.detectedEntityIds.add(cmd.targetId);
            logger.info(`Manual detection added: ${entity.id} -> ${cmd.targetId}`);
        }
    }
}

export class UpdateEnvironmentHandler implements CommandHandler<UpdateEnvironmentCommand> {
    execute(cmd: UpdateEnvironmentCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        if (entity) {
            const env = entity.getComponent(EnvironmentComponent);
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
}

export class SetEnvironmentHandler implements CommandHandler<SetEnvironmentCommand> {
    execute(cmd: SetEnvironmentCommand, world: World): void {
        for (const entity of world.getEntities()) {
            const env = entity.getComponent(EnvironmentComponent);
            if (env) {
                if (cmd.key === 'windSpeedKts') env.windVelocity.x = cmd.value as number;
                if (cmd.key === 'temperatureC') env.temperatureC = cmd.value as number;
            }
        }
    }
}

export class SpawnEntityHandler implements CommandHandler<SpawnEntityCommand> {
    execute(cmd: SpawnEntityCommand, world: World): void {
        const entityMgr = new EntityManager(world, world.profileRegistry);
        try {
            entityMgr.spawn({
                id: cmd.id,
                profileId: cmd.profileId,
                side: cmd.side,
                pos: [cmd.position.x, cmd.position.y, cmd.position.z],
                heading: cmd.heading
            });
            logger.info(`Entity spawned via command: ${cmd.id}`, { profileId: cmd.profileId, side: cmd.side });
        } catch (err) {
            logger.error(`Failed to spawn entity via command: ${cmd.id}`, { error: err });
        }
    }
}

export class ChangeSideHandler implements CommandHandler<ChangeSideCommand> {
    execute(cmd: ChangeSideCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        if (entity) {
            const oldSide = entity.side;
            entity.side = cmd.newSide;
            logger.info(`Entity side changed: ${entity.id}`, { from: oldSide, to: cmd.newSide });

            world.events.emit({
                type: 'EntitySideChanged',
                tick: world.currentTick,
                entityId: entity.id,
                data: {
                    oldSide,
                    newSide: cmd.newSide
                }
            });
        }
    }
}

export class SetSimulationSpeedHandler implements CommandHandler<SetSimulationSpeedCommand> {
    execute(cmd: SetSimulationSpeedCommand, world: World): void {
        const rate = cmd.timeCompression;
        const isPaused = cmd.isPaused ?? (rate === 0);

        world.clock.setCompression(rate === 0 ? 1.0 : rate);
        world.clock.setPaused(isPaused);

        world.events.emit({
            type: 'SimulationSpeedChanged',
            tick: world.currentTick,
            data: {
                timeCompression: rate,
                isPaused
            }
        });

        logger.info(`Simulation speed updated: ${rate}x (paused: ${isPaused})`);
    }
}
