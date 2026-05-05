import { IComponent, Vector3 } from '../core/Types.js';

/**
 * BallisticBurstComponent: Models a high-rate-of-fire stream of projectiles.
 * Instead of individual entities, we simulate a 'cone' or 'cylinder' of lead.
 */
export class BallisticBurstComponent implements IComponent {
    readonly type = 'BallisticBurstComponent';

    constructor(
        public shooterId: string,
        public targetId: string,
        public muzzleVelocity: Vector3,
        public roundsPerSecond: number,
        public durationTicks: number,
        public startTick: number,
        public dispersionDeg: number = 0.5,
        public caliberMm: number = 20
    ) {}
}

/**
 * BallisticProjectileComponent: For individual high-velocity shells.
 */
export class BallisticProjectileComponent implements IComponent {
    readonly type = 'BallisticProjectileComponent';

    constructor(
        public shooterId: string,
        public caliberMm: number,
        public muzzleVelocity: Vector3,
        public startTick: number,
        public dragCoeff: number = 0.1
    ) {}
}
