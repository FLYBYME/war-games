import { IDE } from '../IDE';
import { BaseComponent, SplitView, Theme } from '../../ui-lib';
import { EditorGroup } from './EditorGroup';

export class EditorGrid extends BaseComponent {
    private ide: IDE;
    private splitView: SplitView | null = null;

    // Group structures
    public groups: Map<string, EditorGroup> = new Map();
    private activeGroupId: string;

    constructor(ide: IDE) {
        super('div');
        this.ide = ide;

        // Create initial Group
        const initialGroup = this.createGroup('group-1');
        this.activeGroupId = initialGroup.id;

        this.render();
    }

    public render(): void {
        this.applyStyles({
            display: 'flex',
            flexDirection: 'row',
            flex: '1',
            width: '100%',
            height: '100%',
            overflow: 'hidden'
        });

        this.updateLayout();
    }

    /**
     * Synchronizes the SplitView with the current list of groups.
     * Replaces manual resizer/flex logic with the ui-lib SplitView component.
     */
    private updateLayout(): void {
        const groupElements = Array.from(this.groups.values());
        const groupCount = groupElements.length;

        // Calculate even distribution percentages
        const evenSize = 100 / groupCount;
        const initialSizes = groupElements.map(() => evenSize);
        const minSizes = groupElements.map(() => 200);

        if (this.splitView) {
            this.splitView.updateProps({
                panes: groupElements,
                initialSizes,
                minSizes
            });
        } else {
            this.splitView = new SplitView({
                orientation: 'horizontal',
                panes: groupElements,
                initialSizes,
                minSizes
            });
            this.appendChildren(this.splitView);
        }
    }

    private createGroup(id: string): EditorGroup {
        const group = new EditorGroup({ id }, this.ide);

        group.onEmpty = (groupId) => this.handleGroupEmpty(groupId);
        group.onActiveTabChanged = (groupId, tabId) => {
            if (tabId) this.activeGroupId = groupId;
        };
        group.onDragTab = (sourceTabId, targetGroupId, targetIndex) => {
            this.moveTab(sourceTabId, targetGroupId, targetIndex);
        };

        this.groups.set(id, group);
        return group;
    }

    private handleGroupEmpty(groupId: string): void {
        if (this.groups.size > 1) {
            const group = this.groups.get(groupId);
            if (group) {
                group.destroy();
                this.groups.delete(groupId);

                if (this.activeGroupId === groupId) {
                    this.activeGroupId = this.groups.keys().next().value!;
                }

                this.updateLayout();
            }
        }
    }

    public splitRight(): void {
        if (this.groups.size >= 3) {
            this.ide.notifications.notify('Maximum of 3 panes supported.', 'warning');
            return;
        }

        const newId = `group-${Date.now()}`;
        this.createGroup(newId);
        this.activeGroupId = newId;

        this.updateLayout();

        // Ensure Monaco or other editors react to the layout change
        window.dispatchEvent(new Event('resize'));
    }

    public moveTab(sourceTabId: string, targetGroupId: string, targetIndex: number): void {
        const targetGroup = this.groups.get(targetGroupId);
        let sourceGroup: EditorGroup | undefined;

        for (const g of this.groups.values()) {
            if (g.tabOrder.includes(sourceTabId)) {
                sourceGroup = g;
                break;
            }
        }

        if (!sourceGroup || !targetGroup) return;

        // Remove from source and transfer to target
        const removed = sourceGroup.removeTabInternally(sourceTabId);
        if (removed) {
            targetGroup.insertTabInternally(removed.config, removed.panel, targetIndex, true);
            this.activeGroupId = targetGroupId;
        }
    }

    public getActiveGroup(): EditorGroup {
        return this.groups.get(this.activeGroupId) || this.groups.values().next().value!;
    }

    public getGroupForTab(tabId: string): EditorGroup | undefined {
        return Array.from(this.groups.values()).find(g => g.tabOrder.includes(tabId));
    }
}