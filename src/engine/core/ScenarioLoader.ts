import { World } from './World.js';
import { EntityManager } from './EntityManager.js';
import { ScenarioAutomationSystem } from '../systems/ScenarioAutomationSystem.js';
import { MissionComponent, MissionType } from '../components/Missions.js';
import { DoctrineComponent, ROE, EMCONState } from '../components/Doctrine.js';
import { GroupComponent, GroupFormation } from '../components/Group.js';
import { FacilityComponent, LogisticsComponent, TurnaroundState } from '../components/Logistics.js';
import { PropulsionComponent, EngineState } from '../components/Propulsion.js';
import { logger } from './Logger.js';

import type { ScenarioManifest, ScenarioEvent, ScenarioAssertion, ScenarioIntent } from '../../sdk/schemas/index.js';
export type { ScenarioManifest, ScenarioEvent, ScenarioAssertion, ScenarioIntent };

/**
 * ScenarioLoader: Populates a World based on a JSON manifest.
 */
export class ScenarioLoader {
    constructor(private entityMgr: EntityManager) { }

    public load(manifest: ScenarioManifest): void {
        console.log(`Loading Scenario: ${manifest.name}`);

        // Get the world from the entity manager
        const world = this.entityMgr.getWorld();

        // 1. Register Scenario-Specific Profiles
        if (manifest.platformProfiles) {
            for (const [id, profile] of Object.entries(manifest.platformProfiles)) {
                world.profileRegistry.register(id, profile);
            }
        }

        if (manifest.weaponProfiles) {
            for (const profile of manifest.weaponProfiles) {
                world.weaponProfiles.register(profile.id, profile);
            }
        }

        // 2. Spawn Entities
        for (const entityDef of manifest.entities) {
            const params: any = { ...entityDef };
            
            // Normalize position: schema allows Vector3 or tuple, but EntityManager expects Vector3 | [number, number, number]
            if (entityDef.position) {
                params.pos = entityDef.position;
            } else if (entityDef.pos) {
                params.pos = entityDef.pos;
            }

            this.entityMgr.spawn(params);
        }

        // Process Intents
        if (manifest.intents) {
            for (const intent of manifest.intents) {
                this.applyIntent(world, intent);
            }
        }

        // Initialize automation if present
        if (manifest.events || manifest.assertions) {
            const automation = world.getSystem(ScenarioAutomationSystem);
            if (automation) {
                automation.setup(manifest.events || [], manifest.assertions || [], world);
            }
        }
    }

    private applyIntent(world: World, intent: ScenarioIntent): void {
        switch (intent.type) {
            case 'Mission': {
                console.log(`  Applying Mission intent for actor: ${intent.actorId} [${intent.missionType}]`);
                const entity = world.getEntity(intent.actorId);
                if (entity) {
                    entity.removeComponent(MissionComponent);
                    const newMission = new MissionComponent(intent.missionType as MissionType, intent.params);
                    entity.addComponent(newMission);
                } else {
                    console.warn(`  Actor ${intent.actorId} not found for Mission intent`);
                }
                break;
            }
            case 'Doctrine': {
                console.log(`  Applying Doctrine intent for ${intent.actorId ? 'actor: ' + intent.actorId : 'side: ' + intent.side}`);
                if (intent.actorId) {
                    const entity = world.getEntity(intent.actorId);
                    if (entity) {
                        const doctrine = entity.getComponent(DoctrineComponent);
                        if (doctrine) {
                            if (intent.roe) doctrine.roe = intent.roe as ROE;
                            if (intent.emcon) doctrine.emcon = intent.emcon as EMCONState;
                            if (intent.wra) {
                                doctrine.wraRules = intent.wra.map(r => ({
                                    ...r,
                                    maxRangePct: r.maxRangePct ?? 1.0,
                                    quantity: r.quantity ?? 1
                                }));
                            }
                        } else {
                            console.warn(`  Actor ${intent.actorId} has no DoctrineComponent`);
                        }
                    } else {
                        console.warn(`  Actor ${intent.actorId} not found for Doctrine intent`);
                    }
                } else if (intent.side) {
                    // Apply to all entities of a side
                    let count = 0;
                    for (const entity of world.getEntities()) {
                        if (entity.side === intent.side) {
                            const doctrine = entity.getComponent(DoctrineComponent);
                            if (doctrine) {
                                count++;
                                if (intent.roe) doctrine.roe = intent.roe as ROE;
                                if (intent.emcon) doctrine.emcon = intent.emcon as EMCONState;
                                if (intent.wra) {
                                    doctrine.wraRules = intent.wra.map(r => ({
                                        ...r,
                                        maxRangePct: r.maxRangePct ?? 1.0,
                                        quantity: r.quantity ?? 1
                                    }));
                                }
                            }
                        }
                    }
                    console.log(`  Applied side-wide doctrine to ${count} entities`);
                }
                break;
            }
            case 'Group': {
                const membersSet = new Set(intent.members);
                const formation = (intent.formationType || GroupFormation.None) as GroupFormation;

                for (const memberId of intent.members) {
                    const entity = world.getEntity(memberId);
                    if (entity) {
                        let groupComp = entity.getComponent(GroupComponent);
                        if (!groupComp) {
                            groupComp = new GroupComponent(intent.groupId, intent.leaderId, membersSet, formation);
                            entity.addComponent(groupComp);
                        } else {
                            groupComp.groupId = intent.groupId;
                            groupComp.leaderId = intent.leaderId;
                            groupComp.memberIds = membersSet;
                            groupComp.formation = formation;
                        }
                    }
                }
                break;
            }
            case 'Logistics': {
                logger.info(`Processing Logistics Intent: base=${intent.baseId} entities=${intent.hostedEntities.join(',')}`);
                const base = world.getEntity(intent.baseId);
                const facilityComp = base?.getComponent(FacilityComponent);

                if (base && facilityComp) {
                    for (const aircraftId of intent.hostedEntities) {
                        const aircraft = world.getEntity(aircraftId);
                        const logComp = aircraft?.getComponent(LogisticsComponent);

                        if (aircraft && logComp) {
                            // 1. Tell the carrier it is hosting this aircraft
                            if (!facilityComp.hostedEntityIds.includes(aircraftId)) {
                                facilityComp.hostedEntityIds.push(aircraftId);
                            }

                            // 2. Tell the aircraft it is parked here
                            logComp.currentBaseId = intent.baseId;
                            logComp.state = (intent.initialState || TurnaroundState.Ready) as TurnaroundState;
                            logComp.stateStartTick = world.currentTick;

                            // 3. Ensure aircraft engines are off to start
                            const prop = aircraft.getComponent(PropulsionComponent);
                            if (prop) {
                                prop.throttle = 0;
                                prop.state = EngineState.Off;
                            }
                        }
                    }
                }
                break;
            }
        }
    }
}
