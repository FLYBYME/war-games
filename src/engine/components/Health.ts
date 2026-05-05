import { IComponent } from '../core/Types.js';

export enum SubsystemType {
    Propulsion = 'Propulsion',
    Sensors = 'Sensors',
    Combat = 'Combat',
    Comms = 'Comms',
    Navigation = 'Navigation',
    General = 'General'
}

export interface Subsystem {
    id: string;
    name: string;
    type: SubsystemType;
    hp: number;
    maxHp: number;
    isFunctional: boolean;
}

/**
 * HealthComponent: Vitality and destruction state.
 * Supports granular subsystem-level damage.
 */
export class HealthComponent implements IComponent {
    readonly type = 'HealthComponent';

    constructor(
        public hp: number = 100,
        public maxHp: number = 100,
        public isDestroyed: boolean = false,
        public subsystems: Subsystem[] = [],
        public fires: number = 0,           // Number of active fire locations
        public flooding: number = 0,        // Flooding severity (0.0 to 1.0)
        public structuralIntegrity: number = 1.0
    ) {}
}
