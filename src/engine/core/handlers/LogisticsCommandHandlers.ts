import { CommandHandler } from '../CommandDispatcher.js';
import { World } from '../World.js';
import {
    LandAtFacilityCommand,
    UpdateLogisticsStateCommand,
    TransferResourcesCommand,
    ConsumeFuelCommand,
    LaunchAircraftCommand
} from '../Command.js';
import { FacilityComponent } from '../../components/Logistics.js';
import { LogisticsComponent, TurnaroundState } from '../../components/Logistics.js';
import { FuelComponent, PropulsionComponent, EngineState } from '../../components/Propulsion.js';
import { CombatComponent } from '../../components/Combat.js';
import { TransformComponent, KinematicsComponent } from '../../components/Physics.js';
import { VectorMath } from '../../math/VectorMath.js';
import { logger } from '../Logger.js';
import { EventSeverity } from '../../components/Telemetry.js';

export class LandAtFacilityHandler implements CommandHandler<LandAtFacilityCommand> {
    execute(cmd: LandAtFacilityCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const facility = world.getEntity(cmd.facilityId);
        const facilityComp = facility?.getComponent(FacilityComponent);
        const aircraftLog = entity?.getComponent(LogisticsComponent);

        if (entity && facility && facilityComp && aircraftLog && facilityComp.hostedEntityIds.length < facilityComp.hangarCapacity) {
            const aircraftPos = entity.getComponent(TransformComponent)?.position;
            const carrierPos = facility.getComponent(TransformComponent)?.position;

            if (aircraftPos && carrierPos) {
                const dist = VectorMath.distance(aircraftPos, carrierPos);
                // Aircraft must be within 500m and roughly at deck altitude
                if (dist < 500 && Math.abs(aircraftPos.z - carrierPos.z) < 50) {
                    facilityComp.hostedEntityIds.push(cmd.entityId);
                    aircraftLog.state = TurnaroundState.Landing;
                    aircraftLog.stateStartTick = world.currentTick;
                    aircraftLog.stateDurationTicks = 120; // 2 min landing cycle
                    aircraftLog.currentBaseId = cmd.facilityId;

                    world.events.emit({
                        type: 'AircraftLanded',
                        tick: world.currentTick,
                        entityId: cmd.entityId,
                        targetId: cmd.facilityId
                    });
                } else {
                    logger.warn(`Landing failed: Aircraft ${cmd.entityId} too far from carrier ${cmd.facilityId}`, { dist });
                }
            }
        }
    }
}

export class LaunchAircraftHandler implements CommandHandler<LaunchAircraftCommand> {
    execute(cmd: LaunchAircraftCommand, world: World): void {
        const aircraft = world.getEntity(cmd.entityId);
        const log = aircraft?.getComponent(LogisticsComponent);
        if (!aircraft || !log || !log.currentBaseId) return;

        const carrier = world.getEntity(log.currentBaseId);
        const facilityComp = carrier?.getComponent(FacilityComponent);
        const carrierTransform = carrier?.getComponent(TransformComponent);
        const carrierKin = carrier?.getComponent(KinematicsComponent);

        if (carrier && facilityComp && carrierTransform && carrierKin) {
            // 1. Remove from carrier hangar
            facilityComp.hostedEntityIds = facilityComp.hostedEntityIds.filter(id => id !== cmd.entityId);

            // 2. Set to InFlight
            log.lastBaseId = log.currentBaseId;
            log.currentBaseId = undefined;
            log.state = TurnaroundState.InFlight;
            log.stateStartTick = world.currentTick;

            // 3. Inherit Carrier Kinematics + Catapult Boost
            const transform = aircraft.getComponent(TransformComponent);
            const kinematics = aircraft.getComponent(KinematicsComponent);
            const propulsion = aircraft.getComponent(PropulsionComponent);

            if (transform && kinematics) {
                transform.rotation = carrierTransform.rotation;
                transform.pitch = 0;

                // Boost: Current carrier velocity + 100 kts in carrier direction
                const hdgRad = transform.rotation * (Math.PI / 180);
                const boostMPS = 100 * 0.514444;
                const boostVel = {
                    x: Math.sin(hdgRad) * boostMPS,
                    y: Math.cos(hdgRad) * boostMPS,
                    z: 0
                };
                kinematics.velocity = VectorMath.add(carrierKin.velocity, boostVel);

                // Deck Clearance: Move 5m up and 5m forward to avoid immediate deck collision
                const forwardOffset = VectorMath.multiplyScalar(VectorMath.normalize(boostVel), 5);
                transform.position = VectorMath.add(transform.position, VectorMath.add(forwardOffset, { x: 0, y: 0, z: 5 }));

                if (propulsion) {
                    propulsion.state = EngineState.Dry;
                    propulsion.throttle = 1.0;
                }
            }

            world.recordEvent({
                tick: world.currentTick,
                type: 'AircraftLaunched',
                severity: EventSeverity.Info,
                category: 'LOGISTICS',
                message: `Aircraft launched: ${cmd.entityId} from ${carrier.id}`,
                entityId: cmd.entityId,
                payload: { carrierId: carrier.id }
            });
            logger.info(`Aircraft launched: ${cmd.entityId} from ${carrier.id}`);
        }
    }
}

