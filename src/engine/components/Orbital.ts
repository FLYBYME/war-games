import { IComponent } from '../core/Types.js';

/**
 * OrbitalComponent: Defines a satellite's path using Keplerian elements.
 * For V3, we use a simplified circular orbit model.
 */
export class OrbitalComponent implements IComponent {
    readonly type = 'OrbitalComponent';

    constructor(
        public altitudeKm: number = 500, // LEO
        public inclinationDeg: number = 0,
        public rightAscensionAscNodeDeg: number = 0,
        public meanAnomalyAtEpochDeg: number = 0,
        public epochTick: number = 0,
        public semiMajorAxisM: number = 6371000 + 500000, // Earth Radius + Altitude
        public eccentricity: number = 0 // Circular for now
    ) {}

    /**
     * Calculate Period in seconds using Kepler's Third Law.
     * T = 2 * PI * sqrt(a^3 / mu)
     */
    get periodSec(): number {
        const mu = 3.986004418e14; // Earth Gravitational Parameter
        return 2 * Math.PI * Math.sqrt(Math.pow(this.semiMajorAxisM, 3) / mu);
    }
}
