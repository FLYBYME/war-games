import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, UpdateThrustCommand, ConsumeFuelCommand } from '../core/Command.js';
import { PropulsionComponent, FuelComponent, EngineState } from '../components/Propulsion.js';
import { EnvironmentComponent } from '../components/Environment.js';
import { AeroComponent } from '../components/Aero.js';
import { HealthComponent, SubsystemType } from '../components/Health.js';
import { LogisticsComponent } from '../components/Logistics.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { VectorMath } from '../math/VectorMath.js';

/**
 * PropulsionSystem: Manages engine state, thrust generation, and fuel consumption.
 * Models altitude-dependent thrust and variable-cycle performance (Afterburners).
 */
export class PropulsionSystem implements ISystem {
    readonly name = 'PropulsionSystem';
    readonly phase = SystemPhase.Forces;
    readonly dependencies = ['EnvironmentSystem', 'AeroSystem'];

    public async process(world: IWorldView, dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const prop = entity.getComponent(PropulsionComponent);
            const env = entity.getComponent(EnvironmentComponent);
            const aero = entity.getComponent(AeroComponent);
            const fuel = entity.getComponent(FuelComponent);
            const health = entity.getComponent(HealthComponent);

            if (!prop) continue;

            // 0. Check Subsystem Health
            const propulsionSubs = health?.subsystems.filter(s => s.type === SubsystemType.Propulsion) || [];
            const isMobilityKill = propulsionSubs.length > 0 && propulsionSubs.every(s => !s.isFunctional);
            
            if (isMobilityKill) {
                commands.push(new UpdateThrustCommand(entity.id, 0));
                continue;
            }

            // 1. Calculate Environmental Thrust Factor (Altitude/Mach effect)
            // Thrust drops as air density (pressure ratio delta) drops.
            // Simplified: Thrust = SL_Thrust * delta * (1 + 0.5 * Mach)
            const delta = env?.pressureRatio || 1.0;
            const mach = aero?.machNumber || 0;
            const thrustMult = delta * (1 + 0.2 * mach);

            // 2. Determine Target Thrust based on Throttle & AB
            let targetThrustBase = 0;
            let currentState = EngineState.Dry;

            if (prop.throttle > prop.abThreshold) {
                targetThrustBase = prop.maxThrustAbN;
                currentState = EngineState.Afterburner;
            } else {
                targetThrustBase = prop.throttle * prop.maxThrustDryN;
                currentState = prop.throttle > 0 ? EngineState.Dry : EngineState.Off;
            }

            // 2.5 Flameout check
            if (fuel && fuel.currentKg <= 0) {
                targetThrustBase = 0;
                currentState = EngineState.Off;
            }

            const targetThrust = targetThrustBase * thrustMult;

            // 3. Spooling Logic (Thrust doesn't change instantly)
            const referenceThrust = Math.max(prop.maxThrustDryN, prop.maxThrustAbN);
            const maxDelta = referenceThrust * prop.spoolRate * dt;
            let newThrust = prop.currentThrustN;

            if (newThrust < targetThrust) {
                newThrust = Math.min(targetThrust, newThrust + maxDelta);
            } else if (newThrust > targetThrust) {
                newThrust = Math.max(targetThrust, newThrust - maxDelta);
            }

            commands.push(new UpdateThrustCommand(entity.id, newThrust));

            // 4. Fuel Consumption & Bingo
            if (fuel && fuel.currentKg > 0 && newThrust > 0) {
                const sfc = (currentState === EngineState.Afterburner) ? prop.sfcAb : prop.sfcDry;
                // SFC is usually kg/N/hour. Convert to kg/s.
                const fuelFlow = (sfc * newThrust) / 3600;
                const consumption = fuelFlow * dt;
                
                commands.push(new ConsumeFuelCommand(entity.id, consumption));

                // Update burn rate for UI (kg/hr)
                fuel.burnRateKgHr = fuelFlow * 3600;

                // 5. Bingo Calculation
                const log = entity.getComponent(LogisticsComponent);
                const transform = entity.getComponent(TransformComponent);
                if (log?.currentBaseId && transform) {
                    const base = world.getEntity(log.currentBaseId);
                    const baseTransform = base?.getComponent(TransformComponent);
                    if (baseTransform) {
                        const distToBaseM = VectorMath.distance(transform.position, baseTransform.position);
                        const kinematics = entity.getComponent(KinematicsComponent);
                        const speed = kinematics?.velocity ? VectorMath.magnitude(kinematics.velocity) : 250; // default 250 m/s
                        
                        const timeToBaseS = distToBaseM / Math.max(1, speed);
                        const fuelNeeded = fuelFlow * timeToBaseS;
                        
                        // Bingo if current fuel is less than fuel needed to return + 10% reserve
                        const reserveKg = fuelNeeded * 1.1;
                        fuel.isBingo = fuel.currentKg < reserveKg;
                        
                        // bingoTicks: How many ticks of current burn rate until we hit bingo state
                        const bufferKg = Math.max(0, fuel.currentKg - reserveKg);
                        fuel.bingoTicks = Math.floor(bufferKg / (fuelFlow * dt));
                    }
                }
            } else if (fuel) {
                fuel.burnRateKgHr = 0;
            }
        }

        return commands;
    }
}
