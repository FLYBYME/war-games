import { ViewProvider, ViewLocation } from './ViewProvider';
import { IDE } from '../IDE';
import { EditorEvents } from '../editor/EditorManager';
import { EditorTabProps } from '../../ui-lib/panels/EditorTab';

/**
 * Registry mapping providers to UI location slots
 */
export class ViewRegistry {
    private ide: IDE;

    // Maps defined by [Location -> Maps of [Provider ID -> Provider]]
    private providers: Map<ViewLocation, Map<string, ViewProvider>> = new Map();

    // Track active DOM containers associated with providers
    private activeContainers: Map<string, HTMLElement> = new Map();

    // Track active event disposables for each provider container
    private activeDisposables: Map<string, { dispose: () => void }[]> = new Map();

    constructor(ide: IDE) {
        this.ide = ide;

        // Initialize location maps
        this.providers.set('left-panel', new Map());
        this.providers.set('right-panel', new Map());
        this.providers.set('center-panel', new Map());
        this.providers.set('bottom-panel', new Map());

        this.setupTabListeners();
    }

    private setupTabListeners() {
        // Listen for tabs being opened to check if they need a view provider
        this.ide.commands.on(EditorEvents.EDITOR_TAB_OPENED, async (data: { tabId: string, config: EditorTabProps }) => {
            const providerId = data.config.providerId;
            if (!providerId) return;

            // Attempt to resolve the view for this tab
            const contentPanel = this.ide.editor.getContentPanel(data.tabId);
            if (contentPanel) {
                await this.mountViewToContainer('center-panel', providerId, contentPanel);
            }
        });
    }

    private async mountViewToContainer(location: ViewLocation, providerId: string, targetContainer: HTMLElement) {
        const provider = this.getProvider(location, providerId);
        if (!provider) return;

        // Clear existing context
        targetContainer.innerHTML = '';

        const container = document.createElement('div');
        container.className = 'extension-view-container';
        container.setAttribute('data-provider-id', providerId);
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.overflow = 'auto';
        container.style.boxSizing = 'border-box';

        targetContainer.appendChild(container);

        // Prepare disposables
        const oldDisposables = this.activeDisposables.get(providerId);
        if (oldDisposables) {
            oldDisposables.forEach(d => d.dispose());
        }
        const disposables: { dispose: () => void }[] = [];
        this.activeDisposables.set(providerId, disposables);

        try {
            await provider.resolveView(container, disposables);
            this.activeContainers.set(providerId, container);
        } catch (error) {
            console.error(`ViewRegistry: Error rendering view "${providerId}"`, error);
            container.innerHTML = `<div style="padding: 10px; color: red;">Failed to render view: ${providerId}</div>`;
        }
    }

    /**
     * Register a new UI provider for a specific location
     * @param location Where the view should be mounted
     * @param provider The provider implementation
     */
    public registerProvider(location: ViewLocation, provider: ViewProvider): void {
        const locationMap = this.providers.get(location);
        if (!locationMap) {
            console.error(`ViewRegistry: Unknown location "${location}"`);
            return;
        }

        if (locationMap.has(provider.id)) {
            console.warn(`ViewRegistry: Provider "${provider.id}" is already registered in "${location}"`);
            return;
        }

        locationMap.set(provider.id, provider);
        this.ide.notifications?.setStatusMessage(`Registered View: ${provider.name} in ${location}`);
    }

