import {
    Command,
    AddWaypointCommand,
    AddDetectionCommand,
    ClearWaypointsCommand,    FireWeaponCommand,
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
import { Side, EngineCommandPayload } from './Types.js';

/**
 * CommandFactory: Instantiates Engine V3 Command classes from validated EngineCommandPayload.
 * Uses the discriminated union's `type` field to safely narrow to the correct payload type.
 */
export class CommandFactory {
    public static create(payload: EngineCommandPayload, side?: Side): Command | undefined {
        switch (payload.type) {
            case 'SetCourse':
                return new AddWaypointCommand(payload.entityId, payload.position, payload.speedKts ?? 300);
            case 'AddWaypoint':
                return new AddWaypointCommand(payload.entityId, payload.position, payload.speedKts ?? 300);
            case 'AddDetection':
                return new AddDetectionCommand(payload.entityId, payload.targetId);
            case 'ClearWaypoints':
                return new ClearWaypointsCommand(payload.entityId);
            case 'FireWeapon':
                return new FireWeaponCommand(payload.entityId, payload.mountIndex, payload.targetId);
            case 'JoinFormation':
                return new JoinFormationCommand(payload.entityId, payload.leaderId, payload.offset);
            case 'BreakFormation':
                return new BreakFormationCommand(payload.entityId);
            case 'SetHeading':
                return new SetHeadingCommand(payload.entityId, payload.heading);
            case 'SetSpeed':
                return new SetSpeedCommand(payload.entityId, payload.speedKts);
            case 'SetAltitude':
                return new SetAltitudeCommand(payload.entityId, payload.altitudeM);
            case 'ApplyDamage':
                return new ApplyDamageCommand(payload.entityId, payload.damage);
            case 'DestroyEntity':
                return new DestroyEntityCommand(payload.entityId);
            case 'LandAtFacility':
                return new LandAtFacilityCommand(payload.entityId, payload.facilityId);
            case 'SetSensorState':
                return new SetSensorStateCommand(payload.entityId, payload.sensor, payload.active);
            case 'SetEMCON':
                return new SetEMCONCommand(payload.entityId ?? 'GLOBAL', payload.state);
            case 'AssignWeapon':
                return new AssignWeaponCommand(payload.entityId, payload.mount, payload.targetId);
            case 'SetUnitROE':
                return new SetROECommand(payload.entityId, payload.roe);
            case 'SetGlobalROE':
                return new SetSideROECommand(side ?? Side.Blue, payload.roe);
            case 'SetMissionROE':
                return new SetMissionROECommand('MISSION', payload.roe);
            case 'SetMission':
                return new SetMissionCommand(payload.entityId, payload.mission.type, 'params' in payload.mission ? payload.mission.params : {});
            case 'UpdateWRARules':
                return new UpdateWRARulesCommand(payload.entityId, payload.rules);
            case 'SetLoadout':
                return new SetLoadoutCommand(payload.entityId, payload.loadout);
            case 'SetEnvironment':
                return new SetEnvironmentCommand(payload.key, payload.value);
            case 'SpawnEntity':
                return new SpawnEntityCommand(payload.id, payload.profileId, payload.side, payload.position, payload.heading ?? 0, payload.speedKts);
            case 'SetIntent':
                return new SetIntentCommand(payload.intent);
            case 'LaunchAircraft':
                return new LaunchAircraftCommand(payload.entityId);
            case 'SetSimulationSpeed':
                return new SetSimulationSpeedCommand(payload.timeCompression, payload.isPaused);
            case 'TransferResources':
                // TransferResources doesn't have a Command class yet — handle gracefully
                return undefined;
            default:
                return undefined;
        }
    }
}
