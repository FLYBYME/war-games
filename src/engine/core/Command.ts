import { EntityId, Vector3, Track, Side, ScenarioIntent, ESMBearing, MissionParams, WRARule } from './Types.js';

export abstract class Command {
    public isExternal: boolean = false;
    constructor(
        public readonly entityId: EntityId,
        public readonly priority: number = 0
    ) {}
}

export class SetSimulationSpeedCommand extends Command {
    constructor(public readonly timeCompression: number, public readonly isPaused?: boolean) {
        super('GLOBAL', 100);
    }
}

/** Physics & Transform */
export class SetPositionCommand extends Command {
    constructor(entityId: EntityId, public readonly x: number, public readonly y: number, public readonly z: number) {
        super(entityId, 10);
    }
}

export class SetHeadingCommand extends Command {
    constructor(entityId: EntityId, public readonly heading: number, public readonly forceImmediate: boolean = false) {
        super(entityId, 10);
    }
}

export class SetPitchCommand extends Command {
    constructor(entityId: EntityId, public readonly pitch: number) {
        super(entityId, 10);
    }
}

export class SetAltitudeCommand extends Command {
    constructor(entityId: EntityId, public readonly altitudeM: number) {
        super(entityId, 10);
    }
}

export class SetSpeedCommand extends Command {
    constructor(entityId: EntityId, public readonly speedKts: number) {
        super(entityId, 10);
    }
}

export class UpdateKinematicsCommand extends Command {
    constructor(entityId: EntityId, public readonly velocity: Vector3, public readonly acceleration: Vector3) {
        super(entityId, 5);
    }
}

export class ApplyForceCommand extends Command {
    constructor(entityId: EntityId, public readonly forceX: number, public readonly forceY: number, public readonly forceZ: number) {
        super(entityId, 5);
    }
}

export class SetThrottleCommand extends Command {
    constructor(entityId: EntityId, public readonly throttle: number) {
        super(entityId, 5);
    }
}

/** Sensors & Detection */
export class AddDetectionCommand extends Command {
    constructor(observerId: EntityId, public readonly targetId: EntityId) {
        super(observerId, 15);
    }
}

export class RemoveDetectionCommand extends Command {
    constructor(observerId: EntityId, public readonly targetId: EntityId) {
        super(observerId, 15);
    }
}
export class SyncESMBearingsCommand extends Command {
    constructor(observerId: EntityId, public readonly bearings: ESMBearing[]) {
        super(observerId, 15);
    }
}

/** TMS (Track Management System) */
export class CreateTrackCommand extends Command {
    constructor(observerId: EntityId, public readonly track: Track) {
        super(observerId, 12);
    }
}

export class UpdateTrackCommand extends Command {
    constructor(observerId: EntityId, public readonly trackId: string, public readonly updates: Partial<Track>) {
        super(observerId, 12);
    }
}

export class DropTrackCommand extends Command {
    constructor(observerId: EntityId, public readonly trackId: string) {
        super(observerId, 12);
    }
}

export class UpdateMountSlewCommand extends Command {
    constructor(entityId: EntityId, public readonly mountIndex: number, public readonly azimuth: number, public readonly elevation: number) {
        super(entityId, 12);
    }
}

export class SyncTracksCommand extends Command {
    constructor(entityId: EntityId, public readonly tracks: Track[]) {
        super(entityId, 11);
    }
}

export class UpdateSensorScanCommand extends Command {
    constructor(entityId: EntityId, public readonly azimuth: number) {
        super(entityId, 10);
    }
}

export class UpdateThrustCommand extends Command {
    constructor(entityId: EntityId, public readonly thrustN: number) {
        super(entityId, 25);
    }
}

export class ConsumeFuelCommand extends Command {
    constructor(entityId: EntityId, public readonly amountKg: number) {
        super(entityId, 25);
    }
}

/** Sensors & EMCON Commands */
export class SetSensorStateCommand extends Command {
    constructor(entityId: EntityId, public readonly sensorName: string, public readonly active: boolean) {
        super(entityId, 15);
    }
}

export class SetEMCONCommand extends Command {
    constructor(entityId: EntityId, public readonly state: string) {
        super(entityId, 15);
    }
}

/** Weapon Stage Commands */
export class NextWeaponStageCommand extends Command {
    constructor(entityId: EntityId) {
        super(entityId, 20);
    }
}

export class UpdateStageTicksCommand extends Command {
    constructor(entityId: EntityId, public readonly elapsedTicks: number) {
        super(entityId, 20);
    }
}

/** Combat & Health Commands */
export class FireWeaponCommand extends Command {
    constructor(shooterId: EntityId, public readonly mountIndex: number, public readonly targetId: EntityId) {
        super(shooterId, 30);
    }
}

export class FireSalvoCommand extends Command {
    constructor(
        shooterId: EntityId, 
        public readonly mountIndex: number, 
        public readonly targetId: EntityId, 
        public readonly quantity: number
    ) {
        super(shooterId, 31);
    }
}

