import { IDE } from '../IDE';

/**
 * The context provided to an extension when it is activated.
 * Used to safely interact with the IDE and track disposable resources.
 */
export interface ExtensionContext {
    ide: IDE;
    subscriptions: { dispose: () => void }[]; // Array of cleanup functions
    /**
     * Register a configuration node for this extension.
     * The node will be automatically unregistered when the extension is deactivated.
     */
    registerConfiguration: (node: import('../configuration/ConfigurationRegistry').ConfigurationNode) => void;
}

/**
 * The contract that every extension must fulfill.
 */
export interface Extension {
    id: string;
    name: string;
    version: string;

    /**
     * Called when the extension is activated.
     */
    activate(context: ExtensionContext): void | Promise<void>;

    /**
     * Called when the extension is deactivated (e.g., when the IDE shuts down or extension is disabled).
     */
    deactivate?(): void | Promise<void>;
}
