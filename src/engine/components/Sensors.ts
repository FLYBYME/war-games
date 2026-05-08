import { IComponent, SensorType, EMBand, SensorMode, MountingType, EMCONState } from '../core/Types.js';
import type { ESMBearing } from '../core/Types.js';

export type { ESMBearing };

/**
 * SensorComponent: Data for a single sensor.
 */
export class SensorComponent implements IComponent {
    readonly type = 'SensorComponent';
    public sensorType: SensorType = SensorType.Radar;
    public maxRangeM: number = 20000;
    public isActive: boolean = true;
    public beamWidthDeg: number = 360;
    public txPowerKw: number = 50;
    public sensitivityDbm: number = -110;
    public frequencyMhz: number = 3000;
    public band: EMBand = EMBand.S;
    public mode: SensorMode = SensorMode.Search;
    public mounting: MountingType = MountingType.Fixed;
    public processingGainDb: number = 30;
    public scanPeriodS: number = 0;    
    public currentAzimuth: number = 0;
    public blindArcStartDeg?: number;
    public blindArcEndDeg?: number;
    public illuminatedTargetId?: string;
    public name: string = 'Unnamed Sensor';
    public emconState: string = 'Active';

    constructor(init?: Partial<SensorComponent>) {
        if (init) Object.assign(this, init);
    }
}

/**
 * DetectionComponent: Stores current detections for an entity.
 */
export class DetectionComponent implements IComponent {
    readonly type = 'DetectionComponent';
    public detectedEntityIds: Set<string> = new Set();
    public esmBearings: ESMBearing[] = [];

    constructor() {}
}
