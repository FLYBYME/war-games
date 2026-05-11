/**
 * MonacoService - Manages Monaco Editor instances tied to editor tabs.
 * Creates, retrieves, layouts, and disposes Monaco editor instances.
 */

import * as monaco from 'monaco-editor';
import { IDE } from './IDE';
import { EditorEvents } from './editor/EditorManager';
import { ConfigurationEvents } from './configuration/ConfigurationService';
import { PromptDialog } from '../ui-lib';

// Configure Monaco's default theme to match the IDE's dark theme
monaco.editor.defineTheme('ide-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
        'editor.background': '#1e1e1e',
    },
});
monaco.editor.setTheme('ide-dark');

export class MonacoService {
    private ide: IDE;
    private editors: Map<string, monaco.editor.IStandaloneCodeEditor> = new Map();
    private modelListeners: Map<string, monaco.IDisposable> = new Map();
    private activeWidgets: Map<string, { id: string; domNode: HTMLElement; editorId: string }> = new Map();

    constructor(ide: IDE) {
        this.ide = ide;

        // Configure TypeScript defaults for proper module resolution
        (monaco.languages.typescript as any).typescriptDefaults.setCompilerOptions({
            target: (monaco.languages.typescript as any).ScriptTarget.ES2020,
            allowNonTsExtensions: true,
            moduleResolution: (monaco.languages.typescript as any).ModuleResolutionKind.NodeJs,
            module: (monaco.languages.typescript as any).ModuleKind.CommonJS,
            noEmit: true,
            esModuleInterop: true,
        });

        // Auto-dispose editors when their tab is closed
        this.ide.commands.on(EditorEvents.EDITOR_TAB_CLOSED, (data: { tabId: string }) => {
            this.disposeEditor(data.tabId);
        });

        // Re-layout the active editor when its tab becomes visible
        this.ide.commands.on(EditorEvents.EDITOR_ACTIVE_CHANGED, (data: { tabId: string | null }) => {
            if (!data.tabId) return;

            requestAnimationFrame(() => {
                const editor = this.editors.get(data.tabId!);
                if (editor) {
                    editor.layout();

                    // Update status bar for the newly active editor
                    const position = editor.getPosition();
                    if (position) {
                        this.updateStatusBarPosition(position.lineNumber, position.column);
                    }

                    const model = editor.getModel();
                    if (model) {
                        const langId = model.getLanguageId();
                        this.updateStatusBarLanguage(langId);
                    }
                }
            });
        });

        // Re-layout on window resize
        window.addEventListener('resize', () => {
            const activeId = this.ide.editor.getActiveTabId();
            if (activeId) {
                const editor = this.editors.get(activeId);
                if (editor) editor.layout();
            }
        });

        // React to configuration changes
        this.ide.commands.on(ConfigurationEvents.CHANGED, (event: { key: string; value: any }) => {
            this.onConfigurationChanged(event.key, event.value);
        });

        this.ide.layout.header.menuBar.addMenuItem({
            id: 'file',
            label: 'File',
            items: [
                { id: 'file:new', label: 'New File', shortcut: 'Ctrl+N', onClick: () => this.ide.commands.execute('file.new') },
                { id: 'file:open', label: 'Open File', shortcut: 'Ctrl+O', onClick: () => this.ide.commands.execute('file.open') },
                { id: 'file:save', label: 'Save File', shortcut: 'Ctrl+S', onClick: () => this.ide.commands.execute('file.save') },
                { id: 'file:save-as', label: 'Save As File', shortcut: 'Ctrl+Shift+S', onClick: () => this.ide.commands.execute('file.save-as') },
            ]
        });

        // Register default keybinding commands
        this.ide.commands.register({
            id: 'file.save',
            label: 'Save File',
            keybinding: 'Ctrl+S',
            handler: async () => {
                const activeId = this.ide.editor.getActiveTabId();
                if (activeId) {
                    const model = this.ide.monaco.getModel(activeId);
                    if (model) {
                        try {
                            console.log('Saving file:', activeId);
                            // await this.ide.vfs.writeFile(activeId, model.getValue());
                            console.warn('VFS is disabled: skipping writeFile');
                            this.ide.editor.setTabDirty(activeId, false);
                            this.ide.notifications.notify(`Saved: ${activeId}`, 'success', 3000);
                        } catch (err) {
                            this.ide.notifications.notify(`Failed to save ${activeId}`, 'error');
                        }
                    }
                }
            }
        });

        this.ide.commands.register({
            id: 'file.open',
            label: 'Open File',
            keybinding: 'Ctrl+O',
            handler: async () => {
                const activeId = this.ide.editor.getActiveTabId();
                if (activeId) {
                    const model = this.ide.monaco.getModel(activeId);
                    if (model) {
                        try {
                            console.log('Opening file:', activeId);
                            // await this.ide.vfs.readFile(activeId);
                            console.warn('VFS is disabled: skipping readFile');
                            this.ide.editor.setTabDirty(activeId, false);
                            this.ide.notifications.notify(`Opened: ${activeId}`, 'success', 3000);
                        } catch (err) {
                            this.ide.notifications.notify(`Failed to open ${activeId}`, 'error');
                        }
                    }
                }
            }
        });

        this.ide.commands.register({
            id: 'file.new',
            label: 'New File',
            keybinding: 'Ctrl+N',
            handler: async () => {
                const prompt = await PromptDialog.show({
                    title: 'New File',
                    message: 'Enter file name:',
                    defaultValue: '',
                    placeholder: 'file.ts',
                    okLabel: 'Create',
                    cancelLabel: 'Cancel'
                });

                if (prompt) {

                    try {
                        console.log('Creating new file:', prompt);
                        // await this.ide.vfs.writeFile(prompt, '');
                        console.warn('VFS is disabled: skipping writeFile');
                        this.ide.editor.setTabDirty(prompt, false);
                        this.ide.notifications.notify(`Created new file: ${prompt}`, 'success', 3000);
                    } catch (err) {
                        this.ide.notifications.notify(`Failed to create new file: ${prompt}`, 'error');
                    }

                }
            }
        });

        this.ide.commands.register({
            id: 'file.save-as',
            label: 'Save As File',
            keybinding: 'Ctrl+Shift+S',
            handler: async () => {
                const activeId = this.ide.editor.getActiveTabId();
                if (activeId) {
                    const model = this.ide.monaco.getModel(activeId);
                    if (model) {
                        try {
                            console.log('Saving file as:', activeId);
                            // await this.ide.vfs.writeFile(activeId, model.getValue());
                            console.warn('VFS is disabled: skipping writeFile');
                            this.ide.editor.setTabDirty(activeId, false);
                            this.ide.notifications.notify(`Saved as: ${activeId}`, 'success', 3000);
                        } catch (err) {
                            this.ide.notifications.notify(`Failed to save as ${activeId}`, 'error');
                        }
                    }
                }
            }
        });
    }

