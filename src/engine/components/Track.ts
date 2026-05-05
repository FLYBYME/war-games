import { IComponent, Track, IdentificationStatus } from '../core/Types.js';

/**
 * TrackComponent: Stores the current picture of the world as seen by an entity or group.
 */
export class TrackComponent implements IComponent {
    readonly type = 'TrackComponent';
    public tracks: Map<string, Track> = new Map();

    constructor() {}
}
