/**
 * EntityExtension — Entity Inspector with subsystem tabs.
 *
 * Populates when an entity is selected on the Tactical Map.
 * Displays subsystem data using PropertyGrid, driven by SDK contract schemas.
 */

import { Extension, ExtensionContext } from '../core/extensions/Extension';
import { ViewProvider } from '../core/extensions/ViewProvider';
import * as uiLib from '../ui-lib';

/** Subsystem tab definitions — each maps to a contract domain. */
const SUBSYSTEM_TABS = [
    { id: 'overview', label: 'Overview', icon: 'fas fa-info-circle' },
    { id: 'kinematics', label: 'Kinematics', icon: 'fas fa-tachometer-alt' },
    { id: 'sensors', label: 'Sensors', icon: 'fas fa-satellite-dish' },
    { id: 'combat', label: 'Combat', icon: 'fas fa-crosshairs' },
    { id: 'nav', label: 'Navigation', icon: 'fas fa-route' },
    { id: 'logistics', label: 'Logistics', icon: 'fas fa-gas-pump' },
    { id: 'propulsion', label: 'Propulsion', icon: 'fas fa-fan' },
    { id: 'guidance', label: 'Guidance', icon: 'fas fa-bullseye' },
    { id: 'signature', label: 'Signature', icon: 'fas fa-wave-square' },
    { id: 'ew', label: 'EW', icon: 'fas fa-broadcast-tower' },
] as const;

