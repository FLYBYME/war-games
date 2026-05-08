/**
 * Deterministic Random Number Generator (PRNG).
 * Uses the Mulberry32 algorithm.
 */
export class DeterministicRandom {
    private seed: number;

    constructor(seed: number = 0) {
        this.seed = seed;
    }

    /**
     * next: Returns a pseudo-random float between 0 and 1.
     */
    public next(): number {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    /**
     * range: Returns a pseudo-random float between min and max.
     */
    public range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }

    /**
     * integer: Returns a pseudo-random integer between min and max (inclusive).
     */
    public integer(min: number, max: number): number {
        return Math.floor(this.range(min, max + 1));
    }

    /**
     * setSeed: Updates the seed.
     */
    public setSeed(seed: number): void {
        this.seed = seed;
    }
}
