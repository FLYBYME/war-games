import { IDE } from '../IDE';
import {
    BaseComponent,
    Theme,
    Stack,
    Row,
    ScrollArea,
    ContextMenu,
    ContextMenuItem
} from '../../ui-lib';
import { EditorTab, EditorTabProps } from '../../ui-lib/panels/EditorTab';
import { EditorEvents } from './EditorManager';

export interface EditorGroupProps {
    id: string;
    activeTabId?: string | null;
}

export interface EditorGroupState {
    id: string;
    tabs: EditorTabProps[];
    activeTabId: string | null;
}

export class EditorGroup extends BaseComponent<EditorGroupProps> {
    private ide: IDE;

    // Internal UI Components
    private headerRow: Row;
    private bodyStack: Stack;

    // State
    private tabs: Map<string, EditorTab> = new Map();
    public tabOrder: string[] = [];
    private recentOrder: string[] = [];
    private contentPanels: Map<string, HTMLElement> = new Map();
    private activeContextMenu: ContextMenu | null = null;

    // Callbacks
    public onEmpty?: (groupId: string) => void;
    public onActiveTabChanged?: (groupId: string, tabId: string | null) => void;
    public onDragTab?: (sourceTabId: string, targetGroupId: string, targetIndex: number) => void;

    constructor(props: EditorGroupProps, ide: IDE) {
        super('div', props);
        this.ide = ide;

        // Initialize UI Library containers
        this.headerRow = new Row({
            height: '35px',
            align: 'center',
            fill: false,
            scrollable: true, // Enables the horizontal tab scroll
            padding: 'none'
        });

        this.bodyStack = new Stack({
            fill: true,
            scrollable: false,
            padding: 'none',
            height: 'auto',
            minHeight: '0'
        });

        this.render();
        this.setupEventListeners();
    }

    public render(): void {
        this.applyStyles({
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            backgroundColor: Theme.colors.bgPrimary,
            overflow: 'hidden'
        });

        // Setup Header Styling for Tabs
        const headerEl = this.headerRow.getElement();
        headerEl.style.backgroundColor = Theme.colors.bgSecondary;
        headerEl.style.borderBottom = `1px solid ${Theme.colors.border}`;
        headerEl.style.overflowX = 'auto';
        headerEl.style.overflowY = 'hidden';

        this.appendChildren(this.headerRow, this.bodyStack);
    }