export class ApplyDamageCommand extends Command {
    constructor(targetId: EntityId, public readonly damage: number) {
        super(targetId, 40);
    }
}

export class DestroyEntityCommand extends Command {
    constructor(entityId: EntityId) {
        super(entityId, 50);
    }
}

export class DetonateCommand extends Command {
    constructor(entityId: EntityId, public readonly radius: number, public readonly damage: number) {
        super(entityId, 50);
    }
}

/** Doctrine & ROE Commands */
export class SetROECommand extends Command {
    constructor(entityId: EntityId, public readonly roe: string) {
        super(entityId, 15);
    }
}

export class SetSideROECommand extends Command {
    constructor(public readonly side: Side, public readonly roe: string) {
        super('GLOBAL', 15);
    }
}

export class SetMissionROECommand extends Command {
    constructor(public readonly entityId: string, public readonly roe: string) {
        super('MISSION', 15);
    }
}

export class SetMissionCommand extends Command {
    constructor(entityId: EntityId, public readonly missionType: string, public readonly params: MissionParams) {
        super(entityId, 25);
    }
}

export class SetLoadoutCommand extends Command {
    constructor(entityId: EntityId, public readonly loadoutId: string) {
        super(entityId, 30);
    }
}

export class AssignWeaponCommand extends Command {
    constructor(entityId: EntityId, public readonly mountName: string, public readonly targetId: EntityId) {
        super(entityId, 20);
    }
}

export class UpdateWRARulesCommand extends Command {
    constructor(entityId: EntityId, public readonly rules: WRARule[]) {
        super(entityId, 15);
    }
}

/** Environment Commands */
export class UpdateEnvironmentCommand extends Command {
    constructor(
        public override readonly entityId: string,
        public terrainHeightM: number,
        public airDensity: number,
        public pressureRatio: number,
        public isGrounded: boolean,
        public waterTemperatureC: number,
        public soundSpeedMPS: number,
        public layerDepthM: number,
        public isSubmerged: boolean,
        public precipitationRateMMhr: number,
        public cloudCover: number,
        public seaState: number
    ) {
        super(entityId, 50);
    }
}

export class SetEnvironmentCommand extends Command {
    constructor(public readonly key: string, public readonly value: number) {
        super('GLOBAL', 60);
    }
}

/** Navigation & Formation Commands */
export class AddWaypointCommand extends Command {
    constructor(entityId: EntityId, public readonly position: Vector3, public readonly speedKts: number) {
        super(entityId, 20);
    }
}

export class ClearWaypointsCommand extends Command {
    constructor(entityId: EntityId) {
        super(entityId, 20);
    }
}

export class JoinFormationCommand extends Command {
    constructor(entityId: EntityId, public readonly leaderId: EntityId, public readonly offset: Vector3) {
        super(entityId, 20);
    }
}

export class BreakFormationCommand extends Command {
    constructor(entityId: EntityId) {
        super(entityId, 20);
    }
}

/** Logistics & Facility Commands */
export class LandAtFacilityCommand extends Command {
    constructor(entityId: EntityId, public readonly facilityId: EntityId) {
        super(entityId, 30);
    }
}

export class LaunchAircraftCommand extends Command {
    constructor(entityId: EntityId) {
        super(entityId, 31);
    }
}

export class UpdateLogisticsStateCommand extends Command {
    constructor(
        entityId: EntityId, 
        public readonly newState: string, 
        public readonly durationTicks: number,
        public readonly baseId?: EntityId
    ) {
        super(entityId, 25);
    }
}

export class TransferResourcesCommand extends Command {
    constructor(
        public readonly fromId: EntityId,
        public readonly toId: EntityId,
        public readonly fuelKg: number,
        public readonly ammoUpdates: Map<string, number> // weaponProfileId -> amount
    ) {
        super(fromId, 25);
    }
}

/** Damage & Degradation Commands */
export class ApplySubsystemDamageCommand extends Command {
    constructor(
        entityId: EntityId, 
        public readonly subsystemId: string, 
        public readonly damage: number
    ) {
        super(entityId, 45); // Higher priority than general damage
    }
}

export class SetConditionCommand extends Command {
    constructor(
        entityId: EntityId,
        public readonly fires?: number,
        public readonly flooding?: number
    ) {
        super(entityId, 40);
    }
}

export class SetFormationCommand extends Command {
    constructor(entityId: EntityId, public readonly leaderId: EntityId, public readonly offset: Vector3) {
        super(entityId, 20);
    }
}
export class SpawnEntityCommand extends Command {
    constructor(
        public readonly id: string,
        public readonly profileId: string,
        public readonly side: Side,
        public readonly position: Vector3,
        public readonly heading: number,
        public readonly speedKts?: number
    ) {
        super(id, 60);
    }
}

export class SetIntentCommand extends Command {
    constructor(public readonly intent: ScenarioIntent & { aggressiveness?: number, riskTolerance?: number }) {
        super('GLOBAL', 70);
    }
}

export class ChangeSideCommand extends Command {
    constructor(entityId: EntityId, public readonly newSide: Side) {
        super(entityId, 80);
    }
}
