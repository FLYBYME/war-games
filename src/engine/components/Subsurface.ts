import { IComponent } from '../core/Types.js';

/**
 * AcousticSignatureComponent: Controls how much noise an entity makes.
 * (Source Level for Sonar)
 */
export class AcousticSignatureComponent implements IComponent {
    readonly type = 'AcousticSignatureComponent';

    public baseSL: number = 120; // Source Level in dB (ref 1uPa)
    public cavitationSpeed: number = 15; // Speed in m/s where cavitation starts

    constructor(init?: Partial<AcousticSignatureComponent>) {
        if (init) Object.assign(this, init);
    }
}

/**
 * OceanComponent: Local environmental data for underwater entities.
 */
export class OceanComponent implements IComponent {
    readonly type = 'OceanComponent';

    public depthM: number = 2000;
    public layerDepthM: number = 100;
    public bottomType: 'Soft' | 'Hard' = 'Soft';

    constructor(init?: Partial<OceanComponent>) {
        if (init) Object.assign(this, init);
    }
}
