import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Vector3, EntityProfile } from '../core/Types.js';
import { Command, ApplyForceCommand } from '../core/Command.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { EnvironmentComponent } from '../components/Environment.js';
import { AeroComponent } from '../components/Aero.js';
import { VectorMath } from '../math/VectorMath.js';
import { Physics } from '../PhysicsConstants.js';
import { ProfileRegistry } from '../core/ProfileRegistry.js';
import { logger } from '../core/Logger.js';

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
                
                // Lift: Symmetric airfoil for munitions/missiles (Cl=0 at AoA=0)
                // In a pro sim, we'd use a cl0 > 0 for high-lift wings, but for missiles it must be 0.
                // Symmetric fins have a lower clSlope than large wings.
                const clSlope = aero.liftCoeffCl > 0 ? 3.0 : 0;
                let cl = clSlope * aoa;

                // Drag: Cd = Cd_base + K * Cl^2 + WaveDrag
                let cd = aero.dragCoeffCd + aero.inducedDragFactor * (cl * cl);

                // Simple Wave Drag (Supersonic penalty)
                if (aero.machNumber > 0.8) {
                    // Gradual increase peaking at Mach 1.0, then tapering or holding.
                    // Real Cd peaks at Mach 1 and then actually decreases slightly.
                    const transonicPeak = Math.max(0, 1.0 - Math.abs(aero.machNumber - 1.0)) * 0.5;
                    const supersonicBase = aero.machNumber > 1.0 ? 0.2 : 0;
                    cd += (transonicPeak + supersonicBase);
                }

                // 4. Generate Forces
                const dragMag = Math.min(1e9, cd * q * aero.wingAreaS);
                const dragBody = VectorMath.multiplyScalar(VectorMath.normalize(vBody), -dragMag);
                
                let worldForce: Vector3;
                if (isHelo && airspeedMag < 15.0) {
                    // Helicopter Hover/Transition Mode
                    const weight = kinematics.massKg * Physics.GRAVITY_G;
                    
                    // Smooth transition from hover lift to wing lift
                    const hoverFactor = Math.max(0, 1.0 - (airspeedMag / 15.0));
                    
                    // Hover lift is always World-UP (Simplified rotor model)
                    const hoverLiftWorld: Vector3 = { x: 0, y: 0, z: weight * hoverFactor };
                    
                    // Wing lift (standard aero model)
                    const wingLiftMag = cl * q * aero.wingAreaS * (1.0 - hoverFactor);
                    const wingLiftBody: Vector3 = { x: 0, y: 0, z: wingLiftMag };
                    const wingLiftWorld = VectorMath.rotateEuler(wingLiftBody, transform.rotation, transform.pitch, transform.roll);

                    // Drag is still body-relative
                    const dragWorld = VectorMath.rotateEuler(dragBody, transform.rotation, transform.pitch, transform.roll);
                    
                    worldForce = VectorMath.add(dragWorld, VectorMath.add(hoverLiftWorld, wingLiftWorld));
                } else {
                    // Standard Fixed-Wing or High-Speed Helo Aero
                    // AoA Stall Clamp: Lift drops after ~15 deg (0.26 rad)
                    const stallAngleRad = 15 * Physics.DEG_TO_RAD;
                    if (Math.abs(aoa) > stallAngleRad) {
                        cl = cl * (1.0 / (Math.abs(aoa) * Physics.RAD_TO_DEG - 14));
                    }

                    const liftMag = Math.min(1e9, cl * q * aero.wingAreaS);
                    const liftBody: Vector3 = { x: 0, y: 0, z: liftMag };
                    const bodyForce = VectorMath.add(dragBody, liftBody);

                    // Transform Body Forces to World Frame
                    worldForce = VectorMath.rotateEuler(
                        bodyForce,
                        transform.rotation,
                        transform.pitch,
                        transform.roll
                    );
                }

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
