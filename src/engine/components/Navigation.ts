import { IComponent, EntityId, Vector3 } from '../core/Types.js';

export enum NavState {
    None = 'None',
    Waypoint = 'Waypoint',
    Formation = 'Formation',
    Loiter = 'Loiter'
}

export interface Waypoint {
    position: Vector3;
    speedKts: number;
    targetTick?: number; // Time Over Target (TOT)
    description?: string;
}

/**
 * NavigationComponent: Stores pathfinding data for absolute navigation.
 */
export class NavigationComponent implements IComponent {
    readonly type = 'NavigationComponent';

    constructor(
        public navState: NavState = NavState.None,
        public waypoints: Waypoint[] = [],
        public activeWaypointIndex: number = 0,
        public arrivalToleranceM: number = 500,
        public terrainFollowing: boolean = false,
        public obstacleAvoidance: boolean = true,
        public desiredHeadingDeg?: number,
        public desiredAltitudeM?: number,
        public desiredSpeedKts?: number
    ) {}
}

export enum FormationType {
    Custom = 'Custom',
    LineAbreast = 'LineAbreast',
    Column = 'Column',
    Wedge = 'Wedge',
    Diamond = 'Diamond'
}

/**
 * FormationComponent: Stores station-keeping data for relative navigation.
 */
export class FormationComponent implements IComponent {
    readonly type = 'FormationComponent';

    constructor(
        public leaderId: EntityId,
        public stationOffset: Vector3, // Relative to leader (X: Right, Y: Forward, Z: Up)
        public formationType: FormationType = FormationType.Custom,
        public sprintDrift: boolean = false
    ) {}
}
