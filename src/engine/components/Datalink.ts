import { IComponent, Track, ESMBearing } from '../core/Types.js';

/**
 * DatalinkComponent: Enables sharing of tactical tracks over a network.
 */
export class DatalinkComponent implements IComponent {
    readonly type = 'DatalinkComponent';

    public networkId: string = 'BLUE_FORCE_NET';
    public canTransmit: boolean = true;
    public canReceive: boolean = true;
    public isActive: boolean = true; // Overall power/jamming state
    public latencyTicks: number = 5;  // ~0.5s delay at 10Hz
    public incomingQueue: { arrivalTick: number, tracks: Track[], bearings?: ESMBearing[] }[] = [];

    constructor(init?: Partial<DatalinkComponent>) {
        if (init) Object.assign(this, init);
    }
}
