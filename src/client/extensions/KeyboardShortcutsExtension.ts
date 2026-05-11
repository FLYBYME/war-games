/**
 * KeyboardShortcutsExtension — Displays an overlay of all registered keyboard shortcuts.
 *
 * Activated via Ctrl+K Ctrl+S or from the Help menu.
 * Lists all registered commands with their keybindings in a searchable modal.
 */

import { Extension, ExtensionContext } from '../core/extensions/Extension';
import * as uiLib from '../ui-lib';

export const KeyboardShortcutsExtension: Extension = {
    id: 'wargames.keyboard-shortcuts',
    name: 'Keyboard Shortcuts',
    version: '1.0.0',

    activate(context: ExtensionContext) {
        const ide = context.ide;

        ide.commands.register({
            id: 'shortcuts.show',
            label: 'Show Keyboard Shortcuts',
            keybinding: 'Ctrl+K Ctrl+S',
            handler: () => {
                showShortcutsOverlay();
            }
        });

        // Add to Help menu
        ide.layout.header.menuBar.addMenuItem({
            id: 'help',
            label: 'Help',
            items: [
                { id: 'help:shortcuts', label: 'Keyboard Shortcuts', command: 'shortcuts.show' },
                { id: 'help:about', label: 'About War Games', onClick: () => showAboutDialog() },
            ]
        });

        const showShortcutsOverlay = () => {
            // Get all registered commands
            const allCommands = ide.commands.getAll();

            const modal = new uiLib.Modal({
                title: 'Keyboard Shortcuts',
                width: '600px',
            });

            const body = modal.getElement().querySelector('.modal-body') ?? modal.getElement();

            // Search
            const search = new uiLib.SearchInput({
                placeholder: 'Search shortcuts...',
                onSearch: (text: string) => filterShortcuts(text),
            });
            body.appendChild(search.getElement());

            // Table container
            const tableContainer = document.createElement('div');
            Object.assign(tableContainer.style, {
                maxHeight: '400px',
                overflow: 'auto',
                marginTop: '8px',
            });
            body.appendChild(tableContainer);

            const renderTable = (commands: { id: string; label: string; keybinding?: string }[]) => {
                tableContainer.innerHTML = '';

                const table = document.createElement('table');
                Object.assign(table.style, {
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '12px',
                });

                // Header
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');
                for (const col of ['Command', 'Shortcut']) {
                    const th = document.createElement('th');
                    th.textContent = col;
                    Object.assign(th.style, {
                        textAlign: 'left',
                        padding: '6px 8px',
                        borderBottom: '1px solid var(--border, #3e3e42)',
                        color: 'var(--text-muted, #888)',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    });
                    headerRow.appendChild(th);
                }
                thead.appendChild(headerRow);
                table.appendChild(thead);

                // Body
                const tbody = document.createElement('tbody');
                for (const cmd of commands) {
                    const row = document.createElement('tr');
                    row.style.borderBottom = '1px solid rgba(255,255,255,0.04)';

                    const labelCell = document.createElement('td');
                    labelCell.textContent = cmd.label || cmd.id;
                    Object.assign(labelCell.style, {
                        padding: '4px 8px',
                        color: 'var(--text-main, #ccc)',
                    });

                    const keyCell = document.createElement('td');
                    if (cmd.keybinding) {
                        const kbd = document.createElement('kbd');
                        kbd.textContent = cmd.keybinding;
                        Object.assign(kbd.style, {
                            padding: '2px 6px',
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            borderRadius: '3px',
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono, monospace)',
                            color: 'var(--accent, #007acc)',
                            border: '1px solid rgba(255,255,255,0.1)',
                        });
                        keyCell.appendChild(kbd);
                    } else {
                        keyCell.textContent = '—';
                        keyCell.style.color = 'var(--text-muted, #888)';
                    }
                    keyCell.style.padding = '4px 8px';

                    row.appendChild(labelCell);
                    row.appendChild(keyCell);
                    tbody.appendChild(row);
                }
                table.appendChild(tbody);
                tableContainer.appendChild(table);
            };

            const filterShortcuts = (query: string) => {
                const filtered = allCommands.filter(cmd => {
                    const lower = query.toLowerCase();
                    return cmd.label.toLowerCase().includes(lower)
                        || cmd.id.toLowerCase().includes(lower)
                        || (cmd.keybinding ?? '').toLowerCase().includes(lower);
                });
                renderTable(filtered);
            };

            // Initial render
            renderTable(allCommands);
            modal.mount(document.body);
        };

        const showAboutDialog = () => {
            const modal = new uiLib.Modal({
                title: 'About War Games',
                width: '400px',
            });

            const body = modal.getElement().querySelector('.modal-body') ?? modal.getElement();

            const content = document.createElement('div');
            Object.assign(content.style, {
                textAlign: 'center',
                padding: '20px',
            });

            content.innerHTML = `
                <div style="font-size: 32px; margin-bottom: 12px;">⚔️</div>
                <h2 style="margin: 0 0 4px; color: var(--text-main, #ccc);">War Games</h2>
                <p style="color: var(--text-muted, #888); font-size: 12px; margin: 0 0 12px;">Tactical Simulation Command Center</p>
                <p style="color: var(--text-muted, #888); font-size: 11px;">
                    A real-time tactical simulation engine with<br/>
                    100+ tools, AI agents, and full entity lifecycle management.
                </p>
                <div style="margin-top: 16px; font-size: 10px; color: var(--text-muted, #888);">
                    Version 2.2.0 • TypeScript • PixiJS • Zod
                </div>
            `;

            body.appendChild(content);
            modal.mount(document.body);
        };

        console.log('✅ KeyboardShortcutsExtension activated');
    }
};
