import { IComponent, Vector3 } from '../core/Types.js';

export interface KinematicSnapshot {
    tick: number;
    pos: Vector3;
    speedKts: number;
    altM: number;
    hp: number;
    isDestroyed: boolean;
    fuelPct: number;
    mission?: {
        type: string;
        status: string;
    };
}

/**
 * TelemetryComponent: Stores historical kinematic data for a unit.
 * Used by the UI for real-time graphing and trail rendering.
 */
export class TelemetryComponent implements IComponent {
    readonly type = 'TelemetryComponent';
    public history: KinematicSnapshot[] = [];
    public maxHistory: number = 10000;

    constructor(init?: Partial<TelemetryComponent>) {
        if (init) Object.assign(this, init);
    }
}

export enum EventSeverity {
    Info = 'Info',
    Warning = 'Warning',
    Critical = 'Critical',
    Combat = 'Combat'
}

export interface TacticalEvent {
    tick: number;
    type?: string; // Specific event name
    severity: EventSeverity;
    category: string;
    message: string;
    entityId?: string;
    pos?: Vector3;
    payload?: Record<string, unknown>;
}