export class UpdateLogisticsStateHandler implements CommandHandler<UpdateLogisticsStateCommand> {
    execute(cmd: UpdateLogisticsStateCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const log = entity?.getComponent(LogisticsComponent);
        if (log) {
            log.state = cmd.newState as TurnaroundState;
            log.stateStartTick = world.currentTick;
            log.stateDurationTicks = cmd.durationTicks;
            if (cmd.baseId) log.currentBaseId = cmd.baseId;
        }
    }
}

export class TransferResourcesHandler implements CommandHandler<TransferResourcesCommand> {
    execute(cmd: TransferResourcesCommand, world: World): void {
        const from = world.getEntity(cmd.fromId);
        const to = world.getEntity(cmd.toId);
        if (!from || !to) return;

        // Handle Fuel
        const fromFuel = from.getComponent(FuelComponent) || from.getComponent(FacilityComponent);
        const toFuel = to.getComponent(FuelComponent) || to.getComponent(FacilityComponent);

        if (fromFuel && toFuel) {
            const fromActual = (fromFuel instanceof FuelComponent) ? fromFuel.currentKg : (fromFuel as FacilityComponent).fuelReservesKg;
            const toMax = (toFuel instanceof FuelComponent) ? toFuel.maxKg : Infinity;
            const toActual = (toFuel instanceof FuelComponent) ? toFuel.currentKg : (toFuel as FacilityComponent).fuelReservesKg;
            const toSpace = toMax - toActual;

            const transfer = Math.min(fromActual, cmd.fuelKg, toSpace);

            if (transfer > 0) {
                if (fromFuel instanceof FuelComponent) fromFuel.currentKg -= transfer;
                else (fromFuel as FacilityComponent).fuelReservesKg -= transfer;

                if (toFuel instanceof FuelComponent) toFuel.currentKg += transfer;
                else (toFuel as FacilityComponent).fuelReservesKg += transfer;
            }
        }

        // Handle Ammo
        const fromCombat = from.getComponent(CombatComponent) || from.getComponent(FacilityComponent);
        const toCombat = to.getComponent(CombatComponent) || to.getComponent(FacilityComponent);

        if (fromCombat && toCombat) {
            for (const [profileId, amount] of cmd.ammoUpdates) {
                let availableToTransfer = 0;
                if (fromCombat instanceof CombatComponent) {
                    for (const mag of fromCombat.magazines) {
                        if (mag.weaponProfileId === profileId) {
                            availableToTransfer += mag.currentCount;
                        }
                    }
                } else {
                    availableToTransfer = (fromCombat as FacilityComponent).ammoReserves.get(profileId) || 0;
                }
                availableToTransfer = Math.min(availableToTransfer, amount);

                let totalSpace = 0;
                if (toCombat instanceof CombatComponent) {
                    for (const mag of toCombat.magazines) {
                        if (mag.weaponProfileId === profileId) {
                            totalSpace += (mag.capacity - mag.currentCount);
                        }
                    }
                } else {
                    totalSpace = 10000;
                }

                const actualTransfer = Math.min(availableToTransfer, totalSpace);

                if (actualTransfer > 0) {
                    if (fromCombat instanceof CombatComponent) {
                        let remainingToSubtract = actualTransfer;
                        for (const mag of fromCombat.magazines) {
                            if (mag.weaponProfileId === profileId) {
                                const toTake = Math.min(mag.currentCount, remainingToSubtract);
                                mag.currentCount -= toTake;
                                remainingToSubtract -= toTake;
                                if (remainingToSubtract <= 0) break;
                            }
                        }
                    } else {
                        const current = (fromCombat as FacilityComponent).ammoReserves.get(profileId) || 0;
                        (fromCombat as FacilityComponent).ammoReserves.set(profileId, current - actualTransfer);
                    }

                    if (toCombat instanceof CombatComponent) {
                        let remainingToGive = actualTransfer;
                        for (const mag of toCombat.magazines) {
                            if (mag.weaponProfileId === profileId) {
                                const space = mag.capacity - mag.currentCount;
                                const toGive = Math.min(space, remainingToGive);
                                mag.currentCount += toGive;
                                remainingToGive -= toGive;
                                if (remainingToGive <= 0) break;
                            }
                        }
                    } else {
                        const current = (toCombat as FacilityComponent).ammoReserves.get(profileId) || 0;
                        (toCombat as FacilityComponent).ammoReserves.set(profileId, current + actualTransfer);
                    }
                }
            }
        }
    }
}

export class ConsumeFuelHandler implements CommandHandler<ConsumeFuelCommand> {
    execute(cmd: ConsumeFuelCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const fuel = entity?.getComponent(FuelComponent);
        if (fuel) {
            fuel.currentKg = Math.max(0, fuel.currentKg - cmd.amountKg);
            fuel.isBingo = fuel.currentKg < (fuel.maxKg * 0.1);
        }
    }
}