    /**
     * Handle live configuration changes — update all editor instances
     */
    private onConfigurationChanged(key: string, value: any): void {
        switch (key) {
            case 'editor.fontSize':
                this.editors.forEach((editor: monaco.editor.IStandaloneCodeEditor) => editor.updateOptions({ fontSize: value }));
                break;
            case 'editor.theme':
                monaco.editor.setTheme(value);
                break;
            case 'editor.wordWrap':
                this.editors.forEach((editor: monaco.editor.IStandaloneCodeEditor) => editor.updateOptions({ wordWrap: value ? 'on' : 'off' }));
                break;
            case 'editor.minimap':
                this.editors.forEach((editor: monaco.editor.IStandaloneCodeEditor) => editor.updateOptions({ minimap: { enabled: value } }));
                break;
            case 'editor.lineNumbers':
                this.editors.forEach((editor: monaco.editor.IStandaloneCodeEditor) => editor.updateOptions({ lineNumbers: value ? 'on' : 'off' }));
                break;
        }
    }

    /**
     * Helper to update the position indicator in the status bar
     */
    private updateStatusBarPosition(line: number, col: number): void {
        const item = this.ide.layout.statusBar.getItem('position');
        if (item) {
            item.updateProps({ text: `Ln ${line}, Col ${col}` });
        }
    }

    /**
     * Helper to update the language indicator in the status bar
     */
    private updateStatusBarLanguage(languageId: string): void {
        const item = this.ide.layout.statusBar.getItem('language');
        if (item) {
            // Capitalize first letter for display
            const displayLang = languageId.charAt(0).toUpperCase() + languageId.slice(1);
            item.updateProps({ text: displayLang });
        }
    }

