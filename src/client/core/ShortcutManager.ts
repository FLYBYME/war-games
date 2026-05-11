/**
 * ShortcutManager - Global keyboard shortcut handler
 * Captures keydown events, normalizes key combinations into canonical
 * strings, and dispatches matching commands via the CommandRegistry.
 */

import { IDE } from './IDE';

/**
 * Map of event.key values to canonical display names
 */
const KEY_ALIASES: Record<string, string> = {
    ' ': 'Space',
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right',
    'Escape': 'Escape',
    'Enter': 'Enter',
    'Backspace': 'Backspace',
    'Delete': 'Delete',
    'Tab': 'Tab',
};

export class ShortcutManager {
    private ide: IDE;
    private handleKeyDown: (e: KeyboardEvent) => void;

    constructor(ide: IDE) {
        this.ide = ide;

        this.handleKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);
        window.addEventListener('keydown', this.handleKeyDown);
    }

    /**
     * Normalize a KeyboardEvent into a canonical keybinding string.
     * Modifier order: Ctrl → Shift → Alt → Meta, then the key.
     * On macOS, Meta (⌘) is treated as Ctrl for cross-platform consistency.
     */
    public static normalizeEvent(e: KeyboardEvent): string | null {
        // Guard against events with undefined key (e.g. IME composition)
        if (!e.key) return null;

        // Ignore standalone modifier presses
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
            return null;
        }

        const parts: string[] = [];

        // On macOS, Meta key acts like Ctrl
        const isMac = navigator.platform.toUpperCase().includes('MAC');
        const ctrlPressed = isMac ? (e.ctrlKey || e.metaKey) : e.ctrlKey;

        if (ctrlPressed) parts.push('Ctrl');
        if (e.shiftKey) parts.push('Shift');
        if (e.altKey) parts.push('Alt');
        if (!isMac && e.metaKey) parts.push('Meta');

        // Resolve the key name
        let key = e.key;

        // Use alias if available
        if (KEY_ALIASES[key]) {
            key = KEY_ALIASES[key];
        } else if (key.length === 1) {
            // Single character — uppercase it for consistency
            key = key.toUpperCase();
        }

        parts.push(key);

        // If there are no modifiers, only handle special standalone keys
        if (parts.length === 1) {
            const specialStandalones = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6',
                'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Escape'];
            if (!specialStandalones.includes(key)) {
                return null; // Don't intercept regular typing
            }
        }

        return parts.join('+');
    }

    /**
     * Handle a keydown event
     */
    private onKeyDown(e: KeyboardEvent): void {
        const keybinding = ShortcutManager.normalizeEvent(e);
        if (!keybinding) return;

        const command = this.ide.commands.getByKeybinding(keybinding);
        if (!command) return;

        // Check context guard
        if (command.when && !command.when()) return;

        // Prevent default browser behavior (e.g. Ctrl+S saving the page)
        e.preventDefault();
        e.stopPropagation();

        // Execute the matched command
        this.ide.commands.execute(command.id).catch((err) => {
            console.error(`ShortcutManager: Failed to execute "${command.id}" for "${keybinding}"`, err);
        });
    }

    /**
     * Remove the global event listener
     */
    public dispose(): void {
        window.removeEventListener('keydown', this.handleKeyDown);
    }
}
