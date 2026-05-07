import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, SetHeadingCommand, SetPitchCommand } from '../core/Command.js';
import { GuidanceComponent } from '../components/Guidance.js';
import { WeaponStageComponent } from '../components/WeaponStages.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { VectorMath } from '../math/VectorMath.js';
import { Physics } from '../PhysicsConstants.js';
import { logger } from '../core/Logger.js';

/**
 * MissileHomingSystem: Directs weapons towards their targets.
 * Simple Pure Pursuit guidance for now.
 */
export class MissileHomingSystem implements ISystem {
    readonly name = 'MissileHomingSystem';
    readonly phase = SystemPhase.Decision;
    readonly dependencies = ['GuidanceSystem'];

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const guidance = entity.getComponent(GuidanceComponent);
            const transform = entity.getComponent(TransformComponent);
            const stages = entity.getComponent(WeaponStageComponent);

            if (!guidance || !transform || !guidance.hasLock) continue;

            // 0. Stage-based Guidance Check
            if (stages) {
                const currentStage = stages.stages[stages.currentStageIndex];
                if (currentStage?.guidanceMode === 'None') continue;
            }

            const target = world.getEntity(guidance.targetId);
            if (!target) continue;

            const targetTransform = target.getComponent(TransformComponent);
            const myKin = entity.getComponent(KinematicsComponent);
            if (!targetTransform) continue;

            // 1. Calculate Line-of-Sight (LOS) and PN Guidance
            const currentLOS = VectorMath.normalize(VectorMath.subtract(targetTransform.position, transform.position));
            const dist = VectorMath.distance(transform.position, targetTransform.position);
            
            let desiredHeading = transform.rotation;
            let desiredPitch = transform.pitch || 0;

            if (guidance.lastLOS) {
                // PN Guidance: Rotate the velocity vector N times faster than the LOS rotates
                const N = 4.0;
                const deltaLOS = VectorMath.subtract(currentLOS, guidance.lastLOS);
                
                // Get current velocity direction
                const currentVelDir = myKin ? VectorMath.normalize(myKin.velocity) : VectorMath.normalize(currentLOS); // Fallback to pursuit
                
                // V3 Fix: Ensure the correction is applied proportional to the LOS rate
                // We use deltaLOS directly for the discrete step, but ensure it's normalized to the speed.
                const desiredDir = VectorMath.normalize(VectorMath.add(currentVelDir, VectorMath.multiplyScalar(deltaLOS, N)));
                
                desiredHeading = (Math.atan2(desiredDir.y, desiredDir.x) * Physics.RAD_TO_DEG + 360) % 360;
                const groundDist = Math.sqrt(desiredDir.x * desiredDir.x + desiredDir.y * desiredDir.y);
                desiredPitch = Math.atan2(desiredDir.z, groundDist) * Physics.RAD_TO_DEG;
            } else {
                // Initial Pure Pursuit for first tick
                desiredHeading = (Math.atan2(currentLOS.y, currentLOS.x) * Physics.RAD_TO_DEG + 360) % 360;
                const groundDist = Math.sqrt(currentLOS.x * currentLOS.x + currentLOS.y * currentLOS.y);
                desiredPitch = Math.atan2(currentLOS.z, groundDist) * Physics.RAD_TO_DEG;
            }

            // Update state for next tick
            guidance.lastLOS = currentLOS;

            // 2. Update Orientation
            if (Math.abs(desiredHeading - transform.rotation) > 0.01) {
                commands.push(new SetHeadingCommand(entity.id, desiredHeading));
            }
            if (Math.abs(desiredPitch - (transform.pitch || 0)) > 0.01) {
                commands.push(new SetPitchCommand(entity.id, desiredPitch));
            }

            if (world.currentTick % 20 === 0) {
                logger.info(`Missile PN Guidance: ${entity.id} -> ${target.id} | hdg: ${Math.round(desiredHeading)} pit: ${Math.round(desiredPitch)} dist: ${Math.round(dist)}`);
            }
        }

        return commands;
    }
}
