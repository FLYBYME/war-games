/**
 * ThemeService - Manages global IDE CSS variables to match Monaco editor themes.
 */

import { IDE } from './IDE';
import { ConfigurationEvents } from './configuration/ConfigurationService';

// The variables we want to control
export interface ThemePalette {
    '--bg-root': string;
    '--bg-sidebar': string;
    '--bg-activity-bar': string;
    '--bg-titlebar': string;
    '--bg-panel': string;
    '--bg-status-bar': string;
    '--bg-input': string;
    '--border': string;
    '--text-main': string;
    '--text-muted': string;
    '--accent': string;
    '--hover-bg': string;
    '--success': string;
    '--warning': string;
    '--error': string;
    '--info': string;
}

const THEMES: Record<string, ThemePalette> = {
    'ide-dark': {
        '--bg-root': '#1e1e1e',
        '--bg-sidebar': '#252526',
        '--bg-activity-bar': '#333333',
        '--bg-titlebar': '#3c3c3c',
        '--bg-panel': '#1e1e1e',
        '--bg-status-bar': '#007acc',
        '--bg-input': '#3c3c3c',
        '--border': '#454545',
        '--text-main': '#cccccc',
        '--text-muted': '#858585',
        '--accent': '#007acc',
        '--hover-bg': '#2a2d2e',
        '--success': '#4caf50',
        '--warning': '#ff9800',
        '--error': '#f44336',
        '--info': '#007acc',
    },
    'vs-dark': {
        '--bg-root': '#1e1e1e',
        '--bg-sidebar': '#252526',
        '--bg-activity-bar': '#333333',
        '--bg-titlebar': '#323233',
        '--bg-panel': '#1e1e1e',
        '--bg-status-bar': '#007acc',
        '--bg-input': '#3c3c3c',
        '--border': '#454545',
        '--text-main': '#cccccc',
        '--text-muted': '#858585',
        '--accent': '#007acc',
        '--hover-bg': '#2a2d2e',
        '--success': '#4caf50',
        '--warning': '#ff9800',
        '--error': '#f44336',
        '--info': '#007acc',
    },
    'vs-light': {
        '--bg-root': '#ffffff',
        '--bg-sidebar': '#f3f3f3',
        '--bg-activity-bar': '#f3f3f3',
        '--bg-titlebar': '#dddddd',
        '--bg-panel': '#ffffff',
        '--bg-status-bar': '#007acc',
        '--bg-input': '#f3f3f3',
        '--border': '#d0d0d0',
        '--text-main': '#333333',
        '--text-muted': '#616161',
        '--accent': '#007acc',
        '--hover-bg': '#e8e8e8',
        '--success': '#4caf50',
        '--warning': '#ff9800',
        '--error': '#f44336',
        '--info': '#007acc',
    },
    'hc-black': {
        '--bg-root': '#000000',
        '--bg-sidebar': '#000000',
        '--bg-activity-bar': '#000000',
        '--bg-titlebar': '#000000',
        '--bg-panel': '#000000',
        '--bg-status-bar': '#000000',
        '--bg-input': '#000000',
        '--border': '#6fc3df',
        '--text-main': '#ffffff',
        '--text-muted': '#ffffff',
        '--accent': '#000000',
        '--hover-bg': '#008000',
        '--success': '#00ff00',
        '--warning': '#ffff00',
        '--error': '#ff0000',
        '--info': '#00ffff',
    }
};

export class ThemeService {
    private ide: IDE;

    constructor(ide: IDE) {
        this.ide = ide;

        // Apply on startup
        const currentTheme = this.ide.settings.get<string>('editor.theme') || 'ide-dark';
        this.applyTheme(currentTheme);

        // Listen for changes
        this.ide.commands.on(ConfigurationEvents.CHANGED, (e: any) => {
            if (e.key === 'editor.theme') {
                this.applyTheme(e.value);
            }
        });
    }

    private applyTheme(themeName: string): void {
        const palette = THEMES[themeName] || THEMES['ide-dark'];

        const root = document.documentElement;
        for (const [key, value] of Object.entries(palette)) {
            root.style.setProperty(key, value);
        }

        // Special case for HC black window border
        if (themeName === 'hc-black') {
            root.style.setProperty('border', '1px solid #6fc3df');
        } else {
            root.style.removeProperty('border');
        }
    }
}
