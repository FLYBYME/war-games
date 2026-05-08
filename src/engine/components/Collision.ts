import { IComponent, EntityId } from '../core/Types.js';

export enum CollisionVolumeType {
    Sphere,
    Box
}

/**
 * CollisionComponent: Defines the physical volume and filtering for collisions.
 */
export class CollisionComponent implements IComponent {
    readonly type = 'CollisionComponent';

    public radiusMeters: number = 1.0;
    public volumeType: CollisionVolumeType = CollisionVolumeType.Sphere;
    public layer: string = 'default';
    public collidesWith: string[] = ['default'];
    public ownerId?: EntityId;

    constructor(init?: Partial<CollisionComponent>) {
        if (init) Object.assign(this, init);
    }
}
