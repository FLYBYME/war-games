/**
 * LayoutManager - Manages DOM grid areas and panel resizing
 * Controls the IDE's visual structure
 */

import { IDE } from "./IDE";
import * as ui from "../ui-lib";

export interface PanelToggleCommand {
    panelId: string;
}

export interface PanelResizeCommand {
    panelId: string;
    size: number;
}

export const PanelEvents = {
    PANEL_TOGGLE: 'panel.toggle',
    PANEL_RESIZE: 'panel.resize',
    PANEL_VISIBILITY_CHANGE: 'panel.visibility.change',
    PANEL_STATE_CHANGE: 'panel.state.change',
};

export interface PanelConfig {
    id: string;
    element: HTMLElement;
    minSize: number;
    maxSize: number;
    defaultSize: number;
    visible: boolean;
    position: 'left' | 'right' | 'top' | 'bottom' | 'center';
}

export interface LayoutState {
    leftPanelWidth: number;
    rightPanelWidth: number;
    bottomPanelHeight: number;
    leftPanelVisible: boolean;
    rightPanelVisible: boolean;
    bottomPanelVisible: boolean;
}

export class LayoutManager {
    private panels: Map<string, PanelConfig> = new Map();
    private resizeHandles: Map<string, HTMLElement> = new Map();
    private state: LayoutState;
    private resizing: boolean = false;
    private readonly storageKey = 'ide-layout-state';
    private ide: IDE;
    private container: HTMLElement;

    // Components
    public header: ui.Header;
    public statusBar: ui.StatusBar;
    private workspaceWrapper: HTMLElement;

    // Default panel sizes
    private static readonly DEFAULTS: LayoutState = {
        leftPanelWidth: 300,
        rightPanelWidth: 350,
        bottomPanelHeight: 200,
        leftPanelVisible: true,
        rightPanelVisible: false,
        bottomPanelVisible: true,
    };

    constructor(ide: IDE, container: HTMLElement) {
        this.ide = ide;
        this.container = container;
        this.state = this.loadState();

        this.setupSettingsSync();

        this.header = new ui.Header();
        this.statusBar = new ui.StatusBar();
        this.workspaceWrapper = document.createElement('div');
        this.workspaceWrapper.className = 'workspace-wrapper';
    }

    /**
     * Initialize the layout with DOM structure
     * Call this after the DOM has been built
     */
    public initialize(): void {
        this.setupResizeHandlers();
        this.applyAllPanels();
    }

    /**
     * Build the IDE DOM structure
     */
    public buildStructure(): void {
        this.container.innerHTML = '';

        // 1. Header
        this.container.appendChild(this.header.getElement());

        // 2. Workspace Wrapper (Middle Area)
        this.container.appendChild(this.workspaceWrapper);

        // 3. Create Panels and Handles within Workspace
        this.createWorkspacePanels();

        // 4. Bottom Panel Resize Handle
        const bottomHandle = this.createResizeHandle('bottom-panel', true);
        this.container.appendChild(bottomHandle);

        // 5. Bottom Panel
        const bottomPanel = document.createElement('div');
        bottomPanel.id = 'bottom-panel';

        // Activity Bar for Bottom Panel
        const bottomActivityBar = document.createElement('div');
        bottomActivityBar.className = 'activity-bar activity-bar-horizontal';
        bottomPanel.appendChild(bottomActivityBar);
        this.ide.activityBar.mount('bottom-panel', bottomActivityBar);

        // Content area
        const bottomContent = document.createElement('div');
        bottomContent.className = 'bottom-panel-content';
        bottomContent.style.flex = '1';
        bottomContent.style.overflow = 'hidden';
        bottomPanel.appendChild(bottomContent);

        this.registerPanel({
            id: 'bottom-panel',
            element: bottomPanel,
            minSize: 100,
            maxSize: 600,
            defaultSize: 200,
            visible: this.state.bottomPanelVisible,
            position: 'bottom'
        });
        // Note: Bottom panel is appended via registerPanel -> container, 
        // but we need to ensure it's in the right order (after handle, before status bar).
        // registerPanel appends to container. We might need to adjust this.
        // Actually, CSS grid defines order, but DOM order matters for flex/grid items sometimes.
        // RegisterPanel appends to this.container (which is #app).
        // Since #app is a Grid, the order in DOM matches grid-row definition usually unless explicit.
        // Grid rows: Header | Workspace | Bottom | Status
        // So BottomPanel should be after Workspace.
        // registerPanel appends, so it will be after workspaceWrapper (good).

        // 6. Status Bar
        this.container.appendChild(this.statusBar.getElement());
    }

