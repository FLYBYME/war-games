import { IComponent, Vector3, AreaV3, MissionType, MissionStatus } from '../core/Types.js';

export { MissionType, MissionStatus };

/**
 * Mission Parameter Interfaces
 */
export interface IdleParams {}
export interface ASWParams {}
export interface EscortParams {}
export interface InterceptParams {
    targetId: string;
}

export interface StrikeParams {
    targetId: string;
    timeOverTargetTick?: number;
    speedKts?: number;
}

export interface PatrolParams {
    center: Vector3;
    radiusM: number;
    points: number;
    altitudeM: number;
    speedKts: number;
}

export interface VBSSParams {
    targetId: string;
    boardingDurationTicks: number;
    allowedArea?: AreaV3;
}

export interface MinelayingParams {
    mineProfileId: string;
    area: AreaV3;
    quantity: number;
    spacingM: number;
}

export interface MCMParams {
    area: AreaV3;
    method: 'Sweep' | 'Hunt';
}

/**
 * Mission Type Mapping
 */
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

    public missionType: T;
    public params: MissionParamsMap[T];
    public status: MissionStatus = MissionStatus.Pending;
    public startTimeTick: number = 0;

    constructor(init?: Partial<MissionComponent<T>>) {
        this.missionType = (init?.missionType ?? MissionType.Idle) as T;
        this.params = (init?.params ?? {}) as MissionParamsMap[T];
        if (init?.status) this.status = init.status;
        if (init?.startTimeTick) this.startTimeTick = init.startTimeTick;
    }
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
