import { Signal } from './Signal';
import { settingsStore, WindowState } from './SettingsStore';

export interface WindowOptions {
    id: string;
    title: string;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    minWidth?: number;
    minHeight?: number;
}

/**
 * WindowManager: Framework utility to manage floating window lifecycles.
 * Synchronizes with SettingsStore for persistence.
 */
export class WindowManager {
    private static instance: WindowManager;
    public windows = new Signal<Map<string, WindowOptions>>(new Map());
    public activeWindowId = new Signal<string | null>(null);
    private nextZIndex = 1000;

    private constructor() {
        // We don't automatically open all windows here, AppShell will handle instantiation.
        // But we can populate the 'windows' signal if they are marked as isOpen in settings.
    }

    public static getInstance(): WindowManager {
        if (!WindowManager.instance) WindowManager.instance = new WindowManager();
        return WindowManager.instance;
    }

    public open(options: WindowOptions) {
        const saved = settingsStore.windowStates.get()[options.id];
        
        const current = new Map(this.windows.get());
        const merged: WindowOptions = {
            width: 400,
            height: 300,
            x: 100 + (current.size * 20),
            y: 100 + (current.size * 20),
            ...saved,
            ...options
        };
        
        current.set(options.id, merged);
        this.windows.set(current);
        this.focus(options.id);

        settingsStore.setWindowState(options.id, { 
            isOpen: true, 
            x: merged.x, 
            y: merged.y, 
            width: merged.width, 
            height: merged.height 
        });
    }

    public close(id: string) {
        const current = new Map(this.windows.get());
        current.delete(id);
        this.windows.set(current);
        if (this.activeWindowId.get() === id) {
            this.activeWindowId.set(null);
        }
        settingsStore.setWindowState(id, { isOpen: false });
    }

    public focus(id: string) {
        this.activeWindowId.set(id);
    }

    public updateWindowBounds(id: string, bounds: { x: number, y: number, width: number, height: number }) {
        settingsStore.setWindowState(id, bounds);
        
        // Update local options to keep them in sync
        const current = new Map(this.windows.get());
        const opts = current.get(id);
        if (opts) {
            current.set(id, { ...opts, ...bounds });
            this.windows.set(current);
        }
    }

    public getNextZIndex(): number {
        return this.nextZIndex++;
    }
}

export const windowManager = WindowManager.getInstance();
