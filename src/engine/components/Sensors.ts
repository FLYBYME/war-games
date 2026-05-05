import { IComponent, SensorType, EMBand, SensorMode, MountingType } from '../core/Types.js';

export interface ESMBearing {
    observerId: string;
    bearingDeg: number;
    confidencePct: number;
    targetId?: string;
}

/**
 * SensorComponent: Data for a single sensor.
 */
export class SensorComponent implements IComponent {
    readonly type = 'SensorComponent';

    constructor(
        public sensorType: SensorType,
        public maxRangeM: number = 20000,
        public isActive: boolean = true,
        public beamWidthDeg: number = 360,
        public txPowerKw: number = 50,
        public sensitivityDbm: number = -110,
        public frequencyMhz: number = 3000,
        public band: EMBand = EMBand.S,
        public mode: SensorMode = SensorMode.Search,
        public mounting: MountingType = MountingType.Fixed,
        public processingGainDb: number = 30,
        public scanPeriodS: number = 0,    
        public currentAzimuth: number = 0,
        public blindArcStartDeg?: number, // e.g. 170
        public blindArcEndDeg?: number,   // e.g. 190
        public illuminatedTargetId?: string, // If mode is Illumination
        public name: string = 'Unnamed Sensor',
        public emconState: string = 'Active'
    ) {}
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
