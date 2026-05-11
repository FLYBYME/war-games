import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, SetHeadingCommand, SetPitchCommand, DestroyEntityCommand } from '../core/Command.js';
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
            let desiredDir = VectorMath.rotateEuler({ x: 1, y: 0, z: 0 }, transform.rotation, desiredPitch, 0);

            let correctionMag = 0;
            if (guidance.lastLOS) {
                // PN Guidance: Rotate the velocity vector N times faster than the LOS rotates
                // Standard N is 3.0 to 5.0. 4.0 is aggressive and suited for high-speed terminal phases.
                const N = 4.0;

                // Calculate LOS rotation (omega_los * dt) using cross product of unit vectors
                const losRotation = VectorMath.cross(guidance.lastLOS, currentLOS);
                const rotationMag = VectorMath.magnitude(losRotation);

                // Get current velocity direction and speed
                const currentVelDir = myKin ? VectorMath.normalize(myKin.velocity) : VectorMath.normalize(currentLOS);
                const currentSpeed = myKin ? Math.max(10, VectorMath.magnitude(myKin.velocity)) : 500;

                // 1.5 G-Limiting
                const maxG = guidance.maneuverabilityG || 30;
                const maxAngleRad = (maxG * Physics.GRAVITY_G * _dt) / currentSpeed;

                let angleToRotateRad = rotationMag * N;
                correctionMag = angleToRotateRad; // For logging G-load

                if (angleToRotateRad > maxAngleRad) {
                    angleToRotateRad = maxAngleRad;
                }

                if (angleToRotateRad > 0.00001 && rotationMag > 0.000001) {
                    const axis = VectorMath.normalize(losRotation);
                    desiredDir = VectorMath.rotateAroundAxis(currentVelDir, axis, angleToRotateRad * Physics.RAD_TO_DEG);
                } else {
                    desiredDir = currentVelDir;
                }

                // 1.7 Boresight Clamping: Ensure the missile never points too far from the target
                const boresightCos = VectorMath.dot(desiredDir, currentLOS);
                const maxBSCos = Math.cos(20 * Physics.DEG_TO_RAD);

                if (boresightCos < maxBSCos) {
                    const axis = VectorMath.cross(currentLOS, desiredDir);
                    if (VectorMath.magnitude(axis) > 0.0001) {
                        desiredDir = VectorMath.rotateAroundAxis(currentLOS, axis, 20);
                    }
                }

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
                const currentSpeedLog = myKin ? Math.max(1, VectorMath.magnitude(myKin.velocity)) : 500;
                const actualG = (correctionMag * currentSpeedLog) / (Physics.GRAVITY_G * _dt);
                const currentVelDirLog = myKin ? VectorMath.normalize(myKin.velocity) : VectorMath.normalize(currentLOS);
                const boresight = Math.acos(Math.max(-1, Math.min(1, VectorMath.dot(currentVelDirLog, currentLOS)))) * Physics.RAD_TO_DEG;
                // logger.info(`Missile PN Guidance: ${entity.id} -> ${target.id} | hdg: ${Math.round(desiredHeading)} pit: ${Math.round(desiredPitch)} dist: ${Math.round(dist)} G: ${actualG.toFixed(1)} BS: ${boresight.toFixed(1)}`);
            }
        }

        return commands;
    }
}
