import { IComponent, EntityId } from '../core/Types.js';

export interface WeaponStage {
    name: string;
    durationTicks: number;
    thrustN: number;
    burnTimeS?: number;
    guidanceMode?: string;
    separateOnComplete: boolean;
}

/**
 * WeaponStageComponent: Manages the lifecycle of a multi-stage weapon.
 */
export class WeaponStageComponent implements IComponent {
    readonly type = 'WeaponStageComponent';

    constructor(
        public stages: WeaponStage[],
        public currentStageIndex: number = 0,
        public currentStageElapsedTicks: number = 0,
        public isSeparated: boolean = false
    ) {}
}
