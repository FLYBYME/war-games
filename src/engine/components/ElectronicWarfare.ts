import { IComponent, EntityId } from '../core/Types.js';

export enum JammerMode {
    Noise = 'Noise',       // Broad noise (Barrage/Spot)
    Deceptive = 'Deceptive' // Range/Velocity gate pull-off (RGPO/VGPO)
}

export enum JammerType {
    SOJ = 'SOJ', // Stand-off Jamming (Directional, high power)
    SPJ = 'SPJ'  // Self-Protection Jamming (Targets radars tracking self)
}

/**
 * JammerComponent: Radiates electromagnetic noise to interfere with sensors.
 */
export class JammerComponent implements IComponent {
    readonly type = 'JammerComponent';

    constructor(
        public jammerType: JammerType = JammerType.SPJ,
        public powerWatts: number = 1000,
        public frequencyHz: number = 3e9,      // Default S-band
        public bandwidthHz: number = 500e6,    // 500 MHz wide
        public isActive: boolean = false,
        public mode: JammerMode = JammerMode.Noise,
        public directionalGainDb: number = 0,  // For SOJ antennas
        public beamWidthDeg: number = 30,      // For directional jamming
        public targetId?: EntityId             // Optional: specific threat to counter
    ) {}
}

/**
 * SIGINTComponent: Capability to detect and localize jammers.
 */
export class SIGINTComponent implements IComponent {
    readonly type = 'SIGINTComponent';

    constructor(
        public sensitivityDBm: number = -120
    ) {}
}
