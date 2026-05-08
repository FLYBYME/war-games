import { IComponent, EntityId, TurnaroundState } from '../core/Types.js';
export { TurnaroundState };

export enum FacilityType {
    Airbase = 'Airbase',
    Carrier = 'Carrier',
    Port = 'Port',
    SAM_Site = 'SAM_Site'
}

export interface Runway {
    id: string;
    lengthM: number;
    isDamaged: boolean;
    isOccupied: boolean;
}

/**
 * FacilityComponent: Data for fixed or mobile bases.
 */
export class FacilityComponent implements IComponent {
    readonly type = 'FacilityComponent';

    public facilityType: FacilityType = FacilityType.Airbase;
    public runways: Runway[] = [];
    public hangarCapacity: number = 20;
    public hostedEntityIds: EntityId[] = [];
    public fuelReservesKg: number = 1000000;
    public ammoReserves: Map<string, number> = new Map();

    constructor(init?: Partial<FacilityComponent>) {
        if (init) Object.assign(this, init);
    }
}

/**
 * LogisticsComponent: Tracks an entity's service state.
 */
export class LogisticsComponent implements IComponent {
    readonly type = 'LogisticsComponent';

    public state: TurnaroundState = TurnaroundState.InFlight;
    public currentBaseId?: EntityId;
    public lastBaseId?: EntityId;
    public stateStartTick: number = 0;
    public stateDurationTicks: number = 0;
    public loadoutId?: string;

    constructor(init?: Partial<LogisticsComponent>) {
        if (init) Object.assign(this, init);
    }
}

export interface Loadout {
    id: string;
    name: string;
    weightKg: number;
    dragMultiplier: number;
    rcsMultiplier: number;
    mountWeaponIds: Map<number, string>; // mountIndex -> weaponProfileId
}
