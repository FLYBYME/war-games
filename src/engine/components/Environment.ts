import { IComponent, Vector3 } from '../core/Types.js';

/**
 * EnvironmentComponent: Stores local atmospheric and terrain data for an entity.
 */
export class EnvironmentComponent implements IComponent {
    readonly type = 'EnvironmentComponent';

    constructor(
        public terrainHeightM: number = 0,
        public airDensity: number = 1.225, // kg/m^3 at sea level
        public temperatureC: number = 15,
        public pressureRatio: number = 1.0, // delta
        public isGrounded: boolean = false,
        public isSubmerged: boolean = false,

        // Oceanography
        public waterTemperatureC: number = 15,
        public waterSalinityPPT: number = 35,
        public soundSpeedMPS: number = 1500,
        public layerDepthM: number = 100,
        public seaState: number = 0, // 0-12

        // Weather
        public precipitationRateMMhr: number = 0,
        public cloudCover: number = 0, // 0-1
        public windVelocity: Vector3 = { x: 0, y: 0, z: 0 },
        public windSpeedKts: number = 0,
        public windDirDeg: number = 0,
        public visibilityNM: number = 20
    ) {}
}
