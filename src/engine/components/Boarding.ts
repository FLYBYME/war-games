import { IComponent, EntityId, Area } from '../core/Types.js';

export enum BoardingStatus {
    InProgress = 'InProgress',
    Completed = 'Completed',
    Failed = 'Failed'
}

/**
 * BoardingComponent: Tracks the progress of a boarding operation (VBSS).
 */
export class BoardingComponent implements IComponent {
    readonly type = 'BoardingComponent';

    constructor(
        public targetId: EntityId,
        public durationTicks: number,
        public remainingTicks: number,
        public status: BoardingStatus = BoardingStatus.InProgress,
        public allowedArea?: Area
    ) {}
}
