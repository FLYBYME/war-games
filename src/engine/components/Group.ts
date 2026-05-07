import { IComponent, EntityId } from '../core/Types.js';

export enum GroupFormation {
    None = 'None',
    LineAbreast = 'LineAbreast',
    Column = 'Column',
    Wedge = 'Wedge',
    Diamond = 'Diamond'
}

/**
 * GroupComponent: Manages membership and hierarchy within a tactical unit.
 */
export class GroupComponent implements IComponent {
    readonly type = 'GroupComponent';

    constructor(
        public groupId: string,
        public leaderId: EntityId,
        public memberIds: Set<EntityId> = new Set(),
        public formation: GroupFormation = GroupFormation.None,
        public spacingM: number = 1000
    ) {}
}
