import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, SetPositionCommand } from '../core/Command.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';

/**
 * MovementSystem: A pure-logic system that calculates next positions.
 */
export class MovementSystem implements ISystem {
    readonly name = 'MovementSystem';
    readonly phase = SystemPhase.Physics;
    readonly dependencies = ['PhysicsSystem'];

    public async process(world: IWorldView, dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const transform = entity.getComponent(TransformComponent);
            const kinematics = entity.getComponent(KinematicsComponent);

            if (transform && kinematics) {
                const nextX = transform.position.x + kinematics.velocity.x * dt;
                const nextY = transform.position.y + kinematics.velocity.y * dt;
                const nextZ = transform.position.z + kinematics.velocity.z * dt;

                commands.push(new SetPositionCommand(entity.id, nextX, nextY, nextZ));
            }
        }

        return commands;
    }
}
