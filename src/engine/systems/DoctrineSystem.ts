import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command } from '../core/Command.js';
import { DoctrineComponent } from '../components/Doctrine.js';
import { SensorComponent } from '../components/Sensors.js';
import { SensorType, EMCONState } from '../core/Types.js';

/**
 * DoctrineSystem: Enforces EMCON and high-level behavioral rules.
 */
export class DoctrineSystem implements ISystem {
    readonly name = 'DoctrineSystem';
    readonly phase = SystemPhase.Doctrine;
    readonly dependencies = [];

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const doctrine = entity.getComponent(DoctrineComponent);
            const sensors = entity.getComponents(SensorComponent);

            if (doctrine) {
                // 1. EMCON Enforcement
                if (doctrine.emcon === EMCONState.Silent) {
                    // Turn off active emitters
                    for (const sensor of sensors) {
                        if (sensor.sensorType === SensorType.Radar || sensor.sensorType === SensorType.Sonar) {
                            sensor.isActive = false;
                        }
                    }
                } else if (doctrine.emcon === EMCONState.Alpha) {
                    // Turn on active emitters (unless manually disabled elsewhere)
                    for (const sensor of sensors) {
                        sensor.isActive = true;
                    }
                }
            }
        }

        return commands;
    }
}
