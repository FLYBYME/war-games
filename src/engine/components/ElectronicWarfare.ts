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

    public jammerType: JammerType = JammerType.SPJ;
    public powerWatts: number = 1000;
    public frequencyHz: number = 3e9;
    public bandwidthHz: number = 500e6;
    public isActive: boolean = false;
    public mode: JammerMode = JammerMode.Noise;
    public directionalGainDb: number = 0;
    public beamWidthDeg: number = 30;
    public targetId?: EntityId;

    constructor(init?: Partial<JammerComponent>) {
        if (init) Object.assign(this, init);
    }
}

/**
 * SIGINTComponent: Capability to detect and localize jammers.
 */
export class SIGINTComponent implements IComponent {
    readonly type = 'SIGINTComponent';
    public sensitivityDBm: number = -120;

    constructor(init?: Partial<SIGINTComponent>) {
        if (init) Object.assign(this, init);
    }
}