    private setupEventListeners(): void {
        const headerEl = this.headerRow.getElement();

        // Horizontal scrolling for tabs
        headerEl.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                headerEl.scrollLeft += e.deltaY;
            }
        }, { passive: false });

        // Drag and Drop implementation using UI-Lib logic
        headerEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingTab = document.querySelector('.tab.dragging') as HTMLElement;
            if (!draggingTab) return;

            const afterElement = this.getDragAfterElement(headerEl, e.clientX);
            if (afterElement) {
                headerEl.insertBefore(draggingTab, afterElement);
            } else {
                headerEl.appendChild(draggingTab);
            }
        });

        headerEl.addEventListener('drop', (e) => {
            e.preventDefault();
            const sourceTabId = e.dataTransfer?.getData('text/plain');
            if (!sourceTabId || !this.onDragTab) return;

            const tabs = Array.from(headerEl.querySelectorAll('[data-tab-id]'));
            let targetIndex = tabs.findIndex(t => (t as HTMLElement).dataset.tabId === sourceTabId);
            this.onDragTab(sourceTabId, this.props.id, targetIndex === -1 ? tabs.length : targetIndex);
        });
    }

    private getDragAfterElement(container: HTMLElement, x: number): Element | null {
        const draggables = [...container.querySelectorAll('[data-tab-id]:not(.dragging)')];
        return draggables.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset, element: child };
            }
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY, element: null as Element | null }).element;
    }

    public get id(): string {
        return this.props.id;
    }

    public get activeTabId(): string | null {
        return this.props.activeTabId || null;
    }

    public hasTab(id: string): boolean {
        return this.tabs.has(id);
    }

    public getContentPanel(id: string): HTMLElement | undefined {
        return this.contentPanels.get(id);
    }

    public cycleTab(direction: number): void {
        if (this.tabOrder.length <= 1) return;
        const currentIndex = this.tabOrder.indexOf(this.props.activeTabId || '');
        let nextIndex = (currentIndex + direction) % this.tabOrder.length;
        if (nextIndex < 0) nextIndex = this.tabOrder.length - 1;
        this.activateTab(this.tabOrder[nextIndex]);
    }

    public setTabDirty(id: string, isDirty: boolean): void {
        this.tabs.get(id)?.setDirty(isDirty);
    }

    public getState(): EditorGroupState {
        return {
            id: this.props.id,
            tabs: Array.from(this.tabs.values()).map(t => t.props),
            activeTabId: this.props.activeTabId || null
        };
    }

    // ── Tab Management ────────────────────────────────────

    public openTab(config: EditorTabProps): void {
        if (this.tabs.has(config.id)) {
            this.activateTab(config.id);
            return;
        }

        const tab = new EditorTab({
            ...config,
            onActivate: (id) => this.activateTab(id),
            onClose: (id) => this.closeTab(id),
            onContextMenu: (id, x, y) => this.showTabContextMenu(id, x, y),
        });

        // Content Panel (Body)
        const contentPanel = document.createElement('div');
        Object.assign(contentPanel.style, {
            display: 'none',
            flex: '1',
            overflow: 'auto',
            minHeight: '0',
            width: '100%'
        });

        this.tabs.set(config.id, tab);
        this.contentPanels.set(config.id, contentPanel);

        // UI-Lib Placement Logic
        const firstPinnedIndex = this.tabOrder.findIndex(tid => this.tabs.get(tid)?.props.isPinned);
        if (firstPinnedIndex !== -1) {
            this.tabOrder.splice(firstPinnedIndex, 0, config.id);
            const beforeTab = this.tabs.get(this.tabOrder[firstPinnedIndex + 1]);
            this.headerRow.getElement().insertBefore(tab.getElement(), beforeTab?.getElement() || null);
        } else {
            this.tabOrder.push(config.id);
            this.headerRow.appendChildren(tab);
        }

        this.bodyStack.getElement().appendChild(contentPanel);
        this.ide.commands.emit(EditorEvents.EDITOR_TAB_OPENED, { tabId: config.id, config, groupId: this.props.id });
        this.activateTab(config.id);
    }

    /**
     * Internal transfer helpers for EditorGrid.
     */
    public removeTabInternally(id: string): { config: EditorTabProps; panel: HTMLElement } | null {
        const tab = this.tabs.get(id);
        const panel = this.contentPanels.get(id);
        if (!tab || !panel) return null;

        const config = { ...tab.props };

        tab.destroy();
        this.tabs.delete(id);
        this.contentPanels.delete(id);
        panel.remove();

        this.tabOrder = this.tabOrder.filter(tid => tid !== id);
        this.recentOrder = this.recentOrder.filter(tid => tid !== id);

        if (this.props.activeTabId === id) {
            this.updateProps({ activeTabId: null });
            const nextId = this.recentOrder[0] || this.tabOrder[this.tabOrder.length - 1];
            if (nextId) this.activateTab(nextId);
        }

        return { config, panel };
    }

    public insertTabInternally(config: EditorTabProps, panel: HTMLElement, index: number, activate = true): void {
        const tab = new EditorTab({
            ...config,
            onActivate: (id) => this.activateTab(id),
            onClose: (id) => this.closeTab(id),
            onContextMenu: (id, x, y) => this.showTabContextMenu(id, x, y),
        });

        this.tabs.set(config.id, tab);
        this.contentPanels.set(config.id, panel);

        this.tabOrder.splice(index, 0, config.id);
        const nextTabId = this.tabOrder[index + 1];
        const nextTab = nextTabId ? this.tabs.get(nextTabId) : null;

        const headerEl = this.headerRow.getElement();
        if (nextTab) {
            headerEl.insertBefore(tab.getElement(), nextTab.getElement());
        } else {
            headerEl.appendChild(tab.getElement());
        }

        this.bodyStack.getElement().appendChild(panel);

        if (activate) this.activateTab(config.id);
    }

    public activateTab(id: string): void {
        if (!this.tabs.has(id) || this.props.activeTabId === id) return;

        // Deactivate previous
        if (this.props.activeTabId) {
            this.tabs.get(this.props.activeTabId)?.setActive(false);
            const p = this.contentPanels.get(this.props.activeTabId);
            if (p) p.style.display = 'none';
        }

        // Activate new
        const activeTab = this.tabs.get(id);
        activeTab?.setActive(true);
        const panel = this.contentPanels.get(id);
        if (panel) panel.style.display = 'block';

        this.updateProps({ activeTabId: id });

        this.recentOrder = this.recentOrder.filter(tid => tid !== id);
        this.recentOrder.unshift(id);

        if (this.onActiveTabChanged) this.onActiveTabChanged(this.props.id, id);
        this.ide.commands.emit(EditorEvents.EDITOR_ACTIVE_CHANGED, { tabId: id, groupId: this.props.id });
    }

    public closeTab(id: string, force: boolean = false): void {
        const tab = this.tabs.get(id);
        if (!tab || (tab.props.isPinned && !force)) return;

        const wasActive = this.props.activeTabId === id;

        // Cleanup
        tab.destroy();
        this.contentPanels.get(id)?.remove();
        this.tabs.delete(id);
        this.contentPanels.delete(id);
        this.tabOrder = this.tabOrder.filter(tid => tid !== id);
        this.recentOrder = this.recentOrder.filter(tid => tid !== id);

        this.ide.commands.emit(EditorEvents.EDITOR_TAB_CLOSED, { tabId: id, groupId: this.props.id });

        if (wasActive) {
            this.updateProps({ activeTabId: null });
            const nextId = this.recentOrder[0] || this.tabOrder[this.tabOrder.length - 1];
            if (nextId) {
                this.activateTab(nextId);
            } else {
                if (this.onActiveTabChanged) this.onActiveTabChanged(this.props.id, null);
                if (this.onEmpty) this.onEmpty(this.props.id);
            }
        } else if (this.tabOrder.length === 0 && this.onEmpty) {
            this.onEmpty(this.props.id);
        }
    }

    private showTabContextMenu(tabId: string, x: number, y: number): void {
        if (this.activeContextMenu) this.activeContextMenu.dispose();

        const tab = this.tabs.get(tabId);
        if (!tab) return;

        const isPinned = !!tab.props.isPinned;

        const items: ContextMenuItem[] = [
            { label: 'Split Right', action: () => this.ide.commands.execute('editor.splitRight') },
            { separator: true },
            {
                label: isPinned ? 'Unpin Tab' : 'Pin Tab',
                action: () => this.setTabPinned(tabId, !isPinned)
            },
            { separator: true },
            { label: 'Close', action: () => this.closeTab(tabId, true) },
            { label: 'Close Others', action: () => this.closeOtherTabs(tabId) },
            { label: 'Close All', action: () => this.closeAllTabs() }
        ];

        this.activeContextMenu = new ContextMenu(items, x, y);
    }

    public setTabPinned(id: string, pinned: boolean): void {
        const tab = this.tabs.get(id);
        if (!tab) return;

        tab.setPinned(pinned);

        // Sort: Unpinned first, then Pinned
        this.tabOrder = [
            ...this.tabOrder.filter(tid => !this.tabs.get(tid)?.props.isPinned),
            ...this.tabOrder.filter(tid => !!this.tabs.get(tid)?.props.isPinned)
        ];

        // Re-append to update DOM order in headerRow
        const headerEl = this.headerRow.getElement();
        this.tabOrder.forEach(tid => {
            const t = this.tabs.get(tid);
            if (t) headerEl.appendChild(t.getElement());
        });
    }

    public destroy(): void {
        this.closeAllTabs(true);
        if (this.activeContextMenu) this.activeContextMenu.dispose();
        super.destroy();
    }

    // Helper methods for batch operations
    public closeAllTabs(force = false) { [...this.tabOrder].forEach(id => this.closeTab(id, force)); }
    public closeOtherTabs(keepId: string) { this.tabOrder.filter(id => id !== keepId).forEach(id => this.closeTab(id)); }
}