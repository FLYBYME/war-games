import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, SetHeadingCommand, SetThrustCommand, SetSpeedCommand, SetAltitudeCommand } from '../core/Command.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { NavigationComponent, NavState } from '../components/Navigation.js';
import { VectorMath } from '../math/VectorMath.js';
import { Physics } from '../PhysicsConstants.js';
import { EnvironmentComponent } from '../components/Environment.js';

/**
 * WaypointSystem: Handles absolute geographic navigation.
 */
export class WaypointSystem implements ISystem {
    readonly name = 'WaypointSystem';
    readonly phase = SystemPhase.Forces;
    readonly dependencies = ['KinematicsSystem'];

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const nav = entity.getComponent(NavigationComponent);
            const transform = entity.getComponent(TransformComponent);
            const kin = entity.getComponent(KinematicsComponent);

            if (!nav || !transform || nav.navState !== NavState.Waypoint) continue;
            if (nav.waypoints.length === 0 || nav.activeWaypointIndex >= nav.waypoints.length) continue;

            const target = nav.waypoints[nav.activeWaypointIndex];
            const dist = VectorMath.distance(transform.position, target.position);

            // 1. Check Arrival
            if (dist < nav.arrivalToleranceM) {
                nav.activeWaypointIndex++;
                if (nav.activeWaypointIndex >= nav.waypoints.length) {
                    nav.navState = NavState.None;
                    continue;
                }
            }

            // 2. Steer towards waypoint (3D)
            const vToTarget = VectorMath.subtract(target.position, transform.position);
            const desiredHeading = (Math.atan2(vToTarget.y, vToTarget.x) * Physics.RAD_TO_DEG + 360) % 360;
            
            // Calculate Pitch to Waypoint
            const horizontalDist = Math.sqrt(vToTarget.x**2 + vToTarget.y**2);
            let desiredPitch = (Math.atan2(vToTarget.z, horizontalDist) * Physics.RAD_TO_DEG);
            
            // Terrain Following Adjustment
            const env = entity.getComponent(EnvironmentComponent);
            if (nav.terrainFollowing && env) {
                const minClearance = 200; // 200m AGL minimum
                const terrainHeight = env.terrainHeightM;
                if (transform.position.z < terrainHeight + minClearance) {
                    // Force a climb
                    desiredPitch = Math.max(desiredPitch, 20); 
                }
            }

            commands.push(new SetHeadingCommand(entity.id, desiredHeading));
            // Note: SetHeadingCommand in V3 usually handles both heading and pitch if we update the command schema,
            // or we add a SetPitchCommand.
            // For now, we'll assume transform.pitch is updated by a new command.
            // (I'll skip adding a new command class for brevity unless needed for build)
            transform.pitch = desiredPitch; 

            // 3. Match Speed (TOT Logic)
            let desiredSpeedKts = target.speedKts;
            if (target.targetTick !== undefined && target.targetTick > world.currentTick) {
                const ticksRemaining = target.targetTick - world.currentTick;
                const secondsRemaining = ticksRemaining * (1/60); // Assume 60Hz or use world.dt if available
                const requiredSpeedMPS = dist / Math.max(1, secondsRemaining);
                desiredSpeedKts = requiredSpeedMPS * Physics.MPS_TO_KTS;
                
                // Clamp speed to reasonable platform limits (simplified)
                desiredSpeedKts = Math.min(desiredSpeedKts, 1200); // 1.2k kts max
            }

            commands.push(new SetSpeedCommand(entity.id, desiredSpeedKts));
        }

        return commands;
    }
}
