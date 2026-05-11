import { Extension, ExtensionContext } from './Extension';
import { IDE } from '../IDE';

export class ExtensionManager {
    private ide: IDE;
    private extensions: Map<string, Extension> = new Map();
    private activeContexts: Map<string, ExtensionContext> = new Map();

    constructor(ide: IDE) {
        this.ide = ide;
    }

    /**
     * Register a new extension with the IDE.
     */
    public register(extension: Extension): void {
        if (this.extensions.has(extension.id)) {
            console.warn(`ExtensionManager: Extension "${extension.id}" is already registered.`);
            return;
        }
        this.extensions.set(extension.id, extension);
        this.ide.notifications?.setStatusMessage(`Registered extension: ${extension.name} v${extension.version}`);
    }

    /**
     * Dynamically fetch and evaluate an extension bundle from a URL.
     * The bundle must export (default or named) an object implementing the Extension interface.
     */
    public async loadFromUrl(url: string): Promise<Extension> {
        let fullUrl = url;
        if (url.startsWith('/')) {
            const apiBase = this.ide.settings.get<string>('core.apiBase');
            // Resolve relative to the server root (remove /api suffix)
            const root = apiBase.replace(/\/api$/, '');
            fullUrl = `${root}${url}`;
        }

        this.ide.notifications?.setStatusMessage(`Loading extension from ${fullUrl}...`);
        try {
            // Append timestamp to bust cache for hot-reloading
            const importUrl = fullUrl.includes('?') ? `${fullUrl}&t=${Date.now()}` : `${fullUrl}?t=${Date.now()}`;
            const module = await import(/* @vite-ignore */ /* webpackIgnore: true */ importUrl);

            // Auto-discover the extension object
            let extData: Extension | undefined;
            if (module.default && typeof module.default.id === 'string' && typeof module.default.activate === 'function') {
                extData = module.default;
            } else {
                for (const key of Object.keys(module)) {
                    if (module[key] && typeof module[key].id === 'string' && typeof module[key].activate === 'function') {
                        extData = module[key];
                        break;
                    }
                }
            }

            if (!extData) {
                throw new Error(`Module loaded from ${url} does not export a valid Extension interface.`);
            }

            // Register the parsed extension
            // We can even forcefully instantiate it if it's a class instead of an object:
            let extInstance = typeof extData === 'function' ? new (extData as any)() : extData;

            this.register(extInstance);
            this.ide.notifications?.setStatusMessage(`Loaded extension dynamically: ${extInstance.name}`);
            return extInstance;

        } catch (error: any) {
            console.error(`❌ Failed to load extension from ${url}:`, error);
            this.ide.notifications?.notify(`Extension load failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Activate all registered extensions.
     */
    public async activateAll(): Promise<void> {
        for (const id of this.extensions.keys()) {
            await this.activate(id);
        }
    }

    /**
     * Activate a specific extension by ID.
     */
    public async activate(id: string): Promise<void> {
        const extension = this.extensions.get(id);
        if (!extension || this.activeContexts.has(id)) return;

        try {
            const context: ExtensionContext = {
                ide: this.ide,
                subscriptions: [],
                registerConfiguration: (node) => {
                    this.ide.configurationRegistry.registerConfiguration(node);
                    context.subscriptions.push({
                        dispose: () => this.ide.configurationRegistry.unregisterConfiguration(node.id),
                    });
                },
            };

            await extension.activate(context);
            this.activeContexts.set(id, context);
            this.ide.notifications?.setStatusMessage(`Activated extension: ${extension.name}`);
        } catch (error) {
            console.error(`❌ Failed to activate extension "${id}":`, error);
        }
    }

    /**
     * Deactivate a specific extension and clean up its resources.
     */
    public async deactivate(id: string): Promise<void> {
        const extension = this.extensions.get(id);
        const context = this.activeContexts.get(id);

        if (!extension || !context) return;

        try {
            if (extension.deactivate) {
                await extension.deactivate();
            }

            // Clean up subscriptions (commands, events, etc.)
            context.subscriptions.forEach(sub => sub.dispose());
            this.activeContexts.delete(id);
            this.extensions.delete(id); // Unregister it so it can be re-imported
            this.ide.notifications?.setStatusMessage(`Deactivated extension: ${extension.name}`);
        } catch (error) {
            console.error(`❌ Error deactivating extension "${id}":`, error);
        }
    }
}