    /**
     * Create a Monaco editor in the given container for a specific file/tab
     */
    public openFile(
        container: HTMLElement,
        fileId: string,
        content: string,
        language: string,
        lineNumber?: number,
        column?: number
    ): monaco.editor.IStandaloneCodeEditor {
        // If an editor already exists for this fileId, dispose it first
        if (this.editors.has(fileId)) {
            this.disposeEditor(fileId);
        }

        // Create a text model
        const uri = monaco.Uri.file(fileId);
        let model = monaco.editor.getModel(uri);
        if (!model) {
            model = monaco.editor.createModel(content, language, uri);
        }

        // Read current settings
        const fontSize = this.ide.settings.get<number>('editor.fontSize') ?? 14;
        const theme = this.ide.settings.get<string>('editor.theme') ?? 'ide-dark';
        const minimapEnabled = this.ide.settings.get<boolean>('editor.minimap') ?? true;
        const wordWrap = this.ide.settings.get<boolean>('editor.wordWrap');
        const lineNumbers = this.ide.settings.get<boolean>('editor.lineNumbers');

        // Create the editor
        const editor = monaco.editor.create(container, {
            model,
            theme,
            automaticLayout: true,
            minimap: { enabled: minimapEnabled },
            fontSize,
            fontFamily: '"Consolas", "Courier New", monospace',
            scrollBeyondLastLine: false,
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            padding: { top: 10, bottom: 10 },
            wordWrap: wordWrap ? 'on' : 'off',
            lineNumbers: lineNumbers === false ? 'off' : 'on',
        });

        if (lineNumber !== undefined) {
            const pos = { lineNumber, column: column || 1 };
            editor.setPosition(pos);
            editor.revealPositionInCenter(pos, monaco.editor.ScrollType.Smooth);
        }

        this.editors.set(fileId, editor);

        // Track dirty state
        if (!this.modelListeners.has(fileId)) {
            const listener = model.onDidChangeContent(() => {
                this.ide.editor.setTabDirty(fileId, true);
            });
            this.modelListeners.set(fileId, listener);
        }

        // Track cursor position
        editor.onDidChangeCursorPosition((e: monaco.editor.ICursorPositionChangedEvent) => {
            // Emit an event that IDE.ts can observe for state syncing
            this.ide.commands.emit('monaco.cursor.moved', {
                fileId,
                lineNumber: e.position.lineNumber,
                column: e.position.column
            });

            // Only update status bar if this is the active tab
            if (this.ide.editor.getActiveTabId() === fileId) {
                this.updateStatusBarPosition(e.position.lineNumber, e.position.column);
            }
        });
        return editor;
    }

    /**
     * Get an existing Monaco editor instance
     */
    public getEditor(fileId: string): monaco.editor.IStandaloneCodeEditor | undefined {
        return this.editors.get(fileId);
    }

    /**
     * Get a text model for a file
     */
    public getModel(fileId: string): monaco.editor.ITextModel | undefined {
        const uri = monaco.Uri.parse(`file://${fileId}`);
        return monaco.editor.getModel(uri) || undefined;
    }

    /**
     * Dispose a Monaco editor (called when tab is closed)
     */
    public disposeEditor(fileId: string): void {
        const editor = this.editors.get(fileId);
        if (editor) {
            editor.dispose();
            this.editors.delete(fileId);
        }

        const listener = this.modelListeners.get(fileId);
        if (listener) {
            listener.dispose();
            this.modelListeners.delete(fileId);
        }

        // Clean up any active inline widgets for this editor
        for (const [zoneId, widget] of this.activeWidgets) {
            if (widget.editorId === fileId) {
                this.activeWidgets.delete(zoneId);
            }
        }
    }

    /**
     * Inject a DOM node between lines in a specific editor using ViewZones.
     * Returns the zone ID, or null if the editor was not found.
     */
    public showInlineWidget(editorId: string, lineNumber: number, domNode: HTMLElement, heightInLines: number): string | null {
        const editor = this.editors.get(editorId);
        if (!editor) return null;

        let zoneId: string | null = null;

        editor.changeViewZones((accessor: any) => {
            zoneId = accessor.addZone({
                afterLineNumber: lineNumber,
                heightInLines: heightInLines,
                domNode: domNode,
            });
        });

        if (zoneId) {
            this.activeWidgets.set(zoneId, { id: zoneId, domNode, editorId });
        }

        return zoneId;
    }

    /**
     * Remove an inline widget zone, collapsing the code back together.
     */
    public closeInlineWidget(zoneId: string): void {
        const widget = this.activeWidgets.get(zoneId);
        if (!widget) return;

        const editor = this.editors.get(widget.editorId);
        if (editor) {
            editor.changeViewZones((accessor: any) => {
                accessor.removeZone(zoneId);
            });
        }
        this.activeWidgets.delete(zoneId);
    }

    /**
     * Dispose all editors
     */
    public dispose(): void {
        for (const [id] of this.editors) {
            this.disposeEditor(id);
        }
    }
}