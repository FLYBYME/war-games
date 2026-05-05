import { IComponent, EntityId } from '../core/Types.js';

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

    constructor(
        public facilityType: FacilityType,
        public runways: Runway[] = [],
        public hangarCapacity: number = 20,
        public hostedEntityIds: EntityId[] = [],
        public fuelReservesKg: number = 1000000,
        public ammoReserves: Map<string, number> = new Map()
    ) {}
}

export enum TurnaroundState {
    None = 'None',
    Landing = 'Landing',
    Taxiing = 'Taxiing',
    Rearming = 'Rearming',
    Refueling = 'Refueling',
    PreFlight = 'PreFlight',
    Ready = 'Ready',
    InFlight = 'InFlight'
}

/**
 * LogisticsComponent: Tracks an entity's service state.
 */
export class LogisticsComponent implements IComponent {
    readonly type = 'LogisticsComponent';

    constructor(
        public state: TurnaroundState = TurnaroundState.InFlight,
        public currentBaseId?: EntityId,
        public lastBaseId?: EntityId,
        public stateStartTick: number = 0,
        public stateDurationTicks: number = 0,
        public loadoutId?: string
    ) {}
}

export interface Loadout {
    id: string;
    name: string;
    weightKg: number;
    dragMultiplier: number;
    rcsMultiplier: number;
    mountWeaponIds: Map<number, string>; // mountIndex -> weaponProfileId
}
