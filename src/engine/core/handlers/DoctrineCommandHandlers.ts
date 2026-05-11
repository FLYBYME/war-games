import { CommandHandler } from '../CommandDispatcher.js';
import { World } from '../World.js';
import {
    SetROECommand,
    SetSideROECommand,
    SetMissionROECommand,
    SetMissionCommand,
    UpdateWRARulesCommand,
    SetLoadoutCommand,
    AssignWeaponCommand,
    SetIntentCommand
} from '../Command.js';
import { ROE, EMCONState, WRARule } from '../Types.js';
import { DoctrineComponent } from '../../components/Doctrine.js';
import { MissionType, MissionStatus } from '../Types.js';
import { MissionComponent } from '../../components/Missions.js';
import { GroupComponent, GroupFormation } from '../../components/Group.js';
import { LogisticsComponent } from '../../components/Logistics.js';
import { CombatComponent } from '../../components/Combat.js';

export class SetIntentHandler implements CommandHandler<SetIntentCommand> {
    execute(cmd: SetIntentCommand, world: World): void {
        const intent = cmd.intent;
        switch (intent.type) {
            case 'Mission': {
                const entity = world.getEntity(intent.actorId);
                if (entity) {
                    entity.removeComponent(MissionComponent);
                    const newMission = new MissionComponent({
                        missionType: intent.missionType,
                        params: intent.params
                    });
                    entity.addComponent(newMission);
                    
                    world.recordEvent({
                        type: 'MissionStatusChanged',
                        tick: world.currentTick,
                        entityId: entity.id,
                        data: {
                            missionType: intent.missionType,
                            oldStatus: 'None',
                            newStatus: 'Active'
                        }
                    });
                }
                break;
            }
            case 'Doctrine': {
                if (intent.actorId) {
                    const entity = world.getEntity(intent.actorId);
                    if (entity) {
                        const doctrine = entity.getComponent(DoctrineComponent);
                        if (doctrine) {
                            if (intent.roe) doctrine.roe = intent.roe as ROE;
                            if (intent.emcon) doctrine.emcon = intent.emcon as EMCONState;
                            if (intent.wra) {
                                doctrine.wraRules = intent.wra.map((r): WRARule => ({
                                    ...r,
                                    maxRangePct: r.maxRangePct ?? 1.0,
                                    quantity: r.quantity ?? 1
                                }));
                            }
                            world.recordEvent({
                                type: 'DoctrineUpdated',
                                tick: world.currentTick,
                                entityId: entity.id,
                                data: {
                                    roe: intent.roe,
                                    emcon: intent.emcon,
                                    wraRulesCount: intent.wra?.length
                                }
                            });
                        }
                    }
                } else if (intent.side) {
                    for (const entity of world.getEntities()) {
                        if (entity.side === intent.side) {
                            const doctrine = entity.getComponent(DoctrineComponent);
                            if (doctrine) {
                                if (intent.roe) doctrine.roe = intent.roe as ROE;
                                if (intent.emcon) doctrine.emcon = intent.emcon as EMCONState;
                                if (intent.wra) {
                                    doctrine.wraRules = intent.wra.map((r): WRARule => ({
                                        ...r,
                                        maxRangePct: r.maxRangePct ?? 1.0,
                                        quantity: r.quantity ?? 1
                                    }));
                                }
                            }
                        }
                    }
                    world.recordEvent({
                        type: 'DoctrineUpdated',
                        tick: world.currentTick,
                        data: {
                            side: intent.side,
                            roe: intent.roe,
                            emcon: intent.emcon,
                            wraRulesCount: intent.wra?.length
                        }
                    });
                }
                break;
            }
            case 'Group': {
                const membersSet = new Set(intent.members);
                const formation = (intent.formationType as GroupFormation) || GroupFormation.None;

                for (const memberId of intent.members) {
                    const entity = world.getEntity(memberId);
                    if (entity) {
                        let groupComp = entity.getComponent(GroupComponent);
                        if (!groupComp) {
                            groupComp = new GroupComponent({
                                groupId: intent.groupId,
                                leaderId: intent.leaderId,
                                memberIds: membersSet,
                                formation: formation
                            });
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
        }
    }
}

export class SetROEHandler implements CommandHandler<SetROECommand> {
    execute(cmd: SetROECommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const doctrine = entity?.getComponent(DoctrineComponent);
        if (doctrine) {
            doctrine.roe = cmd.roe as ROE;
            world.recordEvent({
                type: 'DoctrineUpdated',
                tick: world.currentTick,
                entityId: cmd.entityId,
                data: { roe: cmd.roe }
            });
        }
    }
}

export class SetSideROEHandler implements CommandHandler<SetSideROECommand> {
    execute(cmd: SetSideROECommand, world: World): void {
        for (const entity of world.getEntities()) {
            if (entity.side === cmd.side) {
                const doctrine = entity.getComponent(DoctrineComponent);
                if (doctrine) {
                    doctrine.roe = cmd.roe as ROE;
                }
            }
        }
        world.recordEvent({
            type: 'DoctrineUpdated',
            tick: world.currentTick,
            data: { side: cmd.side, roe: cmd.roe }
        });
    }
}

export class SetMissionROEHandler implements CommandHandler<SetMissionROECommand> {
    execute(cmd: SetMissionROECommand, world: World): void {
        const seed = world.getEntity(cmd.entityId);
        if (seed) {
            const group = seed.getComponent(GroupComponent);
            if (group) {
                for (const memberId of group.memberIds) {
                    const member = world.getEntity(memberId);
                    const doctrine = member?.getComponent(DoctrineComponent);
                    if (doctrine) doctrine.roe = cmd.roe as ROE;
                }
                const leader = world.getEntity(group.leaderId);
                const leaderDoctrine = leader?.getComponent(DoctrineComponent);
                if (leaderDoctrine) leaderDoctrine.roe = cmd.roe as ROE;
            } else {
                const doctrine = seed.getComponent(DoctrineComponent);
                if (doctrine) doctrine.roe = cmd.roe as ROE;
            }
            world.recordEvent({
                type: 'DoctrineUpdated',
                tick: world.currentTick,
                entityId: cmd.entityId,
                data: { roe: cmd.roe }
            });
        }
    }
}

export class SetLoadoutHandler implements CommandHandler<SetLoadoutCommand> {
    execute(cmd: SetLoadoutCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const log = entity?.getComponent(LogisticsComponent);
        if (entity && log) {
            const loadout = world.loadoutRegistry.get(cmd.loadoutId);
            if (loadout) {
                log.loadoutId = loadout.id;
                const combat = entity.getComponent(CombatComponent);
                if (combat) {
                    combat.magazines = [];
                    const addedWeapons = new Set<string>();

                    for (const [mountIndex, weaponProfileId] of loadout.mountWeaponIds.entries()) {
                        if (!addedWeapons.has(weaponProfileId)) {
                            combat.magazines.push({
                                name: `Mag-${weaponProfileId}`,
                                weaponProfileId,
                                capacity: 20,
                                currentCount: 20
                            });
                            addedWeapons.add(weaponProfileId);
                        }

                        if (combat.mounts[mountIndex]) {
                            combat.mounts[mountIndex].activeMagazineIndex = Array.from(addedWeapons).indexOf(weaponProfileId);
                        }
                    }
                }
                world.recordEvent({
                    type: 'GenericEvent',
                    tick: world.currentTick,
                    entityId: entity.id,
                    data: { type: 'LoadoutChanged', loadoutId: loadout.id }
                });
            }
        }
    }
}

export class UpdateWRARulesHandler implements CommandHandler<UpdateWRARulesCommand> {
    execute(cmd: UpdateWRARulesCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const doctrine = entity?.getComponent(DoctrineComponent);
        if (doctrine) {
            doctrine.wraRules = cmd.rules as WRARule[];
            world.recordEvent({
                type: 'DoctrineUpdated',
                tick: world.currentTick,
                entityId: cmd.entityId,
                data: { wraRulesCount: cmd.rules.length }
            });
        }
    }
}

export class AssignWeaponHandler implements CommandHandler<AssignWeaponCommand> {
    execute(cmd: AssignWeaponCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const combat = entity?.getComponent(CombatComponent);
        if (combat) {
            const mount = combat.mounts.find(m => m.name === cmd.mountName);
            if (mount) {
                mount.currentTargetId = cmd.targetId;
                if (!combat.currentTargetId) combat.currentTargetId = cmd.targetId;
            }
        }
    }
}
export class SetMissionHandler implements CommandHandler<SetMissionCommand> {
    execute(cmd: SetMissionCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        if (entity) {
            entity.removeComponent(MissionComponent);
            const newMission = new MissionComponent({
                missionType: cmd.missionType as MissionType,
                params: cmd.params,
                status: MissionStatus.Pending
            });
            entity.addComponent(newMission);

            world.recordEvent({
                type: 'MissionStatusChanged',
                tick: world.currentTick,
                entityId: entity.id,
                data: {
                    missionType: cmd.missionType,
                    oldStatus: 'None',
                    newStatus: 'Pending'
                }
            });
        }
    }
}
