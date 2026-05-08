import { IComponent, EntityId, Vector3 } from '../core/Types.js';

export enum GuidanceType {
    SARH = 'SARH',     // Semi-Active Radar Homing
    ARH = 'ARH',       // Active Radar Homing
    IR = 'IR',         // Infra-Red
    Command = 'Command', // Radio Command
    INS = 'INS',       // Inertial Navigation System
    GPS = 'GPS'        // Global Positioning System
}

/**
 * GuidanceComponent: Manages weapon homing logic.
 */
export class GuidanceComponent implements IComponent {
    readonly type = 'GuidanceComponent';
    public lastLOS: Vector3 | null = null;

    public guidanceType: GuidanceType = GuidanceType.INS;
    public targetId: EntityId = '';
    public illuminatorId?: EntityId;
    public hasLock: boolean = false;
    public lastLockTick: number = 0;
    public maneuverabilityG: number = 30;

    constructor(init?: Partial<GuidanceComponent>) {
        if (init) Object.assign(this, init);
    }
}
