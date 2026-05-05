import { CommandHandler } from '../CommandDispatcher.js';
import { World } from '../World.js';
import { 
    UpdateMountSlewCommand, 
    UpdateSensorScanCommand, 
    SetSensorStateCommand, 
    SetEMCONCommand,
    AddDetectionCommand,
    RemoveDetectionCommand,
    SyncESMBearingsCommand
} from '../Command.js';
import { CombatComponent } from '../../components/Combat.js';
import { SensorComponent, DetectionComponent } from '../../components/Sensors.js';
import { EventSeverity } from '../../components/Telemetry.js';

export class AddDetectionHandler implements CommandHandler<AddDetectionCommand> {
    execute(cmd: AddDetectionCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const detection = entity?.getComponent(DetectionComponent);
        if (detection) {
            if (!detection.detectedEntityIds.has(cmd.targetId)) {
                // logger.debug(`[AddDetectionHandler] Adding ${cmd.targetId} to ${cmd.entityId}`);
                detection.detectedEntityIds.add(cmd.targetId);
                
                world.recordEvent({
                    tick: world.currentTick,
                    severity: EventSeverity.Info,
                    category: 'SENSORS',
                    message: `New detection: ${cmd.targetId} by ${cmd.entityId}`,
                    entityId: cmd.entityId,
                    payload: { targetId: cmd.targetId }
                });
            }
        }
    }
}

export class RemoveDetectionHandler implements CommandHandler<RemoveDetectionCommand> {
    execute(cmd: RemoveDetectionCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const detection = entity?.getComponent(DetectionComponent);
        if (detection) {
            detection.detectedEntityIds.delete(cmd.targetId);
        }
    }
}

export class SyncESMBearingsHandler implements CommandHandler<SyncESMBearingsCommand> {
    execute(cmd: SyncESMBearingsCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const detection = entity?.getComponent(DetectionComponent);
        if (detection) {
            detection.esmBearings = cmd.bearings;
        }
    }
}

export class UpdateMountSlewHandler implements CommandHandler<UpdateMountSlewCommand> {
    execute(cmd: UpdateMountSlewCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const combat = entity?.getComponent(CombatComponent);
        if (combat && combat.mounts[cmd.mountIndex]) {
            combat.mounts[cmd.mountIndex].currentAzimuth = cmd.azimuth;
            combat.mounts[cmd.mountIndex].currentElevation = cmd.elevation;
        }
    }
}

export class UpdateSensorScanHandler implements CommandHandler<UpdateSensorScanCommand> {
    execute(cmd: UpdateSensorScanCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const sensor = entity?.getComponent(SensorComponent);
        if (sensor) {
            sensor.currentAzimuth = cmd.azimuth;
        }
    }
}

export class SetSensorStateHandler implements CommandHandler<SetSensorStateCommand> {
    execute(cmd: SetSensorStateCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const sensors = entity?.getComponents(SensorComponent) || [];
        const sensor = sensors.find(s => s.name === cmd.sensorName);
        if (sensor) sensor.isActive = cmd.active;
    }
}

export class SetEMCONHandler implements CommandHandler<SetEMCONCommand> {
    execute(cmd: SetEMCONCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const sensors = entity?.getComponents(SensorComponent) || [];
        for (const sensor of sensors) {
            sensor.emconState = cmd.state;
            if (cmd.state === 'Silent') {
                sensor.isActive = false;
            } else if (cmd.state === 'Active') {
                sensor.isActive = true;
            }
        }
    }
}
