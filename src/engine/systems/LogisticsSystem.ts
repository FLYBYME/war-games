import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, UpdateLogisticsStateCommand, ConsumeFuelCommand } from '../core/Command.js';
import { LogisticsComponent, FacilityComponent, TurnaroundState } from '../components/Logistics.js';
import { FuelComponent } from '../components/Propulsion.js';
import { CombatComponent } from '../components/Combat.js';
import { logger } from '../core/Logger.js';

/**
 * LogisticsSystem: Manages base operations, refueling, and rearming.
 */
export class LogisticsSystem implements ISystem {
    readonly name = 'LogisticsSystem';
    readonly phase = SystemPhase.Lifecycle;
    readonly dependencies = [];

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const log = entity.getComponent(LogisticsComponent);
            if (!log || log.state === TurnaroundState.InFlight || log.state === TurnaroundState.None) continue;

            const base = log.currentBaseId ? world.getEntity(log.currentBaseId) : undefined;
            const facility = base?.getComponent(FacilityComponent);

            if (!base || !facility) {
                // If base is missing but we're in a ground state, force state change or error
                continue;
            }

            const elapsed = world.currentTick - log.stateStartTick;
            const sideLogistics = (world as any).sideLogistics?.get(entity.side);

            // Periodically replenish base from side stockpile
            if (world.currentTick % 600 === 0 && sideLogistics) {
                const fuelNeeded = 1000000 - facility.fuelReservesKg;
                const fuelTaken = Math.min(fuelNeeded, sideLogistics.fuelStockpileKg);
                facility.fuelReservesKg += fuelTaken;
                sideLogistics.fuelStockpileKg -= fuelTaken;
            }

            switch (log.state) {
                case TurnaroundState.Landing:
                    if (elapsed >= 100) { // 10s landing
                        commands.push(new UpdateLogisticsStateCommand(entity.id, TurnaroundState.Taxiing, 50));
                    }
                    break;

                case TurnaroundState.Taxiing:
                    if (elapsed >= log.stateDurationTicks) {
                        commands.push(new UpdateLogisticsStateCommand(entity.id, TurnaroundState.Refueling, 300));
                    }
                    break;

                case TurnaroundState.Refueling:
                    const fuel = entity.getComponent(FuelComponent);
                    if (fuel && fuel.currentKg < fuel.maxKg) {
                        const transferRate = 50; // kg per tick
                        const amount = Math.min(transferRate, fuel.maxKg - fuel.currentKg, facility.fuelReservesKg);
                        
                        if (amount > 0) {
                            fuel.currentKg += amount;
                            facility.fuelReservesKg -= amount;
                        } else if (facility.fuelReservesKg <= 0) {
                            logger.warn(`Base ${base.id} out of fuel! Logistics halted for ${entity.id}`);
                        }
                    }

                    if (!fuel || fuel.currentKg >= fuel.maxKg) {
                        commands.push(new UpdateLogisticsStateCommand(entity.id, TurnaroundState.Rearming, 600));
                    }
                    break;

                case TurnaroundState.Rearming:
                    const combat = entity.getComponent(CombatComponent);
                    if (combat) {
                        // For each magazine, try to pull from facility ammo
                        combat.magazines.forEach(mag => {
                            if (mag.currentCount < mag.capacity) {
                                const needed = mag.capacity - mag.currentCount;
                                const available = facility.ammoReserves.get(mag.weaponProfileId) || 0;
                                const amount = Math.min(needed, available);
                                
                                if (amount > 0) {
                                    mag.currentCount += amount;
                                    facility.ammoReserves.set(mag.weaponProfileId, available - amount);
                                }
                            }
                        });
                    }
                    
                    if (elapsed >= log.stateDurationTicks) {
                        commands.push(new UpdateLogisticsStateCommand(entity.id, TurnaroundState.PreFlight, 200));
                    }
                    break;

                case TurnaroundState.PreFlight:
                    if (elapsed >= log.stateDurationTicks) {
                        commands.push(new UpdateLogisticsStateCommand(entity.id, TurnaroundState.Ready, 0));
                    }
                    break;
            }
        }

        return commands;
    }
}
