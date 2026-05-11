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
                const root = document.createElement('div');
                Object.assign(root.style, {
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                    fontSize: '12px',
                });

                // Output area
                const output = document.createElement('div');
                Object.assign(output.style, {
                    flex: '1',
                    overflow: 'auto',
                    padding: '8px',
                    color: 'var(--text-main, #ccc)',
                    lineHeight: '1.6',
                });

                // Input area
                const inputRow = document.createElement('div');
                Object.assign(inputRow.style, {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderTop: '1px solid var(--border, #3e3e42)',
                });

                const prompt = document.createElement('span');
                prompt.textContent = '>';
                prompt.style.color = 'var(--accent, #007acc)';
                prompt.style.fontWeight = '700';
                inputRow.appendChild(prompt);

                const input = document.createElement('input');
                Object.assign(input.style, {
                    flex: '1',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-main, #ccc)',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    outline: 'none',
                });
                input.placeholder = 'Enter JS expression...';
                inputRow.appendChild(input);

                root.appendChild(output);
                root.appendChild(inputRow);
                container.appendChild(root);

                // Command history
                const history: string[] = [];
                let historyIndex = -1;

                // Log interceptor
                const originalLog = console.log;
                const originalError = console.error;
                const originalWarn = console.warn;

                const appendLog = (message: string, color: string = 'var(--text-main, #ccc)') => {
                    const line = document.createElement('div');
                    line.style.color = color;
                    line.style.whiteSpace = 'pre-wrap';
                    line.style.wordBreak = 'break-all';
                    line.textContent = message;
                    output.appendChild(line);
                    output.scrollTop = output.scrollHeight;
                };

                // Override console methods to capture output
                console.log = (...args: unknown[]) => {
                    originalLog.apply(console, args);
                    appendLog(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
                };
                console.error = (...args: unknown[]) => {
                    originalError.apply(console, args);
                    appendLog(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '), 'var(--error, #f44336)');
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

                // Input handler
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        const expr = input.value.trim();
                        if (!expr) return;

                        history.push(expr);
                        historyIndex = history.length;
                        input.value = '';

                        appendLog(`> ${expr}`, 'var(--accent, #007acc)');

                        try {
                            // Provide access to IDE services in eval context
                            const evalContext = {
                                ide,
                                client: ide.getClient(),
                                matches: ide.matches,
                                selection: ide.selection,
                                stream: ide.stream,
                            };

                            // Execute in a context where services are available
                            const fn = new Function(
                                ...Object.keys(evalContext),
                                `return (${expr})`
                            );
                            const result = fn(...Object.values(evalContext));

                            if (result instanceof Promise) {
                                void result.then(r => {
                                    appendLog(typeof r === 'object' ? JSON.stringify(r, null, 2) : String(r), 'var(--success, #4caf50)');
                                }).catch(err => {
                                    appendLog(String(err), 'var(--error, #f44336)');
                                });
                            } else {
                                appendLog(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result), 'var(--success, #4caf50)');
                            }
                        } catch (err) {
                            appendLog(String(err), 'var(--error, #f44336)');
                        }
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (historyIndex > 0) {
                            historyIndex--;
                            input.value = history[historyIndex];
                        }
                    } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (historyIndex < history.length - 1) {
                            historyIndex++;
                            input.value = history[historyIndex];
                        } else {
                            historyIndex = history.length;
                            input.value = '';
                        }
                    }
                });

                // Welcome message
                appendLog('War Games Developer Console', 'var(--accent, #007acc)');
                appendLog('Access IDE services: ide, client, matches, selection, stream', 'var(--text-muted, #888)');
                appendLog('Type any JS expression and press Enter.', 'var(--text-muted, #888)');
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
