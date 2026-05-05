import { IComponent } from '../core/Types.js';
import { EMBand } from '../core/Types.js';

/**
 * RCSComponent: Radar Cross Section data.
 * Supports frequency-dependent RCS for stealth modeling.
 */
export class RCSComponent implements IComponent {
    readonly type = 'RCSComponent';
    public bandMultipliers: Map<EMBand, number> = new Map();

    constructor(
        public baseRCS: number = 5.0, // Square meters
        public frontalMultiplier: number = 1.0,
        public sideMultiplier: number = 2.0,
        public rearMultiplier: number = 0.5
    ) {
        // Default: Stealth works better against X-band (fire control)
        // than L-band (early warning)
        this.bandMultipliers.set(EMBand.L, 2.0);
        this.bandMultipliers.set(EMBand.S, 1.0);
        this.bandMultipliers.set(EMBand.X, 0.2);
        this.bandMultipliers.set(EMBand.Ku, 0.1);
    }

    /**
     * getEffectiveRCS: Returns RCS based on frequency band and aspect.
     */
    public getEffectiveRCS(band: EMBand, _aspectAngleDeg: number): number {
        const bandMult = this.bandMultipliers.get(band) || 1.0;
        // For V3, we just use the band multiplier on the base RCS
        return this.baseRCS * bandMult;
    }
}
