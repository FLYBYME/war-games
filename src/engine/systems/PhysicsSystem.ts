import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, SetPositionCommand, UpdateKinematicsCommand, SetHeadingCommand } from '../core/Command.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { AeroComponent } from '../components/Aero.js';
import { VectorMath } from '../math/VectorMath.js';
import { Physics } from '../PhysicsConstants.js';
import { LogisticsComponent, TurnaroundState, FacilityComponent } from '../components/Logistics.js';
import { EntityProfile } from '../core/Types.js';
import { ProfileRegistry } from '../core/ProfileRegistry.js';

/**
 * PhysicsSystem: The Final Integrator.
 * Sums all generated forces and updates the physical state.
 */
export class PhysicsSystem implements ISystem {
    readonly name = 'PhysicsSystem';
    readonly phase = SystemPhase.Physics;
    readonly dependencies = ['AeroSystem', 'PropulsionSystem'];

    public async process(world: IWorldView, dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const transform = entity.getComponent(TransformComponent);
            const kinematics = entity.getComponent(KinematicsComponent);
            const logistics = entity.getComponent(LogisticsComponent);

            if (transform && kinematics) {
                // 0. Physics Slaving for Parked Aircraft
                if (logistics && logistics.currentBaseId && logistics.state !== TurnaroundState.InFlight) {
                    const carrier = world.getEntity(logistics.currentBaseId);
                    const carrierTransform = carrier?.getComponent(TransformComponent);
                    const carrierKin = carrier?.getComponent(KinematicsComponent);
                    const facility = carrier?.getComponent(FacilityComponent);

                    if (carrierTransform && carrierKin && facility) {
                        // Calculate dynamic offset so they don't stack
                        // We use the index in hostedEntityIds to space them out
                        const index = facility.hostedEntityIds.indexOf(entity.id);
                        const row = Math.floor(index / 2);
                        const col = index % 2;
                        
                        // Example: Start aft, move forward in rows
                        // Offset: [port/stbd, aft/fore, height]
                        const deckOffset = { 
                            x: (col === 0 ? -15 : 15), // 15m left or right of centerline
                            y: -20 - (row * 30),        // Start 20m aft, then 30m spacing
                            z: 25                       // 25m above ship origin (deck height)
                        };

                        const rotatedOffset = VectorMath.rotateEuler(deckOffset, carrierTransform.rotation, 0, 0);
                        
                        const nextPos = VectorMath.add(carrierTransform.position, rotatedOffset);
                        const nextVel = { ...carrierKin.velocity };

                        commands.push(new SetPositionCommand(entity.id, nextPos.x, nextPos.y, nextPos.z));
                        // Update kinematics so they inherit velocity perfectly
                        commands.push(new UpdateKinematicsCommand(entity.id, nextVel, { x: 0, y: 0, z: 0 }));
                        
                        // Sync rotation
                        commands.push(new SetHeadingCommand(entity.id, carrierTransform.rotation));
                        
                        continue; // Skip normal force integration!
                    }
                }

                // 1. Reset and Accumulate Forces
                let netForce = { ...kinematics.netForce };
                
                const weightForceZ = -kinematics.massKg * Physics.GRAVITY_G;
                netForce.z += weightForceZ;

                // 2. Add Propulsion Thrust (3D)
                const hdgRad = transform.rotation * Physics.DEG_TO_RAD;
                const pitchRad = (transform.pitch || 0) * Physics.DEG_TO_RAD;
                
                const cosPitch = Math.cos(pitchRad);
                const thrustForce = {
                    x: Math.cos(hdgRad) * cosPitch * kinematics.thrustN,
                    y: Math.sin(hdgRad) * cosPitch * kinematics.thrustN,
                    z: Math.sin(pitchRad) * kinematics.thrustN
                };
                netForce = VectorMath.add(netForce, thrustForce);

                // 2.5 Add Basic Drag if no AeroComponent (for ships/ground)
                const hasAero = entity.hasComponent(AeroComponent);
                if (!hasAero) {
                    const speed = VectorMath.magnitude(kinematics.velocity);
                    if (speed > 0.1) {
                        // F_drag = 0.5 * rho * v^2 * Cd * A
                        // For ships, we'll use a simplified model: F_drag = 100 * v^2 * Cd
                        const dragMag = 100 * speed * speed * kinematics.dragCoeff;
                        const dragDir = VectorMath.multiplyScalar(kinematics.velocity, -1 / speed);
                        netForce = VectorMath.add(netForce, VectorMath.multiplyScalar(dragDir, dragMag));
                    }
                }

                // 3. Newton's Second Law: a = F / m
                let acceleration = VectorMath.multiplyScalar(netForce, 1 / kinematics.massKg);

                // 3.5 Safety Clamping: No entity should pull more than 50G or exceed Mach 10
                const maxAccel = 50 * Physics.GRAVITY_G;
                const accelMag = VectorMath.magnitude(acceleration);
                if (accelMag > maxAccel) {
                    acceleration = VectorMath.multiplyScalar(acceleration, maxAccel / accelMag);
                }

                // 4. Integration (Velocity)
                let nextVelocity = VectorMath.add(kinematics.velocity, VectorMath.multiplyScalar(acceleration, dt));
                
                const maxSpeed = 340 * 10; // Mach 10
                const speedMag = VectorMath.magnitude(nextVelocity);
                if (speedMag > maxSpeed) {
                    nextVelocity = VectorMath.multiplyScalar(nextVelocity, maxSpeed / speedMag);
                }

                // 5. Integration (Position)
                const nextPosition = VectorMath.add(transform.position, VectorMath.multiplyScalar(nextVelocity, dt));

                // Surface Clamp: Ground units and surface ships shouldn't fall through the earth.
                // Submarines and Torpedoes are allowed below 0.
                // Air units (Aircraft, Helos, Weapons) should NOT be clamped, allowing them to pass 
                // through the floor and be destroyed by the CollisionSystem.
                const profileRegistry = world.profileRegistry as ProfileRegistry;
                const profile = profileRegistry.get(entity.profileId || '') as EntityProfile | undefined;
                const isSurfaceEntity = profile?.type === 'Ship' || profile?.type === 'Facility';
                const isSubsurfaceCapable = profile?.type === 'Submarine' || entity.id.includes('torpedo');

                if (nextPosition.z < 0 && (isSurfaceEntity || !isSubsurfaceCapable)) {
                    // Only clamp if it's a surface entity or NOT subsurface capable (e.g. ground vehicle)
                    // We specifically exclude Aircraft and Weapons here so they hit the terrain impact logic.
                    const isAirEntity = profile?.type === 'Aircraft' || profile?.type === 'Helicopter' || profile?.type === 'Weapon';
                    
                    if (!isAirEntity) {
                        nextPosition.z = 0;
                        nextVelocity.z = 0;
                    }
                }

                commands.push(new SetPositionCommand(entity.id, nextPosition.x, nextPosition.y, nextPosition.z));
                commands.push(new UpdateKinematicsCommand(entity.id, nextVelocity, acceleration));
            }
        }

        return commands;
    }
}
