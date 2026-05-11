import { CommandHandler } from '../CommandDispatcher.js';
import { World } from '../World.js';
import { 
    AddWaypointCommand, 
    ClearWaypointsCommand, 
    JoinFormationCommand, 
    BreakFormationCommand, 
    SetFormationCommand 
} from '../Command.js';
import { NavigationComponent, NavState, FormationComponent } from '../../components/Navigation.js';

export class AddWaypointHandler implements CommandHandler<AddWaypointCommand> {
    execute(cmd: AddWaypointCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        if (!entity) return;
        let nav = entity.getComponent(NavigationComponent);
        if (!nav) {
            nav = new NavigationComponent();
            entity.addComponent(nav);
        }
        nav.waypoints.push({ position: cmd.position, speedKts: cmd.speedKts });
        nav.navState = NavState.Waypoint;

        world.recordEvent({
            type: 'MissionStatusChanged',
            tick: world.currentTick,
            entityId: cmd.entityId,
            data: {
                missionType: 'Navigation',
                oldStatus: 'None',
                newStatus: 'Active'
            }
        });
    }
}

export class ClearWaypointsHandler implements CommandHandler<ClearWaypointsCommand> {
    execute(cmd: ClearWaypointsCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const nav = entity?.getComponent(NavigationComponent);
        if (nav) {
            nav.waypoints = [];
            nav.activeWaypointIndex = 0;
            nav.navState = NavState.None;
        }
    }
}

export class JoinFormationHandler implements CommandHandler<JoinFormationCommand> {
    execute(cmd: JoinFormationCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        if (!entity) return;
        let nav = entity.getComponent(NavigationComponent);
        if (!nav) {
            nav = new NavigationComponent();
            entity.addComponent(nav);
        }
        nav.navState = NavState.Formation;
        entity.addComponent(new FormationComponent(cmd.leaderId, cmd.offset));
    }
}

export class BreakFormationHandler implements CommandHandler<BreakFormationCommand> {
    execute(cmd: BreakFormationCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        if (!entity) return;
        const nav = entity.getComponent(NavigationComponent);
        if (nav) {
            nav.navState = NavState.None;
        }
        entity.removeComponent(FormationComponent);
    }
}

export class SetFormationHandler implements CommandHandler<SetFormationCommand> {
    execute(cmd: SetFormationCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        if (!entity) return;
        let nav = entity.getComponent(NavigationComponent);
        if (!nav) {
            nav = new NavigationComponent();
            entity.addComponent(nav);
        }
        nav.navState = NavState.Formation;
        const form = entity.getComponent(FormationComponent);
        if (form) {
            form.leaderId = cmd.leaderId;
            form.stationOffset = cmd.offset;
        } else {
            entity.addComponent(new FormationComponent(cmd.leaderId, cmd.offset));
        }
    }
}