    /**
     * Unregister a provider (usually called during extension deactivation)
     */
    public unregisterProvider(location: ViewLocation, providerId: string): void {
        const locationMap = this.providers.get(location);
        if (!locationMap) return;

        const provider = locationMap.get(providerId);
        if (provider) {
            if (provider.dispose) {
                provider.dispose();
            }
            locationMap.delete(providerId);

            // Clean up the active container if it exists
            const container = this.activeContainers.get(providerId);
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
            }
            this.activeContainers.delete(providerId);

            // Clean up any event listeners inside the view
            const disposables = this.activeDisposables.get(providerId);
            if (disposables) {
                disposables.forEach(d => d.dispose());
            }
            this.activeDisposables.delete(providerId);

            this.ide.notifications?.setStatusMessage(`Unregistered View: ${provider.name}`);
        }
    }

    /**
     * Retrieve a specific provider definition
     */
    public getProvider(location: ViewLocation, providerId: string): ViewProvider | undefined {
        return this.providers.get(location)?.get(providerId);
    }

    /**
     * Request the IDE to render a specific view provider.
     * This creates an atomic container div and delegates to the provider's resolveView.
     * @param location The target panel
     * @param providerId The ID of the registered provider
     */
    public async renderView(location: ViewLocation, providerId: string): Promise<void> {
        const provider = this.getProvider(location, providerId);
        if (!provider) {
            console.error(`ViewRegistry: Provider "${providerId}" not found in "${location}"`);
            return;
        }

        // 1. Locate the target DOM panel. 
        // In this architecture, panel IDs correspond exactly to the ViewLocation union types.
        let targetPanel: HTMLElement | null = document.getElementById(location);
        if (!targetPanel) {
            console.error(`ViewRegistry: Target panel DOM element "#${location}" not found.`);
            return;
        }

        // For sidebars and bottom panel, mount inside the designated content area
        if (location === 'left-panel' || location === 'right-panel') {
            const sidebarContent = targetPanel.querySelector('.sidebar-content') as HTMLElement;
            if (sidebarContent) {
                targetPanel = sidebarContent;
            }
        } else if (location === 'bottom-panel') {
            const bottomContent = targetPanel.querySelector('.bottom-panel-content') as HTMLElement;
            if (bottomContent) {
                targetPanel = bottomContent;
            }
        }

        console.log('ViewRegistry: Rendering view "' + providerId + '" in "' + location + '"');

        // 2. Clear out any existing active view in this panel if required.
        // For sidebars/bottom panel we typically replace. For center, we append a tab.
        // For simplicity in this base spec, we'll replace the inner content, 
        // preserving default handles.
        if (location !== 'center-panel') {
            // Hide all active containers in this location
            const allContainers = targetPanel.querySelectorAll('.extension-view-container');
            allContainers.forEach((el) => {
                (el as HTMLElement).style.display = 'none';
            });

            // Check if we already have a container for this provider
            let container = this.activeContainers.get(providerId);

            if (!container) {
                // Create a fresh isolated container
                container = document.createElement('div');
                container.className = 'extension-view-container';
                container.setAttribute('data-provider-id', providerId);
                container.style.width = '100%';
                container.style.height = '100%';
                container.style.display = 'flex';
                container.style.flexDirection = 'column';
                container.style.overflow = 'hidden';
                container.style.boxSizing = 'border-box';

                // Append it to the panel
                targetPanel.appendChild(container);

                // Prepare disposables
                const oldDisposables = this.activeDisposables.get(providerId);
                if (oldDisposables) {
                    oldDisposables.forEach(d => d.dispose());
                }
                const disposables: { dispose: () => void }[] = [];
                this.activeDisposables.set(providerId, disposables);

                // Allow the provider to render
                try {
                    await provider.resolveView(container, disposables);
                    this.activeContainers.set(providerId, container);
                } catch (error) {
                    console.error(`ViewRegistry: Error rendering view "${providerId}"`, error);
                    container.innerHTML = `<div style="padding: 10px; color: red;">Failed to render view: ${providerId}</div>`;
                }
            } else {
                // Container exists, just unhide it
                if (!container.parentElement) {
                    targetPanel.appendChild(container);
                }
                container.style.display = 'flex';

                if (provider.update) {
                    provider.update({});
                }
            }

            // Show the panel via the layout manager
            this.ide.layout.setPanelVisible(location, true);

            // Automatically update activity bar active state
            this.ide.activityBar.setActive(location, providerId);
        } else {
            // Center panel: open as a custom editor tab via EditorManager
            const provider = this.getProvider('center-panel', providerId);
            if (!provider) return;

            this.ide.editor.openTab({
                id: providerId,
                title: provider.name,
                providerId: providerId,
            });
            // The actual mounting happens via the EDITOR_TAB_OPENED listener
        }
    }
}
