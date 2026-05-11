/**
 * EditorManager - Central controller for the center panel tab system.
 * Orchestrates EditorGroups via the EditorGrid using ui-lib components.
 */

import { IDE } from '../IDE';
import { EditorTabProps } from '../../ui-lib/panels/EditorTab';
import { EditorGrid } from './EditorGrid';
import { EditorGroupState } from './EditorGroup';

// Events emitted by the EditorManager
export const EditorEvents = {
    EDITOR_TAB_OPENED: 'editor.tab.opened',
    EDITOR_TAB_CLOSED: 'editor.tab.closed',
    EDITOR_ACTIVE_CHANGED: 'editor.active.changed',
};

export interface EditorState {
    groups: EditorGroupState[];
    activeTabId: string | null;
}

export class EditorManager {
    private ide: IDE;
    private grid: EditorGrid;

    constructor(ide: IDE) {
        this.ide = ide;
        // The grid now handles its own internal layout using SplitView [cite: 285]
        this.grid = new EditorGrid(ide);
        this.registerCommands();
    }

    /**
     * Mounts the underlying EditorGrid component to the center panel.
     */
    public mount(centerPanel: HTMLElement): void {
        this.grid.mount(centerPanel); // Uses BaseComponent.mount 
    }

    private registerCommands(): void {
        this.ide.commands.register({
            id: 'editor.open',
            label: 'Open Editor Tab',
            handler: (props: EditorTabProps) => this.openTab(props),
        });
        this.ide.commands.register({
            id: 'editor.close',
            label: 'Close Editor Tab',
            handler: (id: string) => this.closeTab(id),
        });
        this.ide.commands.register({
            id: 'editor.closeAll',
            label: 'Close All Tabs',
            handler: () => this.closeAllTabs(),
        });
        this.ide.commands.register({
            id: 'editor.nextTab',
            label: 'Next Tab',
            handler: () => this.cycleTab(1),
        });
        this.ide.commands.register({
            id: 'editor.prevTab',
            label: 'Previous Tab',
            handler: () => this.cycleTab(-1),
        });
        this.ide.commands.register({
            id: 'editor.splitRight',
            label: 'Split Editor Right',
            handler: () => this.grid.splitRight(),
        });
        this.ide.commands.register({
            id: 'editor.openView',
            label: 'Open View in Tab',
            handler: (args: { providerId: string; title?: string; icon?: string }) => this.openView(args.providerId, args.title, args.icon),
        });

        this.ide.commands.register({
            id: 'editor.openFile',
            label: 'Open File',
            handler: (args: { path: string; line?: number; column?: number }) => {
                // let filePath = args.path;
                // const workspace = this.ide.workspace.getActiveWorkspace();

                // // Logic for path normalization remains centered here
                // if (workspace) {
                //     const workspaceId = workspace.id;
                //     const workspaceName = workspace.name;
                //     if (filePath.startsWith(`/workspace/${workspaceId}`)) {
                //         filePath = filePath.replace(`/workspace/${workspaceId}`, workspaceName);
                //     } else if (filePath.startsWith('/') && !filePath.startsWith(workspaceName)) {
                //         filePath = workspaceName + filePath;
                //     }
                // }

                // if (this.hasTab(filePath)) {
                //     this.openFile(filePath, '', '', '', undefined, args.line, args.column);
                //     return;
                // }

                // Call to VFS for content would go here
                this.ide.commands.execute('vfs.readFile', { path: args.path }).then((result: any) => {
                    const content = typeof result === 'string' ? result : (result as any).content;
                    const name = args.path.split('/').pop() || 'Untitled';
                    const language = 'typescript'; // Should be detected
                    this.openFile(args.path, name, content, language, undefined, args.line, args.column);
                });
            }
        });
    }

    /**
     * Opens a generic tab based on the provided UI-lib props.
     */
    public openTab(props: EditorTabProps): void {
        const group = this.grid.getGroupForTab(props.id) || this.grid.getActiveGroup();
        group.openTab(props);
    }

    /**
     * High-level API to open an extension view in a new editor tab.
     * Delegates to ViewRegistry for the actual rendering.
     */
    public openView(providerId: string, title?: string, icon?: string): void {
        this.ide.views.renderView('center-panel', providerId);
        // Note: ViewRegistry.renderView will call back to openTab with providerId,
        // which triggers the mounting logic.
    }

    /**
     * Specialized method for opening text files with Monaco editor integration.
     */
    public openFile(fileId: string, title: string, content: string, language: string, icon?: string, line?: number, column?: number): void {
        const group = this.grid.getGroupForTab(fileId) || this.grid.getActiveGroup();

        if (group.hasTab(fileId)) {
            group.activateTab(fileId);

            const monacoEditor = this.ide.monaco.getEditor(fileId);
            if (monacoEditor && line !== undefined) {
                const pos = { lineNumber: line, column: column || 1 };
                monacoEditor.setPosition(pos);
                monacoEditor.revealPositionInCenter(pos, 0); // Smooth scroll
            }
            return;
        }

        // Open the UI tab first
        group.openTab({ id: fileId, title, icon });

        // Then attach the heavy editor logic to the content panel
        const contentPanel = group.getContentPanel(fileId);
        if (contentPanel && this.ide.monaco) {
            // Apply IDE-specific styles to the panel container [cite: 13]
            Object.assign(contentPanel.style, {
                overflow: 'hidden',
                position: 'relative'
            });
            this.ide.monaco.openFile(contentPanel, fileId, content, language, line, column);
        }
    }

    public getContentPanel(tabId: string): HTMLElement | undefined {
        return this.grid.getGroupForTab(tabId)?.getContentPanel(tabId);
    }

    public activateTab(id: string): void {
        this.grid.getGroupForTab(id)?.activateTab(id);
    }

    public closeTab(id: string): void {
        this.grid.getGroupForTab(id)?.closeTab(id);
    }

    public closeAllTabs(): void {
        this.grid.groups.forEach(group => group.closeAllTabs());
    }

    public cycleTab(direction: number): void {
        this.grid.getActiveGroup().cycleTab(direction);
    }

    public setTabDirty(id: string, isDirty: boolean): void {
        this.grid.getGroupForTab(id)?.setTabDirty(id, isDirty);
    }

    public hasTab(id: string): boolean {
        return !!this.grid.getGroupForTab(id);
    }

    public getActiveTabId(): string | null {
        return this.grid.getActiveGroup().activeTabId;
    }

    public getState(): EditorState {
        const groupsState: EditorGroupState[] = [];
        this.grid.groups.forEach(group => groupsState.push(group.getState()));

        return {
            groups: groupsState,
            activeTabId: this.getActiveTabId(),
        };
    }

    /**
     * Proper cleanup of all managed grid groups and their tabs.
     */
    public dispose(): void {
        this.grid.destroy(); // Cascades through EditorGrid -> SplitView -> EditorGroups [cite: 20, 89]
    }
}