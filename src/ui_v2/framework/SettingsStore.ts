import { Signal } from './Signal';

export interface WindowState {
    id: string;
    isOpen: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    isDetached?: boolean;
}

export interface ClientSettings {
    activeView: string;
    layerVisibility: Record<string, boolean>;
    windowStates: Record<string, WindowState>;
}

const STORAGE_KEY = 'war_games_v2_settings';

const DEFAULT_SETTINGS: ClientSettings = {
    activeView: 'menu',
    layerVisibility: {
        grid: false,
        units: true,
        borders: true,
        bathymetry: false,
        losShading: false,
        wez: false
    },
    windowStates: {}
};

/**
 * SettingsStore: Manages localStorage persistence for client-side state.
 */
export class SettingsStore {
    private static instance: SettingsStore;
    private currentSettings: ClientSettings;

    public activeView: Signal<string>;
    public layerVisibility: Signal<Record<string, boolean>>;
    public windowStates: Signal<Record<string, WindowState>>;

    private constructor() {
        this.currentSettings = this.load();
        
        this.activeView = new Signal(this.currentSettings.activeView);
        this.layerVisibility = new Signal(this.currentSettings.layerVisibility);
        this.windowStates = new Signal(this.currentSettings.windowStates);

        // Auto-save on any change
        this.activeView.subscribe(v => this.update('activeView', v));
        this.layerVisibility.subscribe(v => this.update('layerVisibility', v));
        this.windowStates.subscribe(v => this.update('windowStates', v));
    }

    public static getInstance(): SettingsStore {
        if (!SettingsStore.instance) SettingsStore.instance = new SettingsStore();
        return SettingsStore.instance;
    }

    private load(): ClientSettings {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
            }
        } catch (e) {
            console.warn('Failed to load settings from localStorage', e);
        }
        return { ...DEFAULT_SETTINGS };
    }

    private update<K extends keyof ClientSettings>(key: K, value: ClientSettings[K]) {
        this.currentSettings[key] = value;
        this.save();
    }

    private save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentSettings));
        } catch (e) {
            console.warn('Failed to save settings to localStorage', e);
        }
    }

    public setWindowState(id: string, state: Partial<WindowState>) {
        const current = { ...this.windowStates.get() };
        current[id] = Object.assign({
            id,
            isOpen: true,
            x: 100,
            y: 100,
            width: 400,
            height: 300
        }, current[id], state);
        this.windowStates.set(current);
    }

    public setLayerVisibility(id: string, visible: boolean) {
        const current = { ...this.layerVisibility.get() };
        current[id] = visible;
        this.layerVisibility.set(current);
    }
}

export const settingsStore = SettingsStore.getInstance();
