import { 
    Command, 
    AddWaypointCommand, 
    ClearWaypointsCommand, 
    FireWeaponCommand,
    JoinFormationCommand,
    BreakFormationCommand,
    SetFormationCommand,
    SetHeadingCommand,
    SetAltitudeCommand,
    SetSpeedCommand,
    SetThrustCommand,
    ApplyDamageCommand,
    DestroyEntityCommand,
    LandAtFacilityCommand,
    SetSensorStateCommand,
    SetEMCONCommand,
    AssignWeaponCommand,
    SetROECommand,
    SetSideROECommand,
    SetMissionROECommand,
    SetMissionCommand,
    SetLoadoutCommand,
    UpdateWRARulesCommand,
    SetEnvironmentCommand,
    SpawnEntityCommand,
    SetIntentCommand,
    LaunchAircraftCommand
} from './Command.js';
import { Side } from './Types.js';

/**
 * CommandFactory: Instantiates Engine V3 Command classes from generic JSON payloads.
 */
export class CommandFactory {
    public static create(payload: any, side?: Side): Command | undefined {
        const { type, entityId, ...params } = payload;

        switch (type) {
            case 'SetCourse':
            case 'AddWaypoint':
                return new AddWaypointCommand(
                    entityId, 
                    params.position || params.waypoint, 
                    params.speedKts || 300
                );
            
            case 'ClearWaypoints':
                return new ClearWaypointsCommand(entityId);

            case 'FireWeapon':
                return new FireWeaponCommand(
                    entityId, 
                    params.mountIndex ?? 0, 
                    params.targetId
                );

            case 'JoinFormation':
                return new JoinFormationCommand(
                    entityId,
                    params.leaderId,
                    params.offset
                );

            case 'BreakFormation':
                return new BreakFormationCommand(entityId);

            case 'SetFormation':
                return new SetFormationCommand(entityId, params.leaderId, params.offset);

            case 'SetHeading':
                return new SetHeadingCommand(entityId, params.heading || params.headingDeg);

            case 'SetSpeed':
                return new SetSpeedCommand(entityId, params.speed || params.speedKts);

            case 'ApplyDamage':
                return new ApplyDamageCommand(entityId, params.damage);

            case 'DestroyEntity':
                return new DestroyEntityCommand(entityId);

            case 'LandAtFacility':
                return new LandAtFacilityCommand(entityId, params.facilityId);

            case 'SetSensorState':
                return new SetSensorStateCommand(entityId, params.sensor, params.active);

            case 'SetEMCON':
                return new SetEMCONCommand(entityId, params.state);

            case 'AssignWeapon':
                return new AssignWeaponCommand(entityId, params.mount, params.targetId);

            case 'SetUnitROE':
                return new SetROECommand(entityId, params.roe);

            case 'SetGlobalROE':
                return new SetSideROECommand(side || Side.Blue, params.roe);

            case 'SetMissionROE':
                return new SetMissionROECommand(entityId || 'none', params.roe);

            case 'SetMission':
                return new SetMissionCommand(entityId, params.missionType, params.params);

            case 'SetAltitude':
                return new SetAltitudeCommand(entityId, params.altitude || params.altitudeM);

            case 'UpdateWRARules':
                return new UpdateWRARulesCommand(entityId, params.rules);

            case 'SetLoadout':
                return new SetLoadoutCommand(entityId, params.loadoutId);
            
            case 'SetEnvironment':
                return new SetEnvironmentCommand(params.key, params.value);

            case 'SpawnEntity':
                return new SpawnEntityCommand(
                    params.id,
                    params.profileId,
                    params.side,
                    params.position,
                    params.heading || 0
                );

            case 'SetIntent':
                return new SetIntentCommand(params.intent);

            case 'LaunchAircraft':
                return new LaunchAircraftCommand(entityId);

            default:
                return undefined;
        }
    }
}
