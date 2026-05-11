import { CommandHandler } from '../CommandDispatcher.js';
import { 
    AddDetectionCommand, RemoveDetectionCommand, SetSensorStateCommand, 
    SetEMCONCommand, UpdateSensorScanCommand, UpdateMountSlewCommand, SyncESMBearingsCommand
} from '../Command.js';
import { World } from '../World.js';
import type { ESMBearing } from '../Types.js';
import { SensorComponent, DetectionComponent } from '../../components/Sensors.js';
import { CombatComponent } from '../../components/Combat.js';
import { EMCONState } from '../Types.js';
import { DoctrineComponent } from '../../components/Doctrine.js';

export class AddDetectionHandler implements CommandHandler<AddDetectionCommand> {
    execute(cmd: AddDetectionCommand, world: World): void {
        const observer = world.getEntity(cmd.entityId);
        const detection = observer?.getComponent(DetectionComponent);
        if (detection) {
            if (!detection.detectedEntityIds.has(cmd.targetId)) {
                detection.detectedEntityIds.add(cmd.targetId);
                
                world.recordEvent({
                    tick: world.currentTick,
                    type: 'Detection',
                    entityId: cmd.entityId,
                    targetId: cmd.targetId,
                    data: {
                        sensorType: 'Manual',
                        rangeM: 0,
                        bearing: 0
                    }
                });
            }
        }
    }
}

export class RemoveDetectionHandler implements CommandHandler<RemoveDetectionCommand> {
    execute(cmd: RemoveDetectionCommand, _world: World): void {
        const observer = _world.getEntity(cmd.entityId);
        const detection = observer?.getComponent(DetectionComponent);
        if (detection) {
            detection.detectedEntityIds.delete(cmd.targetId);
        }
    }
}

export class SetSensorStateHandler implements CommandHandler<SetSensorStateCommand> {
    execute(cmd: SetSensorStateCommand, _world: World): void {
        const entity = _world.getEntity(cmd.entityId);
        const sensors = entity?.getComponents(SensorComponent);
        if (sensors) {
            const target = sensors.find(s => s.name === cmd.sensorName);
            if (target) target.isActive = cmd.active;
        }
    }
}

export class SetEMCONHandler implements CommandHandler<SetEMCONCommand> {
    execute(cmd: SetEMCONCommand, _world: World): void {
        if (cmd.entityId === 'GLOBAL') {
             // For simplicity, just update the doctrine on all entities
             for (const entity of _world.getEntities()) {
                 const doctrine = entity.getComponent(DoctrineComponent);
                 if (doctrine) doctrine.emcon = cmd.state as EMCONState;
             }
        } else {
            const entity = _world.getEntity(cmd.entityId);
            const doctrine = entity?.getComponent(DoctrineComponent);
            if (doctrine) doctrine.emcon = cmd.state as EMCONState;
        }
    }
}

export class UpdateSensorScanHandler implements CommandHandler<UpdateSensorScanCommand> {
    execute(cmd: UpdateSensorScanCommand, _world: World): void {
        const entity = _world.getEntity(cmd.entityId);
        const sensors = entity?.getComponents(SensorComponent);
        if (sensors) {
            sensors.forEach(s => {
                if (s.scanPeriodS > 0) s.currentAzimuth = cmd.azimuth;
            });
        }
    }
}

export class UpdateMountSlewHandler implements CommandHandler<UpdateMountSlewCommand> {
    execute(cmd: UpdateMountSlewCommand, _world: World): void {
        const entity = _world.getEntity(cmd.entityId);
        const combat = entity?.getComponent(CombatComponent);
        if (combat && combat.mounts[cmd.mountIndex]) {
            const mount = combat.mounts[cmd.mountIndex];
            mount.currentAzimuth = cmd.azimuth;
            mount.currentElevation = cmd.elevation;
        }
    }
}

export class SyncESMBearingsHandler implements CommandHandler<SyncESMBearingsCommand> {
    execute(cmd: SyncESMBearingsCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const detection = entity?.getComponent(DetectionComponent);
        if (detection) {
            detection.esmBearings = cmd.bearings as ESMBearing[];
        }
    }
}
