import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Vector3, EntityProfile } from '../core/Types.js';
import { Command, ApplyForceCommand } from '../core/Command.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { EnvironmentComponent } from '../components/Environment.js';
import { AeroComponent } from '../components/Aero.js';
import { VectorMath } from '../math/VectorMath.js';
import { Physics } from '../PhysicsConstants.js';
import { ProfileRegistry } from '../core/ProfileRegistry.js';

/**
 * AeroSystem: Generates Lift and Drag forces based on fluid dynamics.
 * Force = 0.5 * rho * v^2 * S * C
 */
export class AeroSystem implements ISystem {
    readonly name = 'AeroSystem';
    readonly phase = SystemPhase.Forces;
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
                const profileRegistry = world.profileRegistry as ProfileRegistry;
                const profile = profileRegistry.get(entity.profileId || '') as EntityProfile | undefined;
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
                // Alpha (AoA) is angle between body X and velocity in X-Z plane
                const aoa = Math.atan2(-vBody.z, vBody.x);

                // 5. Calculate Coefficients
                let q = 0.5 * env.airDensity * airspeedMag * airspeedMag;
                
                if (isHelo && airspeedMag < 20.0) {
                    // Effective dynamic pressure from rotor wash
                    const vEff = Math.max(30, airspeedMag + 15);
                    q = 0.5 * env.airDensity * vEff * vEff;
                }
                
                // Lift: Simplified AoA-dependent lift curve
                // Cl = Cl_0 + Cl_alpha * alpha
                // We assume Cl_0 is enough to maintain level flight at cruise speed 
                // but for simplicity we'll just use a small offset so 0 AoA still has some lift.
                const cl0 = 0.1; 
                const clSlope = 2 * Math.PI;
                let cl = cl0 + clSlope * aoa;

                if (isHelo && airspeedMag < 10.0) {
                    // Helicopter Hover Lift: Provide enough lift to counter gravity
                    const weight = kinematics.massKg * Physics.GRAVITY_G;
                    const hoverLiftMag = weight / (q * aero.wingAreaS);
                    cl = Math.max(cl, hoverLiftMag);
                }
                
                // AoA Stall Clamp: Lift drops after ~15 deg (0.26 rad)
                const stallAngleRad = 15 * Physics.DEG_TO_RAD;
                if (Math.abs(aoa) > stallAngleRad) {
                    cl = cl * (1.0 / (Math.abs(aoa) * Physics.RAD_TO_DEG - 14));
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