    private createWorkspacePanels(): void {
        // Left Panel
        const leftPanel = document.createElement('div');
        leftPanel.id = 'left-panel';

        // Activity Bar (icon strip)
        const leftActivityBar = document.createElement('div');
        leftActivityBar.className = 'activity-bar';
        leftPanel.appendChild(leftActivityBar);
        this.ide.activityBar.mount('left-panel', leftActivityBar);

        // Sidebar Content (where views get mounted)
        const sidebarContent = document.createElement('div');
        sidebarContent.className = 'sidebar-content';
        leftPanel.appendChild(sidebarContent);

        this.panels.set('left-panel', {
            id: 'left-panel',
            element: leftPanel,
            minSize: 200,
            maxSize: 600,
            defaultSize: 300,
            visible: this.state.leftPanelVisible,
            position: 'left'
        });
        this.workspaceWrapper.appendChild(leftPanel);

        // Left Resize Handle
        const leftHandle = this.createResizeHandle('left-panel', false);
        this.workspaceWrapper.appendChild(leftHandle);

        // Center Panel
        const centerPanel = document.createElement('div');
        centerPanel.id = 'center-panel';
        this.panels.set('center-panel', {
            id: 'center-panel',
            element: centerPanel,
            minSize: 200,
            maxSize: Infinity,
            defaultSize: 800,
            visible: true,
            position: 'center'
        });
        this.workspaceWrapper.appendChild(centerPanel);

        // Right Resize Handle
        const rightHandle = this.createResizeHandle('right-panel', false);
        this.workspaceWrapper.appendChild(rightHandle);

        // Right Panel
        const rightPanel = document.createElement('div');
        rightPanel.id = 'right-panel';

        // Activity Bar for Right Panel
        const rightActivityBar = document.createElement('div');
        rightActivityBar.className = 'activity-bar';
        rightPanel.appendChild(rightActivityBar);
        this.ide.activityBar.mount('right-panel', rightActivityBar);

        // Content Area for Right Panel
        const rightContent = document.createElement('div');
        rightContent.className = 'sidebar-content';
        rightPanel.appendChild(rightContent);

        this.panels.set('right-panel', {
            id: 'right-panel',
            element: rightPanel,
            minSize: 250,
            maxSize: 600,
            defaultSize: 350,
            visible: this.state.rightPanelVisible,
            position: 'right'
        });
        this.workspaceWrapper.appendChild(rightPanel);
    }

