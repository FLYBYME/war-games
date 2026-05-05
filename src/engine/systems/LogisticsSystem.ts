import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, UpdateLogisticsStateCommand, TransferResourcesCommand } from '../core/Command.js';
import { LogisticsComponent, TurnaroundState, FacilityComponent } from '../components/Logistics.js';
import { AeroComponent } from '../components/Aero.js';
import { RCSComponent } from '../components/Signatures.js';
import { TransformComponent } from '../components/Physics.js';
import { CombatComponent } from '../components/Combat.js';
import { VectorMath } from '../math/VectorMath.js';

/**
 * LogisticsSystem: Manages turnaround cycles and loadout effects.
 * Also handles Underway Replenishment (UNREP).
 */
export class LogisticsSystem implements ISystem {
    readonly name = 'LogisticsSystem';
    readonly phase = SystemPhase.Lifecycle;
    readonly dependencies = [];

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const log = entity.getComponent(LogisticsComponent);
            if (!log) continue;

            // 1. Advance Turnaround States
            if (log.state !== TurnaroundState.InFlight && log.state !== TurnaroundState.Ready && log.state !== TurnaroundState.None) {
                const elapsed = world.currentTick - log.stateStartTick;
                if (elapsed >= log.stateDurationTicks) {
                    commands.push(this.advanceState(entity.id, log, world.currentTick));
                }
            }

            // 2. Resource Transfer during specific states
            if (log.currentBaseId) {
                const base = world.getEntity(log.currentBaseId);
                if (base) {
                    if (log.state === TurnaroundState.Refueling) {
                        // Request fuel transfer from base
                        commands.push(new TransferResourcesCommand(log.currentBaseId, entity.id, 50, new Map()));
                    } else if (log.state === TurnaroundState.Rearming) {
                        // Request ammo transfer from base (simplified: 1 unit per tick)
                        const ammoRequest = new Map<string, number>();
                        const combat = entity.getComponent(CombatComponent);
                        if (combat) {
                            for (const mag of combat.magazines) {
                                if (mag.currentCount < mag.capacity) {
                                    ammoRequest.set(mag.weaponProfileId, 1);
                                    break; 
                                }
                            }
                        }
                        if (ammoRequest.size > 0) {
                            commands.push(new TransferResourcesCommand(log.currentBaseId, entity.id, 0, ammoRequest));
                        }
                    }
                }
            }

            // 3. Underway Replenishment (UNREP)
            // Simplified: If a ship is near a supply vessel (FacilityType.Port/Carrier/MobileSupply)
            if (log.state === TurnaroundState.InFlight) { // For ships, InFlight just means "Active"
                const transform = entity.getComponent(TransformComponent);
                if (transform) {
                    const nearby = world.getNearbyEntities(transform.position, 1000); // 1km UNREP range
                    for (const other of nearby) {
                        if (other.id === entity.id) continue;
                        const otherFacility = other.getComponent(FacilityComponent);
                        if (otherFacility && (otherFacility.facilityType === 'Carrier' || otherFacility.facilityType === 'Port')) {
                            // Transfer resources
                            commands.push(new TransferResourcesCommand(other.id, entity.id, 10, new Map()));
                        }
                    }
                }
            }
        }

        return commands;
    }

    private advanceState(entityId: string, log: LogisticsComponent, currentTick: number): Command {
        let newState = log.state;
        let duration = 0;

        switch (log.state) {
            case TurnaroundState.Landing:
                newState = TurnaroundState.Taxiing;
                duration = 300; 
                break;
            case TurnaroundState.Taxiing:
                newState = TurnaroundState.Rearming;
                duration = 1800; 
                break;
            case TurnaroundState.Rearming:
                newState = TurnaroundState.Refueling;
                duration = 900; 
                break;
            case TurnaroundState.Refueling:
                newState = TurnaroundState.PreFlight;
                duration = 900; 
                break;
            case TurnaroundState.PreFlight:
                newState = TurnaroundState.Ready;
                duration = 0;
                break;
            default:
                break;
        }

        return new UpdateLogisticsStateCommand(entityId, newState, duration);
    }
}
