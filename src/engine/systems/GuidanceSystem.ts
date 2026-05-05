import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command } from '../core/Command.js';
import { GuidanceComponent, GuidanceType } from '../components/Guidance.js';
import { SensorComponent, DetectionComponent } from '../components/Sensors.js';
import { SensorMode } from '../core/Types.js';

/**
 * GuidanceSystem: Manages weapon lock-on and illumination requirements.
 */
export class GuidanceSystem implements ISystem {
    readonly name = 'GuidanceSystem';
    readonly phase = SystemPhase.Forces;
    readonly dependencies = ['SensorSystem'];

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const guidance = entity.getComponent(GuidanceComponent);
            if (!guidance) continue;

            let hasLock = false;

            switch (guidance.guidanceType) {
                case GuidanceType.SARH:
                    hasLock = this.checkSARHLock(world, guidance);
                    break;
                case GuidanceType.ARH:
                    hasLock = this.checkARHLock(entity);
                    break;
                case GuidanceType.IR:
                    hasLock = this.checkIRLock(world, entity, guidance);
                    break;
                default:
                    hasLock = true; // INS/GPS/Command always "working" for now
            }

            guidance.hasLock = hasLock;
            if (hasLock) {
                guidance.lastLockTick = world.currentTick;
            }
        }

        return commands;
    }

    private checkSARHLock(world: IWorldView, guidance: GuidanceComponent): boolean {
        if (!guidance.illuminatorId) return false;

        const illuminator = world.getEntity(guidance.illuminatorId);
        if (!illuminator) return false;

        const sensors = illuminator.getComponents(SensorComponent);
        const detection = illuminator.getComponent(DetectionComponent);

        if (sensors.length === 0 || !detection) return false;

        // Requirement: Find a sensor in Illumination mode targeting the correct entity
        const activeIlluminator = sensors.find(s => 
            s.mode === SensorMode.Illumination && 
            s.illuminatedTargetId === guidance.targetId &&
            s.isActive
        );

        if (!activeIlluminator) return false;

        // Requirement: Illuminator must actually maintain a track/detection on the target
        const hasTrack = detection.detectedEntityIds.has(guidance.targetId);

        return hasTrack;
    }

    private checkARHLock(entity: any): boolean {
        // Active Radar Homing: Missile has its own sensor
        const sensor = entity.getComponent(SensorComponent);
        const detection = entity.getComponent(DetectionComponent);
        const guidance = entity.getComponent(GuidanceComponent);

        if (!sensor || !detection || !guidance) return false;

        return sensor.isActive && detection.detectedEntityIds.has(guidance.targetId);
    }

    private checkIRLock(world: IWorldView, entity: any, guidance: GuidanceComponent): boolean {
        // Simplified IR: Requires LOS and heat signature (IRST/Visual detection)
        const detection = entity.getComponent(DetectionComponent);
        return detection?.detectedEntityIds.has(guidance.targetId) || false;
    }
}