    private createResizeHandle(panelId: string, vertical: boolean): HTMLElement {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${vertical ? 'resize-handle-v' : 'resize-handle-h'}`;
        handle.dataset.resize = panelId;
        return handle;
    }

    /**
     * Register commands
     */
    public registerCommands(): void {
        this.ide.commands.register({
            id: 'layout.togglePanel',
            label: 'Toggle Panel',
            handler: (panelId: string) => {
                this.togglePanel(panelId);
            }
        });
        this.ide.commands.register({
            id: 'layout.togglePrimarySidebar',
            label: 'Toggle Primary Sidebar',
            handler: () => { this.togglePanel('left-panel'); }
        });
        this.ide.commands.register({
            id: 'layout.toggleSecondarySidebar',
            label: 'Toggle Secondary Sidebar',
            handler: () => { this.togglePanel('right-panel'); }
        });
        this.ide.commands.register({
            id: 'layout.toggleBottomPanel',
            label: 'Toggle Bottom Panel',
            handler: () => { this.togglePanel('bottom-panel'); }
        });
        this.ide.commands.register({
            id: 'layout.resizePanel',
            label: 'Resize Panel',
            handler: (panelId: string, size: number) => this.resizePanel(panelId, size),
        });
        this.ide.commands.register({
            id: 'ui.saveState',
            label: 'Save UI State',
            handler: () => { this.saveState(); }
        });

        this.setupViewMenu();
    }

    private setupViewMenu(): void {
        this.header.menuBar.getElement().addEventListener('menu-command', (e: any) => {
            const { command } = e.detail;
            if (command) {
                this.ide.commands.execute(command);
            }
        });

        this.header.menuBar.addMenuItem({
            label: 'View',
            id: 'menu.view',
            items: [
                {
                    label: 'Appearance',
                    id: 'menu.view.appearance',
                    items: [
                        {
                            label: 'Primary Sidebar',
                            id: 'menu.view.togglePrimarySidebar',
                            command: 'layout.togglePrimarySidebar'
                        },
                        {
                            label: 'Secondary Sidebar',
                            id: 'menu.view.toggleSecondarySidebar',
                            command: 'layout.toggleSecondarySidebar'
                        },
                        {
                            label: 'Bottom Panel',
                            id: 'menu.view.toggleBottomPanel',
                            command: 'layout.toggleBottomPanel'
                        },
                        { separator: true, id: 'sep1', label: '' },
                        {
                            label: 'Reset Layout',
                            id: 'menu.view.resetLayout',
                            onClick: () => this.resetLayout()
                        }
                    ]
                }
            ]
        });
    }

    private setupSettingsSync(): void {
        // Handle incoming setting changes (e.g., from settings UI or command palette)
        this.ide.commands.on('configuration.changed', (data: any) => {
            const { key, value } = data;
            if (key.startsWith('workbench.layout.') || key === 'workbench.statusBar.visible') {
                this.handleSettingChange(key, value);
            }
        });
    }

    private handleSettingChange(key: string, value: any): void {
        switch (key) {
            case 'workbench.layout.leftPanelVisible':
                if (this.state.leftPanelVisible !== value) this.setPanelVisible('left-panel', value);
                break;
            case 'workbench.layout.rightPanelVisible':
                if (this.state.rightPanelVisible !== value) this.setPanelVisible('right-panel', value);
                break;
            case 'workbench.layout.bottomPanelVisible':
                if (this.state.bottomPanelVisible !== value) this.setPanelVisible('bottom-panel', value);
                break;
            case 'workbench.layout.leftPanelWidth':
                if (this.state.leftPanelWidth !== value) this.resizePanel('left-panel', value);
                break;
            case 'workbench.layout.rightPanelWidth':
                if (this.state.rightPanelWidth !== value) this.resizePanel('right-panel', value);
                break;
            case 'workbench.layout.bottomPanelHeight':
                if (this.state.bottomPanelHeight !== value) this.resizePanel('bottom-panel', value);
                break;
            case 'workbench.statusBar.visible':
                this.statusBar.getElement().style.display = value ? '' : 'none';
                break;
        }
    }

    /**
    * Register a panel manually (legacy support / dynamic panels)
    * For core panels, use createWorkspacePanels / buildStructure
    */
    public registerPanel(config: PanelConfig): void {
        this.panels.set(config.id, config);
        // Only append if not already in DOM
        if (!config.element.parentElement) {
            this.container.appendChild(config.element);
        }
        this.applyPanelState(config);
    }


    /**
     * Get panel configuration
     */
    public getPanel(id: string): PanelConfig | undefined {
        return this.panels.get(id);
    }

    /**
     * Toggle panel visibility
     */
    public togglePanel(panelId: string): boolean {
        const panel = this.panels.get(panelId);
        if (!panel) return false;

        panel.visible = !panel.visible;
        this.applyPanelState(panel);
        this.updateLayoutState(panelId, panel.visible);
        this.updateResizeHandleVisibility(panelId, panel.visible);

        this.ide.commands.emit(PanelEvents.PANEL_TOGGLE, { panelId, visible: panel.visible });
        return panel.visible;
    }

    /**
     * Set panel visibility
     */
    public setPanelVisible(panelId: string, visible: boolean): void {
        const panel = this.panels.get(panelId);
        if (!panel || panel.visible === visible) return;

        panel.visible = visible;
        this.applyPanelState(panel);
        this.updateLayoutState(panelId, visible);
        this.updateResizeHandleVisibility(panelId, visible);

        this.ide.commands.emit(PanelEvents.PANEL_TOGGLE, { panelId, visible });
    }

    /**
     * Update resize handle visibility based on panel state
     */
    private updateResizeHandleVisibility(panelId: string, visible: boolean): void {
        const handle = document.querySelector(`[data-resize="${panelId}"]`) as HTMLElement;
        if (handle) {
            handle.style.display = visible ? '' : 'none';
        }
    }

    /**
     * Resize a panel
     */
    public resizePanel(panelId: string, size: number): void {
        const panel = this.panels.get(panelId);
        if (!panel) return;

        const clampedSize = Math.max(panel.minSize, Math.min(panel.maxSize, size));

        switch (panel.position) {
            case 'left':
                this.state.leftPanelWidth = clampedSize;
                panel.element.style.width = `${clampedSize}px`;
                break;
            case 'right':
                this.state.rightPanelWidth = clampedSize;
                panel.element.style.width = `${clampedSize}px`;
                break;
            case 'bottom':
            case 'top':
                this.state.bottomPanelHeight = clampedSize;
                panel.element.style.height = `${clampedSize}px`;
                break;
        }

        this.saveState();
        this.ide.commands.emit(PanelEvents.PANEL_RESIZE, { panelId, size: clampedSize });
    }

    /**
     * Get current layout state
     */
    public getState(): LayoutState {
        return { ...this.state };
    }

    /**
     * Apply full layout state
     */
    public applyState(state: Partial<LayoutState>): void {
        Object.assign(this.state, state);
        this.applyAllPanels();
        this.saveState();
    }

    /**
     * Reset layout to defaults
     */
    public resetLayout(): void {
        this.state = { ...LayoutManager.DEFAULTS };
        this.applyAllPanels();
        this.saveState();
    }

    private handleWindowResize!: () => void;

    /**
     * Setup resize handle events
     */
    private setupResizeHandlers(): void {
        // Handles are created in buildStructure, so they exist now
        const handles = document.querySelectorAll('.resize-handle[data-resize]');

        handles.forEach((handle) => {
            const panelId = (handle as HTMLElement).dataset.resize;
            if (!panelId) return;

            const isVertical = handle.classList.contains('resize-handle-v');
            this.attachResizeHandleEvents(handle as HTMLElement, panelId, isVertical);
        });

        // Handle window resize
        this.handleWindowResize = this.onWindowResize.bind(this);
        window.addEventListener('resize', this.handleWindowResize);

        // Initial handle visibility
        this.updateResizeHandleVisibility('left-panel', this.state.leftPanelVisible);
        this.updateResizeHandleVisibility('right-panel', this.state.rightPanelVisible);
        this.updateResizeHandleVisibility('bottom-panel', this.state.bottomPanelVisible);
    }

    private onWindowResize(): void {
        this.ide.commands.emit(PanelEvents.PANEL_RESIZE, { type: 'window-resize' });
    }

    /**
     * Clean up event listeners and resources
     */
    public dispose(): void {
        if (this.handleWindowResize) {
            window.removeEventListener('resize', this.handleWindowResize);
        }
    }

    /**
     * Attach mouse events to a resize handle
     */
    private attachResizeHandleEvents(
        handle: HTMLElement,
        panelId: string,
        isVertical: boolean
    ): void {
        const onMouseDown = (e: MouseEvent) => {
            e.preventDefault();
            this.resizing = true;
            handle.classList.add('active');
            document.body.classList.add('resizing');
            document.body.classList.add(isVertical ? 'resizing-v' : 'resizing-h');

            const panel = this.panels.get(panelId);
            if (!panel) return;

            const startPos = isVertical ? e.clientY : e.clientX;
            const startSize = isVertical ? panel.element.offsetHeight : panel.element.offsetWidth;
            const isRightPanel = panel.position === 'right';
            const isBottomPanel = panel.position === 'bottom';

            const onMouseMove = (moveEvent: MouseEvent) => {
                if (!this.resizing) return;

                const currentPos = isVertical ? moveEvent.clientY : moveEvent.clientX;
                let delta = currentPos - startPos;

                // Reverse delta for right panel and bottom panel
                if (isRightPanel || isBottomPanel) {
                    delta = -delta;
                }

                const newSize = startSize + delta;
                this.resizePanel(panelId, newSize);
            };

            const onMouseUp = () => {
                this.resizing = false;
                handle.classList.remove('active');
                document.body.classList.remove('resizing', 'resizing-h', 'resizing-v');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        handle.addEventListener('mousedown', onMouseDown);
    }

    private applyPanelState(panel: PanelConfig): void {
        if (panel.position === 'center') return; // Center panel is flex

        panel.element.style.display = panel.visible ? '' : 'none';

        if (panel.visible) {
            switch (panel.position) {
                case 'left':
                    panel.element.style.width = `${this.state.leftPanelWidth}px`;
                    break;
                case 'right':
                    panel.element.style.width = `${this.state.rightPanelWidth}px`;
                    break;
                case 'bottom':
                case 'top':
                    panel.element.style.height = `${this.state.bottomPanelHeight}px`;
                    break;
            }
        }
    }

    private applyAllPanels(): void {
        for (const panel of this.panels.values()) {
            this.applyPanelState(panel);
        }
    }

    private updateLayoutState(panelId: string, visible: boolean): void {
        const panel = this.panels.get(panelId);
        if (!panel) return;

        switch (panel.position) {
            case 'left':
                this.state.leftPanelVisible = visible;
                break;
            case 'right':
                this.state.rightPanelVisible = visible;
                break;
            case 'bottom':
            case 'top':
                this.state.bottomPanelVisible = visible;
                break;
        }

        this.saveState();
    }

    private saveState(): void {
        // Sync with configuration service
        if (this.ide.settings) {
            const currentSettings = this.ide.settings.getUserSettings();

            if (currentSettings['workbench.layout.leftPanelVisible'] !== this.state.leftPanelVisible)
                this.ide.settings.update('workbench.layout.leftPanelVisible', this.state.leftPanelVisible);

            if (currentSettings['workbench.layout.rightPanelVisible'] !== this.state.rightPanelVisible)
                this.ide.settings.update('workbench.layout.rightPanelVisible', this.state.rightPanelVisible);

            if (currentSettings['workbench.layout.bottomPanelVisible'] !== this.state.bottomPanelVisible)
                this.ide.settings.update('workbench.layout.bottomPanelVisible', this.state.bottomPanelVisible);

            if (currentSettings['workbench.layout.leftPanelWidth'] !== this.state.leftPanelWidth)
                this.ide.settings.update('workbench.layout.leftPanelWidth', this.state.leftPanelWidth);

            if (currentSettings['workbench.layout.rightPanelWidth'] !== this.state.rightPanelWidth)
                this.ide.settings.update('workbench.layout.rightPanelWidth', this.state.rightPanelWidth);

            if (currentSettings['workbench.layout.bottomPanelHeight'] !== this.state.bottomPanelHeight)
                this.ide.settings.update('workbench.layout.bottomPanelHeight', this.state.bottomPanelHeight);
        }

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state));
            this.ide.commands.emit('ui.saveState', { state: this.state });
        } catch (e) {
            console.warn('LayoutManager: Could not save state to localStorage');
        }
    }

    private loadState(): LayoutState {
        // Priority: runtime settings -> localStorage -> Defaults
        const settingsState: Partial<LayoutState> = {};
        if (this.ide.settings) {
            settingsState.leftPanelVisible = this.ide.settings.get('workbench.layout.leftPanelVisible');
            settingsState.rightPanelVisible = this.ide.settings.get('workbench.layout.rightPanelVisible');
            settingsState.bottomPanelVisible = this.ide.settings.get('workbench.layout.bottomPanelVisible');
            settingsState.leftPanelWidth = this.ide.settings.get('workbench.layout.leftPanelWidth');
            settingsState.rightPanelWidth = this.ide.settings.get('workbench.layout.rightPanelWidth');
            settingsState.bottomPanelHeight = this.ide.settings.get('workbench.layout.bottomPanelHeight');
        }

        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                return { ...LayoutManager.DEFAULTS, ...JSON.parse(saved), ...settingsState };
            }
        } catch (e) {
            console.warn('LayoutManager: Could not load state from localStorage');
        }
        return { ...LayoutManager.DEFAULTS, ...settingsState };
    }
}

// Panel IDs
export const PanelIds = {
    LEFT_SIDEBAR: 'left-panel',
    RIGHT_SIDEBAR: 'right-panel',
    BOTTOM_PANEL: 'bottom-panel',
    CENTER_EDITOR: 'center-panel',
    ACTIVITY_BAR: 'activity-bar',
    STATUS_BAR: 'status-bar',
    HEADER: 'header-container',
} as const;
