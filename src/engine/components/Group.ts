import { IComponent, EntityId, GroupFormation } from '../core/Types.js';
export { GroupFormation };

/**
 * GroupComponent: Manages membership and hierarchy within a tactical unit.
 */
export class GroupComponent implements IComponent {
    readonly type = 'GroupComponent';

    public groupId: string = '';
    public leaderId: EntityId = '';
    public memberIds: Set<EntityId> = new Set();
    public formation: GroupFormation = GroupFormation.None;
    public spacingM: number = 1000;

    constructor(init?: Partial<GroupComponent>) {
        if (init) Object.assign(this, init);
    }
}
