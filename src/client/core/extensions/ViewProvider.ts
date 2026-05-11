import { ExtensionContext } from './Extension';

export type ViewLocation = 'left-panel' | 'right-panel' | 'center-panel' | 'bottom-panel';

/**
 * Interface that UI Providers must implement to render custom UI.
 */
export interface ViewProvider {
    /**
     * Unique identifier for this view
     */
    id: string;

    /**
     * Human-readable name for this view
     */
    name: string;

    /**
     * Called when the IDE is ready to render the view.
     * The provider should append its UI to the provided container element.
     * The container's lifecycle is managed by the IDE.
     * A disposables array is provided for the extension to push event listener cleanup functions,
     * ensuring they are properly destroyed when the view is unmounted.
     * @param container An empty DOM element where the UI should be mounted
     * @param disposables Array to push cleanup handlers (e.g. for window/document events)
     */
    resolveView(container: HTMLElement, disposables: { dispose: () => void }[]): void | Promise<void>;

    /**
     * Optional: Called by the IDE when context changes
     * @param state The new context state
     */
    update?(state: any): void;

    /**
     * Optional: Called when the view is closed or the extension is deactivated.
     * Providers should clean up event listeners to prevent memory leaks.
     */
    dispose?(): void;
}
