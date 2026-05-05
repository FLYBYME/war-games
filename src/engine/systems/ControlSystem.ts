import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, UpdateThrustCommand, SetHeadingCommand } from '../core/Command.js';
import { NavigationComponent } from '../components/Navigation.js';
import { KinematicsComponent, TransformComponent } from '../components/Physics.js';
import { PropulsionComponent } from '../components/Propulsion.js';
import { VectorMath } from '../math/VectorMath.js';
import { Physics } from '../PhysicsConstants.js';
import { LogisticsComponent, TurnaroundState } from '../components/Logistics.js';

/**
 * ControlSystem: Autopilot / Inner-loop controller.
 * Converts Navigation targets (heading, altitude, speed) into physical forces.
 * Uses PID-like logic for smooth steering.
 */
export class ControlSystem implements ISystem {
    readonly name = 'ControlSystem';
    readonly phase = SystemPhase.Forces;
    readonly dependencies = ['NavigationSystem', 'WaypointSystem'];

    public async process(world: IWorldView, dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const nav = entity.getComponent(NavigationComponent);
            const transform = entity.getComponent(TransformComponent);
            const kin = entity.getComponent(KinematicsComponent);
            const prop = entity.getComponent(PropulsionComponent);

            if (!nav || !transform || !kin) continue;

            const profile = world.profileRegistry.get(entity.profileId);
            const type = profile?.type || 'Aircraft';

            // 1. Heading Control (Force-Based)
            if (nav.desiredHeadingDeg !== undefined) {
                const currentHdg = transform.rotation;
                let error = (nav.desiredHeadingDeg - currentHdg + 360) % 360;
                if (error > 180) error -= 360;

                const p = 5.0; 
                const turnRate = error * p;
                const maxTurnRate = type === 'Ship' ? 2 : 20; 
                const clampedRate = Math.max(-maxTurnRate, Math.min(maxTurnRate, turnRate));
                
                if (Math.abs(clampedRate) > 0.01) {
                    const hdgRad = currentHdg * Physics.DEG_TO_RAD;
                    const speed = VectorMath.magnitude(kin.velocity);
                    if (speed > 1) {
                        const sideDir = { x: Math.sin(hdgRad), y: -Math.cos(hdgRad), z: 0 };
                        const bankForceMag = kin.massKg * speed * (clampedRate * Physics.DEG_TO_RAD);
                        kin.netForce = VectorMath.add(kin.netForce, VectorMath.multiplyScalar(sideDir, bankForceMag));
                    }
                    transform.rotation = (currentHdg + clampedRate * dt + 360) % 360;
                }
            }

            // 2. Altitude / Buoyancy Control
            if (type === 'Ship') {
                // Counter Gravity (Buoyancy) + Restoring force to Z=0
                const gravityForce = kin.massKg * Physics.GRAVITY_G;
                
                // Spring-damper to keep at sea level
                const k = 1000000; // Very stiff for 3k ton ship
                const d = 500000;
                const restoringForce = -transform.position.z * k - kin.velocity.z * d;
                
                kin.netForce.z += gravityForce + restoringForce;
            } else if (nav.desiredAltitudeM !== undefined) {
                const currentAlt = transform.position.z;
                const altError = nav.desiredAltitudeM - currentAlt;
                
                const pAlt = 0.5;
                const desiredClimbRate = altError * pAlt;
                const currentClimbRate = kin.velocity.z;
                const climbError = desiredClimbRate - currentClimbRate;

                const pClimb = 2.0;
                let liftForceZ = kin.massKg * (climbError * pClimb + Physics.GRAVITY_G);
                
                // Clamp vertical authority to ~10G
                const maxLift = kin.massKg * 10 * Physics.GRAVITY_G;
                liftForceZ = Math.max(-maxLift, Math.min(maxLift, liftForceZ));

                kin.netForce.z += liftForceZ;
            } else if (type === 'Aircraft') {
                // Counter gravity if in flight to maintain altitude baseline
                const log = entity.getComponent(LogisticsComponent);
                if (log?.state === TurnaroundState.InFlight) {
                    kin.netForce.z += kin.massKg * Physics.GRAVITY_G;
                }
            }

            // 3. Speed Control (Throttle-Based)
            if (nav.desiredSpeedKts !== undefined && prop) {
                const maxSpeedKts = profile?.kinematics?.maxSpeedKts || 30;
                const targetSpeedKts = Math.min(nav.desiredSpeedKts, maxSpeedKts);
                const targetSpeedMps = targetSpeedKts * Physics.KTS_TO_MPS;
                const currentSpeedMps = VectorMath.magnitude(kin.velocity);
                const speedError = targetSpeedMps - currentSpeedMps;

                // Proportional control with base offset for more stability
                const p = 0.1;
                const baseThrottle = targetSpeedKts > 0 ? 0.2 : 0;
                prop.throttle = Math.max(0, Math.min(1, baseThrottle + speedError * p));
            }
        }

        return commands;
    }
}
