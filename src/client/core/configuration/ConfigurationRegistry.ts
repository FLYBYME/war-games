/**
 * ConfigurationRegistry - Schema definition store for IDE settings.
 * The core IDE and extensions declare what settings exist,
 * their data types, default values, and descriptions.
 */

export type ConfigurationType = 'string' | 'number' | 'boolean' | 'enum';

export interface ConfigurationProperty<T = any> {
    type: ConfigurationType;
    default: T;
    description: string;
    enum?: string[];       // For 'enum' type — dropdown options
    min?: number;          // For 'number' type — minimum value
    max?: number;          // For 'number' type — maximum value
    pattern?: string;      // For 'string' type — regex pattern for validation
}

export const ConfigurationRegistryEvents = {
    SCHEMA_CHANGED: 'configuration.schema.changed',
};

export interface ConfigurationNode {
    id: string;       // e.g., 'editor', 'files', 'terminal'
    title: string;    // Human-readable section title
    properties: Record<string, ConfigurationProperty>;
}

export class ConfigurationRegistry {
    private nodes: Map<string, ConfigurationNode> = new Map();

    /**
     * Register a configuration node (a group of related settings).
     * Called by the core IDE and by extensions in their activate() method.
     */
    public registerConfiguration(node: ConfigurationNode): void {
        if (this.nodes.has(node.id)) {
            // Merge properties into existing node
            const existing = this.nodes.get(node.id)!;
            existing.properties = { ...existing.properties, ...node.properties };
        } else {
            this.nodes.set(node.id, { ...node });
        }
    }

    /**
     * Get a flat map of all default values: { 'editor.fontSize': 14, ... }
     */
    public getDefaults(): Record<string, any> {
        const defaults: Record<string, any> = {};
        for (const node of this.nodes.values()) {
            for (const [key, prop] of Object.entries(node.properties)) {
                defaults[key] = prop.default;
            }
        }
        return defaults;
    }

    /**
     * Get the property schema for a specific setting key
     */
    public getProperty(key: string): ConfigurationProperty | undefined {
        for (const node of this.nodes.values()) {
            if (key in node.properties) {
                return node.properties[key];
            }
        }
        return undefined;
    }

    /**
     * Get all registered configuration nodes
     */
    public getAll(): ConfigurationNode[] {
        return Array.from(this.nodes.values());
    }

    /**
     * Get a specific configuration node by ID
     */
    public getNode(id: string): ConfigurationNode | undefined {
        return this.nodes.get(id);
    }

    /**
     * Unregister a configuration node (e.g., when an extension deactivates)
     */
    public unregisterConfiguration(nodeId: string): void {
        this.nodes.delete(nodeId);
    }

    /**
     * Validate a value against the schema for a given key.
     * Returns null if valid, or an error string if invalid.
     */
    public validate(key: string, value: any): string | null {
        const prop = this.getProperty(key);
        if (!prop) {
            return null; // Unknown keys pass through (no schema to enforce)
        }

        // Type checking
        switch (prop.type) {
            case 'boolean':
                if (typeof value !== 'boolean') {
                    return `"${key}" must be a boolean.`;
                }
                break;
            case 'number':
                if (typeof value !== 'number' || isNaN(value)) {
                    return `"${key}" must be a number.`;
                }
                if (prop.min !== undefined && value < prop.min) {
                    return `"${key}" must be at least ${prop.min}.`;
                }
                if (prop.max !== undefined && value > prop.max) {
                    return `"${key}" must be at most ${prop.max}.`;
                }
                break;
            case 'string':
                if (typeof value !== 'string') {
                    return `"${key}" must be a string.`;
                }
                if (prop.pattern) {
                    const regex = new RegExp(prop.pattern);
                    if (!regex.test(value)) {
                        return `"${key}" does not match the required pattern.`;
                    }
                }
                break;
            case 'enum':
                if (!prop.enum || !prop.enum.includes(value)) {
                    return `"${key}" must be one of: ${(prop.enum || []).join(', ')}.`;
                }
                break;
        }

        return null;
    }
}
