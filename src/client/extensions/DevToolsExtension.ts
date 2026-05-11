/**
 * DevToolsExtension — Wraps legacy IDE features as an optional extension.
 *
 * Provides Monaco editor and terminal access for advanced users and developers.
 * This keeps the core tactical command center clean while preserving power-user tools.
 */

import { Extension, ExtensionContext } from '../core/extensions/Extension';
import { ViewProvider } from '../core/extensions/ViewProvider';
import * as uiLib from '../ui-lib';

export const DevToolsExtension: Extension = {
    id: 'wargames.devtools',
    name: 'Developer Tools',
    version: '1.0.0',

    activate(context: ExtensionContext) {
        const ide = context.ide;

        // ── Console View (Bottom Panel) ──────────────────────────────────────

        const consoleProvider: ViewProvider = {
            id: 'devtools.console',
            name: 'Console',
            resolveView: (container, disposables) => {
                const root = new uiLib.Column({ fill: true });
                root.getElement().style.overflow = 'hidden';

                // Output area with ScrollArea
                const outputList = new uiLib.Column({ padding: 'sm', gap: 'xs' });
                const scrollArea = new uiLib.ScrollArea({ 
                    fill: true, 
                    children: [outputList] 
                });
                root.appendChildren(scrollArea);

                // Input area
                const inputRow = new uiLib.Row({
                    padding: 'xs',
                    gap: 'xs',
                    align: 'center'
                });
                inputRow.getElement().style.borderTop = '1px solid var(--border)';

                const prompt = new uiLib.Text({ text: '>', variant: 'accent', weight: 'bold', monospace: true });
                
                const input = new uiLib.TextInput({
                    placeholder: 'Enter JS expression...',
                    value: '',
                    onEnter: (expr) => {
                        expr = expr.trim();
                        if (!expr) return;

                        history.push(expr);
                        historyIndex = history.length;
                        
                        // Clear input value manually since TextInput doesn't auto-clear
                        const inputEl = input.getElement().querySelector('input');
                        if (inputEl) inputEl.value = '';

                        appendLog(`> ${expr}`, undefined, 'accent');

                        try {
                            const evalContext = {
                                ide,
                                client: ide.getClient(),
                                matches: (ide as any).matches,
                                selection: ide.selection,
                                stream: (ide as any).stream,
                            };

                            const fn = new Function(
                                ...Object.keys(evalContext),
                                `return (${expr})`
                            );
                            const result = fn(...Object.values(evalContext));

                            if (result instanceof Promise) {
                                void result.then(r => {
                                    appendLog(typeof r === 'object' ? JSON.stringify(r, null, 2) : String(r), 'var(--status-ok, #4caf50)');
                                }).catch(err => {
                                    appendLog(String(err), undefined, 'error');
                                });
                            } else {
                                appendLog(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result), 'var(--status-ok, #4caf50)');
                            }
                        } catch (err) {
                            appendLog(String(err), undefined, 'error');
                        }
                    }
                });
                input.getElement().style.flex = '1';
                input.getElement().style.border = 'none';
                input.getElement().style.background = 'transparent';

                inputRow.appendChildren(prompt, input);
                root.appendChildren(inputRow);
                root.mount(container);

                // Command history
                const history: string[] = [];
                let historyIndex = -1;

                // Log interceptor
                const originalLog = console.log;
                const originalError = console.error;
                const originalWarn = console.warn;

                const appendLog = (message: string, color?: string, variant: 'main' | 'muted' | 'error' | 'accent' = 'main') => {
                    const line = new uiLib.Text({ 
                        text: message, 
                        variant, 
                        monospace: true,
                        selectable: true 
                    });
                    if (color) line.getElement().style.color = color;
                    line.getElement().style.whiteSpace = 'pre-wrap';
                    line.getElement().style.wordBreak = 'break-all';
                    outputList.appendChildren(line);
                    
                    // Auto-scroll to bottom
                    setTimeout(() => {
                        scrollArea.getElement().scrollTop = scrollArea.getElement().scrollHeight;
                    }, 0);
                };

                // Override console methods
                console.log = (...args: unknown[]) => {
                    originalLog.apply(console, args);
                    appendLog(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
                };
                console.error = (...args: unknown[]) => {
                    originalError.apply(console, args);
                    appendLog(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '), undefined, 'error');
                };
                console.warn = (...args: unknown[]) => {
                    originalWarn.apply(console, args);
                    appendLog(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '), 'var(--warning, #ff9800)');
                };

                disposables.push({
                    dispose: () => {
                        console.log = originalLog;
                        console.error = originalError;
                        console.warn = originalWarn;
                    }
                });

                // History handler (still need keydown for ArrowUp/Down)
                const inputEl = input.getElement().querySelector('input');
                if (inputEl) {
                    inputEl.addEventListener('keydown', (e) => {
                        if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            if (historyIndex > 0) {
                                historyIndex--;
                                inputEl.value = history[historyIndex];
                            }
                        } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            if (historyIndex < history.length - 1) {
                                historyIndex++;
                                inputEl.value = history[historyIndex];
                            } else {
                                historyIndex = history.length;
                                inputEl.value = '';
                            }
                        }
                    });
                }

                appendLog('War Games Developer Console', undefined, 'accent');
                appendLog('Access IDE services: ide, client, matches, selection, stream', undefined, 'muted');
            }
        };

        ide.views.registerProvider('bottom-panel', consoleProvider);

        ide.activityBar.registerItem({
            id: 'devtools.console',
            location: 'bottom-panel',
            icon: 'fas fa-code',
            title: 'Developer Console',
            order: 50
        });

        // ── Shortcut to open devtools ────────────────────────────────────────

        ide.commands.register({
            id: 'devtools.open',
            label: 'Open Developer Console',
            keybinding: 'F12',
            handler: () => {
                void ide.views.renderView('bottom-panel', 'devtools.console');
            }
        });

        console.log('✅ DevToolsExtension activated');
    }
};