export const EntityExtension: Extension = {
    id: 'wargames.entity',
    name: 'Entity Inspector',
    version: '1.0.0',

    activate(context: ExtensionContext) {
        const ide = context.ide;
        const client = ide.getClient();
        const selection = ide.selection;
        const matches = ide.matches;

        // ── Entity Inspector View (Right Sidebar) ────────────────────────────

        const inspectorProvider: ViewProvider = {
            id: 'entity.inspector',
            name: 'Entity Inspector',
            resolveView: (container, disposables) => {
                const root = new uiLib.Column({ padding: 'md', gap: 'md', fill: true });

                // Header with entity name and side badge
                const header = new uiLib.Row({
                    align: 'center',
                    justify: 'space-between'
                });
                
                header.getElement().style.paddingBottom = '4px';
                header.getElement().style.borderBottom = '1px solid var(--border)';

                const entityTitle = new uiLib.Heading({ text: 'No Selection', level: 4, transform: 'uppercase' });
                const sideBadge = new uiLib.ForceColorBadge({ side: 'observer' });
                sideBadge.getElement().style.display = 'none';

                header.appendChildren(entityTitle, sideBadge);
                root.appendChildren(header);

                const emptyState = new uiLib.EmptyStateView({
                    icon: 'fas fa-mouse-pointer',
                    title: 'No Selection',
                    description: 'Select an entity on the Tactical Map to inspect its subsystems.'
                });
                root.appendChildren(emptyState);

                // Tab container
                let activeTabId = 'overview';
                const tabBar = new uiLib.Row({
                    gap: 'xs'
                });
                
                tabBar.getElement().style.flexWrap = 'wrap';
                tabBar.getElement().style.paddingBottom = '4px';
                tabBar.getElement().style.borderBottom = '1px solid var(--border)';
                tabBar.getElement().style.display = 'none';

                // Content area with ScrollArea
                const contentArea = new uiLib.Column({ fill: true });
                const scrollArea = new uiLib.ScrollArea({ fill: true, children: [contentArea] });
                scrollArea.getElement().style.display = 'none';

                // Build tab buttons
                for (const tab of SUBSYSTEM_TABS) {
                    const tabBtn = new uiLib.Tab({
                        label: tab.label,
                        active: tab.id === activeTabId,
                        onClick: () => {
                            activeTabId = tab.id;
                            updateTabStyles();
                            void loadSubsystemData(tab.id);
                        }
                    });
                    tabBar.appendChildren(tabBtn);
                }

                const updateTabStyles = () => {
                    const tabs = tabBar.getChildren() as uiLib.Tab[];
                    tabs.forEach((t, i) => {
                        t.updateProps({ active: SUBSYSTEM_TABS[i].id === activeTabId });
                    });
                };

                // Load subsystem data for the selected entity
                const loadSubsystemData = async (subsystemId: string) => {
                    const matchId = matches.currentMatchId.get();
                    const entityId = selection.primaryId.get();
                    if (!matchId || !entityId) return;

                    contentArea.getElement().innerHTML = '';
                    const spinner = new uiLib.Spinner({ size: 'sm' });
                    contentArea.appendChildren(spinner);

                    try {
                        let data: unknown = null;

                        switch (subsystemId) {
                            case 'overview': {
                                data = await client.api.entity.get({ matchId, entityId });
                                break;
                            }
                            case 'kinematics': {
                                data = await client.api.kinematics.get({ matchId, entityId });
                                break;
                            }
                            case 'sensors': {
                                data = await client.api.sensor.list({ matchId, entityId });
                                break;
                            }
                            case 'combat': {
                                data = await client.api.combat.get({ matchId, entityId });
                                break;
                            }
                            case 'nav': {
                                data = await client.api.nav.list_waypoints({ matchId, entityId });
                                break;
                            }
                            case 'logistics': {
                                data = await client.api.logistics.get({ matchId, entityId });
                                break;
                            }
                            default: {
                                data = { message: `${subsystemId} subsystem data not yet wired` };
                                break;
                            }
                        }

                        contentArea.getElement().innerHTML = '';
                        
                        if (data) {
                            const jsonTree = new uiLib.JsonTree({
                                data,
                                expandDepth: 2,
                                label: subsystemId.toUpperCase()
                            });
                            contentArea.appendChildren(jsonTree);
                        } else {
                            contentArea.appendChildren(new uiLib.EmptyStateView({
                                title: 'No Data',
                                description: `No ${subsystemId} data available for this entity.`,
                                icon: 'fas fa-info-circle'
                            }));
                        }

                    } catch (err) {
                        contentArea.getElement().innerHTML = '';
                        contentArea.appendChildren(new uiLib.Alert({
                            message: `Failed to load ${subsystemId} data: ${err instanceof Error ? err.message : String(err)}`,
                            variant: 'error'
                        }));
                    }
                };

                root.appendChildren(tabBar, scrollArea);
                root.mount(container);

                // React to selection changes
                const unsub = selection.primaryId.subscribe(async (entityId: string | null) => {
                    if (entityId) {
                        entityTitle.updateProps({ text: `Entity: ${entityId.substring(0, 8)}...` });
                        emptyState.getElement().style.display = 'none';
                        tabBar.getElement().style.display = 'flex';
                        scrollArea.getElement().style.display = 'block';
                        
                        // Update side badge
                        const matchId = matches.currentMatchId.get();
                        if (matchId) {
                            try {
                                const entity = await client.api.entity.get({ matchId, entityId });
                                sideBadge.updateProps({ side: entity.side as any });
                                sideBadge.getElement().style.display = 'flex';
                            } catch (e) {
                                sideBadge.getElement().style.display = 'none';
                            }
                        }

                        activeTabId = 'overview';
                        updateTabStyles();
                        void loadSubsystemData('overview');
                    } else {
                        entityTitle.updateProps({ text: 'No Selection' });
                        sideBadge.getElement().style.display = 'none';
                        emptyState.getElement().style.display = 'flex';
                        tabBar.getElement().style.display = 'none';
                        scrollArea.getElement().style.display = 'none';
                        contentArea.getElement().innerHTML = '';
                    }
                });
                disposables.push({ dispose: unsub });
            }
        };

        ide.views.registerProvider('right-panel', inspectorProvider);

        ide.activityBar.registerItem({
            id: 'entity.inspector',
            location: 'right-panel',
            icon: 'fas fa-search',
            title: 'Entity Inspector',
            order: 1
        });

        // ── Entity Commands ──────────────────────────────────────────────────

        ide.commands.register({
            id: 'entity.delete',
            label: 'Delete Selected Entity',
            keybinding: 'Delete',
            handler: async () => {
                const matchId = matches.currentMatchId.get();
                const entityId = selection.primaryId.get();
                if (!matchId || !entityId) {
                    ide.notifications?.notify('No entity selected', 'warning');
                    return;
                }
                try {
                    await client.api.entity.delete({ matchId, entityId });
                    selection.clear();
                    ide.notifications?.notify(`Entity ${entityId.substring(0, 8)} deleted`, 'info');
                } catch (err) {
                    console.error('entity.delete failed', err);
                }
            }
        });

        // Open inspector on first load
        void ide.views.renderView('right-panel', 'entity.inspector');

        console.log('✅ EntityExtension activated');
    }
};
