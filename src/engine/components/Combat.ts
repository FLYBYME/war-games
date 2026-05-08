import { IComponent, EntityId } from '../core/Types.js';

export interface Magazine {
    name: string;
    weaponProfileId: string;
    capacity: number;
    currentCount: number;
}

export interface Mount {
    name: string;
    
    // Links to Magazines in the platform's CombatComponent
    magazineIndices: number[];
    
    // Index of the magazine currently feeding the mount
    activeMagazineIndex: number;

    reloadTicks: number;
    lastFireTick: number;

    // Arcs (relative to platform body frame: 0 is nose)
    minAzimuth: number;    // degrees (e.g., -180)
    maxAzimuth: number;    // degrees (e.g., 180)
    minElevation: number;  // degrees (e.g., -20)
    maxElevation: number;  // degrees (e.g., 85)

    // Slew state
    slewRate: number;        // deg/sec (0 for fixed)
    currentAzimuth: number;  // relative to platform nose
    currentElevation: number;
    alignmentThresholdDeg?: number;

    currentTargetId?: EntityId;
}

export class CombatComponent implements IComponent {
    readonly type = 'CombatComponent';

    public mounts: Mount[] = [];
    public magazines: Magazine[] = [];
    public currentTargetId: EntityId | undefined = undefined;

    constructor(init?: Partial<CombatComponent>) {
        if (init) Object.assign(this, init);
    }
}

/**
 * SalvoComponent: Attached to a munition entity that represents a cluster of rounds.
 */
export class SalvoComponent implements IComponent {
    readonly type = 'SalvoComponent';

    public quantity: number = 1;
    public initialQuantity: number = 1;
    public dispersionDeg: number = 0.1;

    constructor(init?: Partial<SalvoComponent>) {
        if (init) Object.assign(this, init);
    }
}
