import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Vector3 } from '../core/Types.js';
import { Command, ApplyForceCommand } from '../core/Command.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { EnvironmentComponent } from '../components/Environment.js';
import { AeroComponent } from '../components/Aero.js';
import { VectorMath } from '../math/VectorMath.js';
import { Physics } from '../PhysicsConstants.js';

/**
 * AeroSystem: Generates Lift and Drag forces based on fluid dynamics.
 * Force = 0.5 * rho * v^2 * S * C
 */
export class AeroSystem implements ISystem {
    readonly name = 'AeroSystem';
    readonly phase = SystemPhase.Physics;
    readonly dependencies = ['EnvironmentSystem', 'KinematicsSystem'];

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const transform = entity.getComponent(TransformComponent);
            const kinematics = entity.getComponent(KinematicsComponent);
            const env = entity.getComponent(EnvironmentComponent);
            const aero = entity.getComponent(AeroComponent);

            if (transform && kinematics && env && aero) {
                // 0. Check Type
                const profile = world.profileRegistry.get(entity.profileId);
                const isHelo = profile?.type === 'Helicopter';

                // 1. Calculate Airspeed (Ground Velocity - Wind Velocity)
                const vAirWorld = VectorMath.subtract(kinematics.velocity, env.windVelocity);
                const airspeedMag = VectorMath.magnitude(vAirWorld);
                
                if (airspeedMag < 1.0 && !isHelo) {
                    aero.machNumber = 0;
                    continue; // Minimum speed for aero effects
                }

                // 2. Transform Air Velocity to Body Frame
                const vBody = VectorMath.rotateEulerInverse(
                    vAirWorld, 
                    transform.rotation, 
                    transform.pitch, 
                    transform.roll
                );

                // 3. Update Aero Component State
                const speedOfSound = 340 * Math.sqrt((env.temperatureC + 273.15) / 288.15);
                aero.machNumber = airspeedMag / speedOfSound;

                // 4. Calculate Aerodynamic Angles
                const aoa = Math.atan2(-vBody.z, vBody.x);
                const beta = Math.asin(Math.max(-1, Math.min(1, vBody.y / airspeedMag)));

                // 5. Calculate Coefficients
                let q = 0.5 * env.airDensity * airspeedMag * airspeedMag;
                
                if (isHelo && airspeedMag < 20.0) {
                    // Effective dynamic pressure from rotor wash
                    const vEff = Math.max(30, airspeedMag + 15);
                    q = 0.5 * env.airDensity * vEff * vEff;
                }
                
                // Lift: Simplified AoA-dependent lift curve
                const aoaRad = aoa; // aoa is already in radians from Math.atan2
                const clSlope = 2 * Math.PI;
                let cl = clSlope * aoaRad;

                if (isHelo && airspeedMag < 10.0) {
                    // Helicopter Hover Lift: Provide enough lift to counter gravity
                    const weight = kinematics.massKg * Physics.GRAVITY_G;
                    const hoverLiftMag = weight / (q * aero.wingAreaS);
                    cl = Math.max(cl, hoverLiftMag);
                }
                
                // AoA Stall Clamp: Lift drops after ~15 deg
                if (Math.abs(aoa) > 15) {
                    cl = cl * (1.0 / (Math.abs(aoa) - 14));
                }

                // Drag: Cd = Cd_base + K * Cl^2 + WaveDrag
                let cd = aero.dragCoeffCd + aero.inducedDragFactor * (cl * cl);

                // Simple Wave Drag (Prandtl-Glauert singularity workaround)
                if (aero.machNumber > 0.8) {
                    const waveDrag = Math.pow(Math.max(0, aero.machNumber - 0.8), 2) * 5.0;
                    cd += waveDrag;
                }

                // 4. Generate Forces in Body Frame
                // Drag is opposite to velocity vector
                const dragMag = Math.min(1e9, cd * q * aero.wingAreaS);
                const dragBody = VectorMath.multiplyScalar(VectorMath.normalize(vBody), -dragMag);
                
                // Lift is perpendicular to velocity (simplified: mostly along body Z)
                const liftMag = Math.min(1e9, cl * q * aero.wingAreaS);
                const liftBody: Vector3 = { x: 0, y: 0, z: liftMag };

                const bodyForce = VectorMath.add(dragBody, liftBody);

                // 5. Transform Body Forces to World Frame
                const worldForce = VectorMath.rotateEuler(
                    bodyForce,
                    transform.rotation,
                    transform.pitch,
                    transform.roll
                );

                commands.push(new ApplyForceCommand(
                    entity.id,
                    worldForce.x,
                    worldForce.y,
                    worldForce.z
                ));
            }
        }

        return commands;
    }
}
