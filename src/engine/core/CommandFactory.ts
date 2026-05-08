import { 
    Command, 
    AddWaypointCommand, 
    ClearWaypointsCommand, 
    FireWeaponCommand,
    JoinFormationCommand,
    BreakFormationCommand,
    SetHeadingCommand,
    SetAltitudeCommand,
    SetSpeedCommand,
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
    LaunchAircraftCommand,
    SetSimulationSpeedCommand
} from './Command.js';
import { Side, EngineCommandPayload, Vector3, MissionType } from './Types.js';

/**
 * CommandFactory: Instantiates Engine V3 Command classes from generic JSON payloads.
 */
export class CommandFactory {
    private static readonly registry: Record<string, (p: any, s?: Side) => Command> = {
        'SetCourse': (p) => new AddWaypointCommand(p.entityId, p.position, p.speedKts || 300),
        'AddWaypoint': (p) => new AddWaypointCommand(p.entityId, p.position, p.speedKts || 300),
        'ClearWaypoints': (p) => new ClearWaypointsCommand(p.entityId),
        'FireWeapon': (p) => new FireWeaponCommand(p.entityId, p.mountIndex, p.targetId),
        'JoinFormation': (p) => new JoinFormationCommand(p.entityId, p.leaderId, p.offset),
        'BreakFormation': (p) => new BreakFormationCommand(p.entityId),
        'SetHeading': (p) => new SetHeadingCommand(p.entityId, p.heading),
        'SetSpeed': (p) => new SetSpeedCommand(p.entityId, p.speedKts),
        'ApplyDamage': (p) => new ApplyDamageCommand(p.entityId, p.damage),
        'DestroyEntity': (p) => new DestroyEntityCommand(p.entityId),
        'LandAtFacility': (p) => new LandAtFacilityCommand(p.entityId, p.facilityId),
        'SetSensorState': (p) => new SetSensorStateCommand(p.entityId, p.sensor, p.active),
        'SetEMCON': (p) => new SetEMCONCommand(p.entityId || 'GLOBAL', p.state),
        'AssignWeapon': (p) => new AssignWeaponCommand(p.entityId, p.mount, p.targetId),
        'SetUnitROE': (p) => new SetROECommand(p.entityId, p.roe),
        'SetGlobalROE': (p, s) => new SetSideROECommand(s || Side.Blue, p.roe),
        'SetMissionROE': (p) => new SetMissionROECommand('MISSION', p.roe),
        'SetMission': (p) => new SetMissionCommand(p.entityId, p.mission.type, p.mission.params || {}),
        'SetAltitude': (p) => new SetAltitudeCommand(p.entityId, p.altitudeM),
        'UpdateWRARules': (p) => new UpdateWRARulesCommand(p.entityId, p.rules),
        'SetLoadout': (p) => new SetLoadoutCommand(p.entityId, p.loadout),
        'SetEnvironment': (p) => new SetEnvironmentCommand(p.key, p.value),
        'SpawnEntity': (p) => new SpawnEntityCommand(p.id, p.profileId, p.side, p.position, p.heading || 0),
        'SetIntent': (p) => new SetIntentCommand(p.intent),
        'LaunchAircraft': (p) => new LaunchAircraftCommand(p.entityId),
        'SetSimulationSpeed': (p) => new SetSimulationSpeedCommand(p.timeCompression, p.isPaused)
    };

    public static create(payload: EngineCommandPayload, side?: Side): Command | undefined {
        const creator = this.registry[payload.type];
        return creator ? creator(payload, side) : undefined;
    }
}
