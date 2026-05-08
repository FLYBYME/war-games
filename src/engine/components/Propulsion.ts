import { IComponent } from '../core/Types.js';

export enum EngineState {
    Off = 'Off',
    Starting = 'Starting',
    Dry = 'Dry',
    Afterburner = 'Afterburner'
}

/**
 * PropulsionComponent: Models a variable-cycle jet engine.
 * Thrust and fuel consumption are dynamic based on throttle, altitude, and speed.
 */
export class PropulsionComponent implements IComponent {
    readonly type = 'PropulsionComponent';

    public throttle: number = 0;           // 0.0 to 1.0
    public currentThrustN: number = 0;
    public maxThrustDryN: number = 70000;  // Max dry thrust at SL
    public maxThrustAbN: number = 110000;  // Max AB thrust at SL
    public spoolRate: number = 0.15;       // % change per second
    public sfcDry: number = 0.7;           // Fuel kg per (N * hour) - simplified
    public sfcAb: number = 1.9;
    public abThreshold: number = 0.95;     // Throttle > 0.95 engages afterburner
    public state: EngineState = EngineState.Dry;

    constructor(init?: Partial<PropulsionComponent>) {
        if (init) Object.assign(this, init);
    }
}

/**
 * FuelComponent: Tracks consumable fuel mass.
 */
export class FuelComponent implements IComponent {
    readonly type = 'FuelComponent';

    public currentKg: number = 5000;
    public maxKg: number = 5000;
    public isBingo: boolean = false;        // Low fuel state
    public burnRateKgHr: number = 0;
    public bingoTicks: number = 0;           // Ticks until bingo

    constructor(init?: Partial<FuelComponent>) {
        if (init) Object.assign(this, init);
    }
}
