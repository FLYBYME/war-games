import { IComponent, Vector3, AreaV3, MissionType } from '../core/Types.js';

export { MissionType };

export enum MissionStatus {
    Pending = 'Pending',
    Active = 'Active',
    Completed = 'Completed',
    Aborted = 'Aborted'
}

export interface IdleParams {}
export interface ASWParams {}
export interface EscortParams {}
export interface InterceptParams {
    targetId: string;
}

export type MissionParamsMap = {
    [MissionType.Idle]: IdleParams;
    [MissionType.Patrol]: PatrolParams;
    [MissionType.Strike]: StrikeParams;
    [MissionType.ASW]: ASWParams;
    [MissionType.Escort]: EscortParams;
    [MissionType.VBSS]: VBSSParams;
    [MissionType.Minelaying]: MinelayingParams;
    [MissionType.MCM]: MCMParams;
    [MissionType.Intercept]: InterceptParams;
};

export type MissionParams = MissionParamsMap[MissionType];

/**
 * MissionComponent: High-level AI instruction set.
 */
export class MissionComponent<T extends MissionType = MissionType> implements IComponent {
    readonly type = 'MissionComponent';

    constructor(
        public missionType: T,
        public params: MissionParamsMap[T],
        public status: MissionStatus = MissionStatus.Pending,
        public startTimeTick: number = 0
    ) {}
}

export type AnyMission = MissionComponent<MissionType>;

/**
 * Type guard for specific mission types.
 */
export function isMission<T extends MissionType>(
    mission: AnyMission, 
    type: T
): mission is MissionComponent<T> {
    return mission.missionType === type;
}

/**
 * StrikeMission: Coordinated strike on a target.
 */
export interface StrikeParams {
    targetId: string;
    timeOverTargetTick?: number;
    speedKts?: number;
}

/**
 * PatrolMission: Defines a search area or CAP station.
 */
export interface PatrolParams {
    center: Vector3;
    radiusM: number;
    points: number;
    altitudeM: number;
    speedKts: number;
}

/**
 * VBSSMission: Visit, Board, Search, and Seizure.
 */
export interface VBSSParams {
    targetId: string;
    boardingDurationTicks: number;
    allowedArea?: AreaV3;
}

/**
 * MinelayingMission: Periodic mine deployment along a path or in an area.
 */
export interface MinelayingParams {
    mineProfileId: string;
    area: AreaV3;
    quantity: number;
    spacingM: number;
}

/**
 * MCMMission: Mine Countermeasures.
 */
export interface MCMParams {
    area: AreaV3;
    method: 'Sweep' | 'Hunt';
}
