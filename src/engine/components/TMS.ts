import { IComponent, Track } from '../core/Types.js';

/**
 * TrackComponent: Stores the tactical picture for a platform.
 */
export class TrackComponent implements IComponent {
    readonly type = 'TrackComponent';
    public tracks: Map<string, Track> = new Map();

    constructor() {}
}
