import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, SetPositionCommand } from '../core/Command.js';
import { TransformComponent } from '../components/Physics.js';
import { OrbitalComponent } from '../components/Orbital.js';
import { Physics } from '../PhysicsConstants.js';

/**
 * OrbitalPhysicsSystem: Predicts satellite positions.
 * Maps Keplerian circular orbits to the tactical simulation grid.
 */
export class OrbitalPhysicsSystem implements ISystem {
    readonly name = 'OrbitalPhysicsSystem';
    readonly phase = SystemPhase.Physics;
    readonly dependencies = [];

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];
        const currentTick = world.currentTick;
        const tickRate = 10; // Assume 10Hz

        for (const entity of world.getEntities()) {
            const orbital = entity.getComponent(OrbitalComponent);
            const transform = entity.getComponent(TransformComponent);

            if (orbital && transform) {
                // 1. Calculate Mean Anomaly at current time
                const elapsedSec = (currentTick - orbital.epochTick) / tickRate;
                const meanMotionRadPerSec = (2 * Math.PI) / orbital.periodSec;
                
                const currentMeanAnomalyRad = (orbital.meanAnomalyAtEpochDeg * Physics.DEG_TO_RAD) + 
                                            (meanMotionRadPerSec * elapsedSec);

                // 2. Simple Circular Ground Track (Projected onto flat grid)
                // In a more advanced sim, we'd use ECEF -> Projection.
                // For V3 tactical scale, we'll model the satellite moving across the AOI.
                
                // Radius of AOI (Arbitrary for now, scaled by orbital period)
                const scaleFactor = 1000000; // 1000km scale for visualization
                
                const x = scaleFactor * Math.cos(currentMeanAnomalyRad);
                const y = scaleFactor * Math.sin(currentMeanAnomalyRad) * Math.cos(orbital.inclinationDeg * Physics.DEG_TO_RAD);
                
                // Satellites are VERY high up (LEO ~500km = 500,000m)
                const z = -orbital.altitudeKm * 1000; // Z is negative for altitude above ground in our terrain logic?
                // Wait, in my EnvironmentSystem: isSubmerged = transform.position.z > 0.
                // So altitude is NEGATIVE Z. Correct.

                commands.push(new SetPositionCommand(entity.id, x, y, z));
            }
        }

        return commands;
    }
}
