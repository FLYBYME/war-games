import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, SetHeadingCommand, SetAltitudeCommand, SetSpeedCommand } from '../core/Command.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { NavigationComponent, NavState, FormationComponent } from '../components/Navigation.js';
import { VectorMath } from '../math/VectorMath.js';
import { Physics } from '../PhysicsConstants.js';

/**
 * FormationSystem: Handles relative station-keeping.
 * Calculates world-space coordinates for relative offsets and steers followers.
 */
export class FormationSystem implements ISystem {
    readonly name = 'FormationSystem';
    readonly phase = SystemPhase.Forces;
    readonly dependencies = ['KinematicsSystem', 'WaypointSystem'];

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const form = entity.getComponent(FormationComponent);
            const nav = entity.getComponent(NavigationComponent);
            const transform = entity.getComponent(TransformComponent);

            // Logging-like check (if I could)
            if (!form) continue;
            if (!nav) continue;
            if (nav.navState !== NavState.Formation) continue;
            if (!transform) continue;

            const leader = world.getEntity(form.leaderId);
            const leaderTransform = leader?.getComponent(TransformComponent);
            const leaderKin = leader?.getComponent(KinematicsComponent);

            if (!leaderTransform) continue;

            // 1. Calculate World Station Position
            const rotatedOffset = VectorMath.rotateEuler(
                form.stationOffset,
                leaderTransform.rotation,
                0,
                0
            );

            const stationPos = VectorMath.add(leaderTransform.position, rotatedOffset);

            // 2. Navigation Targets
            const vToStation = VectorMath.subtract(stationPos, transform.position);
            const distToStation = VectorMath.magnitude(vToStation);
            
            const desiredHeadingDeg = (Math.atan2(vToStation.y, vToStation.x) * Physics.RAD_TO_DEG + 360) % 360;
            const desiredAltitudeM = stationPos.z;

            // 3. Station Keeping Speed Logic
            const leaderSpeedKts = VectorMath.magnitude(leaderKin?.velocity || {x:0,y:0,z:0}) * Physics.MPS_TO_KTS;
            let desiredSpeedKts = leaderSpeedKts;

            if (distToStation > 50) { 
                desiredSpeedKts += 100; // Catch up
            } else if (distToStation < 5) {
                desiredSpeedKts -= 50;  // Slow down
            }

            commands.push(new SetHeadingCommand(entity.id, desiredHeadingDeg));
            commands.push(new SetAltitudeCommand(entity.id, desiredAltitudeM));
            commands.push(new SetSpeedCommand(entity.id, desiredSpeedKts));
        }

        return commands;
    }
}
