import { IComponent, Vector3 } from '../core/Types.js';

/**
 * TransformComponent: Represents physical presence in 3D space.
 */
export class TransformComponent implements IComponent {
    readonly type = 'TransformComponent';
    public position: Vector3 = { x: 0, y: 0, z: 0 };
    public rotation: number = 0; // Heading in degrees (0-360)
    public pitch: number = 0;    // Pitch in degrees
    public roll: number = 0;     // Roll in degrees

    get heading() { return this.rotation; }
    set heading(v: number) { this.rotation = v; }

    constructor(init?: Partial<TransformComponent>) {
        if (init) Object.assign(this, init);
    }
}

/**
 * SideComponent: Represents the organizational side of an entity.
 */
export class SideComponent implements IComponent {
    readonly type = 'SideComponent';
    constructor(public side: string = 'Neutral') {}
}

/**
 * KinematicsComponent: Represents movement state.
 */
export class KinematicsComponent implements IComponent {
    readonly type = 'KinematicsComponent';
    public velocity: Vector3 = { x: 0, y: 0, z: 0 };
    public angularVelocity: Vector3 = { x: 0, y: 0, z: 0 };
    public acceleration: Vector3 = { x: 0, y: 0, z: 0 };
    public massKg: number = 1000;
    public dragCoeff: number = 0.05;
    public thrustN: number = 0;
    public massEmptyKg: number = 1000;
    public netForce: Vector3 = { x: 0, y: 0, z: 0 };

    constructor(init?: Partial<KinematicsComponent>) {
        if (init) Object.assign(this, init);
    }
}
