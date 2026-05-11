/**
 * ConfigurationService - Runtime settings engine.
 * Manages user overrides, merges them with schema defaults,
 * handles read/write, and emits events when settings change.
 */

import { IDE } from '../IDE';
import { ConfigurationRegistry } from './ConfigurationRegistry';

export const ConfigurationEvents = {
    CHANGED: 'configuration.changed',
};

export class ConfigurationService {
    private ide: IDE;
    private registry: ConfigurationRegistry;
    private userSettings: Record<string, any> = {};
    private readonly STORAGE_KEY = 'ide-settings-v1';

    constructor(ide: IDE, registry: ConfigurationRegistry) {
        this.ide = ide;
        this.registry = registry;
        this.load();
    }

    /**
     * Get a setting value.
     * Priority: user override → schema default → undefined.
     * Supports dot-notation: exact match first, then nested traversal.
     */
    public get<T>(key: string): T {
        // Exact match first (flat store)
        if (key in this.userSettings) {
            return this.userSettings[key] as T;
        }
        const defaults = this.registry.getDefaults();
        if (key in defaults) {
            return defaults[key] as T;
        }

        // Dot-notation traversal on the nested resolved tree
        const resolved = { ...defaults, ...this.userSettings };
        const parts = key.split('.');
        let current: any = resolved;
        for (const part of parts) {
            if (current === null || current === undefined || typeof current !== 'object') {
                return undefined as T;
            }
            current = current[part];
        }
        return current as T;
    }

    /**
     * Get a setting value with an explicit fallback
     */
    public getWithDefault<T>(key: string, fallback: T): T {
        const value = this.get<T>(key);
        return value !== undefined ? value : fallback;
    }

    /**
     * Update a setting and notify subscribers via EventBus.
     * Validates against schema before persisting.
     */
    public async update(key: string, value: any): Promise<void> {
        const error = this.registry.validate(key, value);
        if (error) {
            throw new Error(error);
        }

        const oldValue = this.get(key);
        if (oldValue === value) return;

        this.userSettings[key] = value;
        this.save();

        this.ide.commands.emit(ConfigurationEvents.CHANGED, {
            key,
            value,
            oldValue,
        });
    }

    /**
     * Check whether a value is valid for a given key without updating.
     * Returns null if valid, or an error message string.
     */
    public getValidationError(key: string, value: any): string | null {
        return this.registry.validate(key, value);
    }

    /**
     * Reset a single setting back to its default
     */
    public async reset(key: string): Promise<void> {
        if (key in this.userSettings) {
            delete this.userSettings[key];
            this.save();

            const defaults = this.registry.getDefaults();
            this.ide.commands.emit(ConfigurationEvents.CHANGED, {
                key,
                value: defaults[key],
                oldValue: this.userSettings[key],
            });
        }
    }

    /**
     * Reset all settings to defaults
     */
    public async resetAll(): Promise<void> {
        this.userSettings = {};
        this.save();
    }

    /**
     * Get all user overrides (useful for exporting settings)
     */
    public getUserSettings(): Record<string, any> {
        return { ...this.userSettings };
    }

    /**
     * Get the fully resolved settings (defaults merged with user overrides).
     * Returns a nested object tree built from dot-notation keys.
     * E.g., { 'editor.fontSize': 14 } becomes { editor: { fontSize: 14 } }
     */
    public getResolved(): Record<string, any> {
        const flat = { ...this.registry.getDefaults(), ...this.userSettings };
        return this.buildNestedTree(flat);
    }

    /**
     * Get the flat resolved settings (no nesting)
     */
    public getResolvedFlat(): Record<string, any> {
        return { ...this.registry.getDefaults(), ...this.userSettings };
    }

    /**
     * Build a nested object tree from a flat dot-notation map.
     */
    private buildNestedTree(flat: Record<string, any>): Record<string, any> {
        const tree: Record<string, any> = {};
        for (const [key, value] of Object.entries(flat)) {
            const parts = key.split('.');
            let current = tree;
            for (let i = 0; i < parts.length - 1; i++) {
                if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
                    current[parts[i]] = {};
                }
                current = current[parts[i]];
            }
            current[parts[parts.length - 1]] = value;
        }
        return tree;
    }

    /**
     * Load user settings from localStorage
     */
    private load(): void {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                this.userSettings = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('ConfigurationService: Failed to load settings', e);
            this.userSettings = {};
        }
    }

    /**
     * Persist user settings to localStorage
     */
    private save(): void {
        try {
            localStorage.setItem(
                this.STORAGE_KEY,
                JSON.stringify(this.userSettings)
            );
        } catch (e) {
            console.warn('ConfigurationService: Failed to save settings', e);
        }
    }
}
