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
    isDetached?: boolean;
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
    private detachedWindows = new Map<string, Window>();

    private constructor() {
        window.addEventListener('beforeunload', () => {
            this.detachedWindows.forEach(win => win.close());
        });
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
            isDetached: false,
            ...saved,
            ...options
        };
        
        if (merged.isDetached) {
            this.detach(merged.id);
        } else {
            current.set(options.id, merged);
            this.windows.set(current);
            this.focus(options.id);
        }

        settingsStore.setWindowState(options.id, { 
            isOpen: true, 
            x: merged.x, 
            y: merged.y, 
            width: merged.width, 
            height: merged.height,
            isDetached: merged.isDetached
        });
    }

    public detach(id: string) {
        const current = new Map(this.windows.get());
        const opts = current.get(id) || { id, title: id.toUpperCase() };
        
        // Remove from main window if present
        current.delete(id);
        this.windows.set(current);

        // Open new window
        const features = `width=${opts.width || 400},height=${opts.height || 300},left=${opts.x || 100},top=${opts.y || 100}`;
        const win = window.open('about:blank', `war-games-${id}`, features);
        
        if (win) {
            this.detachedWindows.set(id, win);
            this.setupDetachedWindow(id, win, opts);
            settingsStore.setWindowState(id, { isDetached: true, isOpen: true });
        }
    }

    private setupDetachedWindow(id: string, win: Window, opts: any) {
        const doc = win.document;
        doc.title = `${opts.title} - War-Games PRO`;
        
        // Copy styles
        document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
            doc.head.appendChild(node.cloneNode(true));
        });

        const root = doc.createElement('div');
        root.id = 'detached-root';
        root.style.width = '100vw';
        root.style.height = '100vh';
        root.style.background = 'var(--bg-panel)';
        doc.body.appendChild(root);
        doc.body.style.margin = '0';
        doc.body.style.overflow = 'hidden';

        // Signal back on close
        win.addEventListener('unload', () => {
            this.detachedWindows.delete(id);
            // If main window still exists, update settings
            if (!window.closed) {
                settingsStore.setWindowState(id, { isOpen: false, isDetached: false });
            }
        });
    }

    public isDetached(id: string): boolean {
        return this.detachedWindows.has(id);
    }

    public getDetachedWindow(id: string): Window | undefined {
        return this.detachedWindows.get(id);
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
