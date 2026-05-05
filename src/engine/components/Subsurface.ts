import { IComponent } from '../core/Types.js';

/**
 * AcousticSignatureComponent: Controls how much noise an entity makes.
 * (Source Level for Sonar)
 */
export class AcousticSignatureComponent implements IComponent {
    readonly type = 'AcousticSignatureComponent';

    constructor(
        public baseSL: number = 120, // Source Level in dB (ref 1uPa)
        public cavitationSpeed: number = 15 // Speed in m/s where cavitation starts
    ) {}
}

/**
 * OceanComponent: Local environmental data for underwater entities.
 */
export class OceanComponent implements IComponent {
    readonly type = 'OceanComponent';

    constructor(
        public depthM: number = 2000,
        public layerDepthM: number = 100,
        public bottomType: 'Soft' | 'Hard' = 'Soft'
    ) {}
}
