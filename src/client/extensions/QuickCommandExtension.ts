/**
 * QuickCommandExtension — Command Palette (Ctrl+Shift+P) for quick access to all commands.
 *
 * Provides a fuzzy-searchable overlay listing all registered commands.
 * This is the primary keyboard-first navigation surface.
 */

import { Extension, ExtensionContext } from '../core/extensions/Extension';
import * as uiLib from '../ui-lib';

export const QuickCommandExtension: Extension = {
    id: 'wargames.quick-command',
    name: 'Command Palette',
    version: '1.0.0',

    activate(context: ExtensionContext) {
        const ide = context.ide;

        let isOpen = false;
        let overlayEl: HTMLElement | null = null;

        const showPalette = () => {
            if (isOpen) {
                hidePalette();
                return;
            }
            isOpen = true;

            const allCommands = ide.commands.getAll();

            // Create overlay
            overlayEl = document.createElement('div');
            Object.assign(overlayEl.style, {
                position: 'fixed',
                inset: '0',
                zIndex: '25000',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                justifyContent: 'center',
                paddingTop: '80px',
            });

            // Palette container
            const palette = document.createElement('div');
            Object.assign(palette.style, {
                width: '500px',
                maxHeight: '400px',
                backgroundColor: 'var(--bg-sidebar, #252526)',
                border: '1px solid var(--border, #3e3e42)',
                borderRadius: '8px',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            });

            // Search input
            const inputWrapper = document.createElement('div');
            inputWrapper.style.padding = '8px';
            inputWrapper.style.borderBottom = '1px solid var(--border, #3e3e42)';

            const searchInput = document.createElement('input');
            Object.assign(searchInput.style, {
                width: '100%',
                padding: '8px 12px',
                backgroundColor: 'var(--bg-input, #2d2d30)',
                color: 'var(--text-main, #ccc)',
                border: '1px solid var(--border, #3e3e42)',
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
            });
            searchInput.placeholder = '> Type a command...';
            inputWrapper.appendChild(searchInput);
            palette.appendChild(inputWrapper);

            // Results list
            const resultsList = document.createElement('div');
            Object.assign(resultsList.style, {
                flex: '1',
                overflow: 'auto',
            });
            palette.appendChild(resultsList);

            let selectedIndex = 0;
            let filteredCommands = allCommands;

            const renderResults = () => {
                resultsList.innerHTML = '';

                for (let i = 0; i < filteredCommands.length && i < 20; i++) {
                    const cmd = filteredCommands[i];
                    const item = document.createElement('div');
                    Object.assign(item.style, {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: 'var(--text-main, #ccc)',
                        backgroundColor: i === selectedIndex ? 'rgba(0, 122, 204, 0.2)' : 'transparent',
                    });

                    item.addEventListener('mouseenter', () => {
                        selectedIndex = i;
                        renderResults();
                    });

                    item.addEventListener('click', () => {
                        hidePalette();
                        void ide.commands.execute(cmd.id);
                    });

                    const labelSpan = document.createElement('span');
                    labelSpan.textContent = cmd.label || cmd.id;
                    item.appendChild(labelSpan);

                    if (cmd.keybinding) {
                        const kbd = document.createElement('kbd');
                        kbd.textContent = cmd.keybinding;
                        Object.assign(kbd.style, {
                            padding: '1px 4px',
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontFamily: 'var(--font-mono, monospace)',
                            color: 'var(--text-muted, #888)',
                        });
                        item.appendChild(kbd);
                    }

                    resultsList.appendChild(item);
                }
            };

            // Search filtering
            searchInput.addEventListener('input', () => {
                const query = searchInput.value.toLowerCase().replace(/^>\s*/, '');
                if (!query) {
                    filteredCommands = allCommands;
                } else {
                    filteredCommands = allCommands.filter(cmd =>
                        (cmd.label || cmd.id).toLowerCase().includes(query)
                        || cmd.id.toLowerCase().includes(query)
                    );
                }
                selectedIndex = 0;
                renderResults();
            });

            // Keyboard navigation
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    selectedIndex = Math.min(selectedIndex + 1, filteredCommands.length - 1);
                    renderResults();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    selectedIndex = Math.max(0, selectedIndex - 1);
                    renderResults();
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredCommands[selectedIndex]) {
                        hidePalette();
                        void ide.commands.execute(filteredCommands[selectedIndex].id);
                    }
                } else if (e.key === 'Escape') {
                    hidePalette();
                }
            });

            // Click overlay to close
            overlayEl.addEventListener('click', (e) => {
                if (e.target === overlayEl) hidePalette();
            });

            overlayEl.appendChild(palette);
            document.body.appendChild(overlayEl);
            searchInput.focus();

            renderResults();
        };

        const hidePalette = () => {
            isOpen = false;
            if (overlayEl) {
                overlayEl.remove();
                overlayEl = null;
            }
        };

        ide.commands.register({
            id: 'palette.show',
            label: 'Show Command Palette',
            keybinding: 'Ctrl+Shift+P',
            handler: showPalette,
        });

        // Also bind F1
        ide.commands.register({
            id: 'palette.show.f1',
            label: 'Show Command Palette (F1)',
            keybinding: 'F1',
            handler: showPalette,
        });

        console.log('✅ QuickCommandExtension activated');
    }
};
