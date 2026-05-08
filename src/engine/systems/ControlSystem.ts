import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, SetThrottleCommand, SetPitchCommand } from '../core/Command.js';
import { NavigationComponent } from '../components/Navigation.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { PropulsionComponent } from '../components/Propulsion.js';
import { VectorMath } from '../math/VectorMath.js';
import { Physics } from '../PhysicsConstants.js';
import { ProfileRegistry } from '../core/ProfileRegistry.js';
import { EntityProfile } from '../core/Types.js';

/**
 * ControlSystem: The Fly-By-Wire / Autopilot layer.
 * Translates desired speed/altitude/heading into physical control inputs (Throttle, Pitch, Bank).
 */
export class ControlSystem implements ISystem {
    readonly name = 'ControlSystem';
    readonly phase = SystemPhase.Decision;
    readonly dependencies = ['WaypointSystem', 'FormationSystem'];

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const nav = entity.getComponent(NavigationComponent);
            const transform = entity.getComponent(TransformComponent);
            const kinematics = entity.getComponent(KinematicsComponent);
            const propulsion = entity.getComponent(PropulsionComponent);

            if (!nav || !transform || !kinematics || !propulsion) continue;

            const profileRegistry = world.profileRegistry as ProfileRegistry;
            const profile = profileRegistry.get(entity.profileId || '') as EntityProfile | undefined;

            // 1. Heading Control (Simple immediate rotation for now, ideally bank-to-turn)
            if (nav.desiredHeadingDeg !== undefined) {
                // In a pro sim, we would calculate a required turn rate and bank angle
                // commands.push(new SetHeadingCommand(entity.id, nav.desiredHeadingDeg));
            }

            // 2. Speed Control (Auto-Throttle)
            if (nav.desiredSpeedKts !== undefined) {
                const currentSpeedKts = VectorMath.magnitude(kinematics.velocity) * Physics.MPS_TO_KTS;
                const speedDiff = nav.desiredSpeedKts - currentSpeedKts;

                // PID or simple proportional throttle
                let throttle = propulsion.throttle;
                if (speedDiff > 5) {
                    throttle = Math.min(1.0, throttle + 0.05);
                } else if (speedDiff < -5) {
                    throttle = Math.max(0, throttle - 0.05);
                }

                if (Math.abs(throttle - propulsion.throttle) > 0.01) {
                    commands.push(new SetThrottleCommand(entity.id, throttle));
                }
            }

            // 3. Altitude Control (Auto-Pitch)
            if (nav.desiredAltitudeM !== undefined) {
                const altDiff = nav.desiredAltitudeM - transform.position.z;
                
                // Simple Proportional Pitch: 1 deg pitch per 100m altitude diff
                let targetPitch = altDiff / 100;
                
                // Clamping based on platform type (from profile)
                const maxPitch = profile?.type === 'Aircraft' ? 30 : 15;
                targetPitch = Math.max(-maxPitch, Math.min(maxPitch, targetPitch));

                if (Math.abs(targetPitch - transform.pitch) > 0.5) {
                    commands.push(new SetPitchCommand(entity.id, targetPitch));
                }
            }
        }

        return commands;
    }
}
