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

                // Header with entity name
                const headerRow = document.createElement('div');
                headerRow.style.display = 'flex';
                headerRow.style.alignItems = 'center';
                headerRow.style.justifyContent = 'space-between';

                const entityTitle = new uiLib.Heading({ text: 'No Entity Selected', level: 4, transform: 'uppercase' });

                const emptyState = new uiLib.EmptyStateView({
                    icon: 'fas fa-mouse-pointer',
                    title: 'No Selection',
                    description: 'Select an entity on the Tactical Map to inspect its subsystems.'
                });

                // Tab container
                const tabBar = document.createElement('div');
                tabBar.style.display = 'flex';
                tabBar.style.flexWrap = 'wrap';
                tabBar.style.gap = '2px';
                tabBar.style.borderBottom = '1px solid var(--border, #3e3e42)';
                tabBar.style.paddingBottom = '4px';
                tabBar.style.display = 'none'; // hidden until entity selected

                // Content area for the active subsystem
                const contentArea = document.createElement('div');
                contentArea.style.flex = '1';
                contentArea.style.overflow = 'auto';

                let activeTabId = 'overview';

                // Build tab buttons
                for (const tab of SUBSYSTEM_TABS) {
                    const tabBtn = document.createElement('button');
                    tabBtn.textContent = tab.label;
                    tabBtn.title = tab.label;
                    tabBtn.dataset['tabId'] = tab.id;
                    Object.assign(tabBtn.style, {
                        padding: '4px 8px',
                        fontSize: '10px',
                        background: 'transparent',
                        color: 'var(--text-muted, #888)',
                        border: 'none',
                        borderBottom: '2px solid transparent',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s ease',
                    });
                    tabBtn.addEventListener('mouseenter', () => {
                        tabBtn.style.color = 'var(--text-main, #ccc)';
                    });
                    tabBtn.addEventListener('mouseleave', () => {
                        if (activeTabId !== tab.id) {
                            tabBtn.style.color = 'var(--text-muted, #888)';
                        }
                    });
                    tabBtn.addEventListener('click', () => {
                        activeTabId = tab.id;
                        updateTabStyles();
                        void loadSubsystemData(tab.id);
                    });
                    tabBar.appendChild(tabBtn);
                }

                const updateTabStyles = () => {
                    const buttons = tabBar.querySelectorAll('button');
                    buttons.forEach((btn) => {
                        const isActive = btn.dataset['tabId'] === activeTabId;
                        btn.style.borderBottomColor = isActive ? 'var(--accent, #007acc)' : 'transparent';
                        btn.style.color = isActive ? 'var(--text-main, #ccc)' : 'var(--text-muted, #888)';
                        btn.style.fontWeight = isActive ? '600' : '400';
                    });
                };

                // Load subsystem data for the selected entity
                const loadSubsystemData = async (subsystemId: string) => {
                    const matchId = matches.currentMatchId.get();
                    const entityId = selection.primaryId.get();
                    if (!matchId || !entityId) return;

                    contentArea.innerHTML = '';
                    const spinner = new uiLib.Spinner({ size: 'sm' });
                    contentArea.appendChild(spinner.getElement());

                    try {
                        let data: Record<string, unknown> = {};

                        switch (subsystemId) {
                            case 'overview': {
                                const entity = await client.api.entity.get({ matchId, entityId });
                                data = entity as unknown as Record<string, unknown>;
                                break;
                            }
                            case 'kinematics': {
                                const kin = await client.api.kinematics.get({ matchId, entityId });
                                data = kin as unknown as Record<string, unknown>;
                                break;
                            }
                            case 'sensors': {
                                const sensors = await client.api.sensor.list({ matchId, entityId });
                                data = sensors as unknown as Record<string, unknown>;
                                break;
                            }
                            case 'combat': {
                                const combat = await client.api.combat.get({ matchId, entityId });
                                data = combat as unknown as Record<string, unknown>;
                                break;
                            }
                            case 'nav': {
                                const nav = await client.api.nav.list_waypoints({ matchId, entityId });
                                data = nav as unknown as Record<string, unknown>;
                                break;
                            }
                            case 'logistics': {
                                const log = await client.api.logistics.get({ matchId, entityId });
                                data = log as unknown as Record<string, unknown>;
                                break;
                            }
                            default: {
                                data = { message: `${subsystemId} subsystem data not yet wired` };
                                break;
                            }
                        }

                        contentArea.innerHTML = '';
                        const grid = new uiLib.PropertyGrid({
                            items: Object.entries(data).map(([key, value]) => ({
                                label: key,
                                control: new uiLib.Text({ 
                                    text: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '—'),
                                    size: 'sm'
                                }).getElement()
                            }))
                        });
                        grid.mount(contentArea);

                    } catch (err) {
                        contentArea.innerHTML = '';
                        const errorAlert = new uiLib.Alert({
                            message: `Failed to load ${subsystemId} data: ${err instanceof Error ? err.message : String(err)}`,
                            variant: 'error'
                        });
                        errorAlert.mount(contentArea);
                    }
                };

                // Assemble the view
                root.getElement().appendChild(entityTitle.getElement());
                root.getElement().appendChild(emptyState.getElement());
                root.getElement().appendChild(tabBar);
                root.getElement().appendChild(contentArea);
                root.mount(container);

                // React to selection changes
                const unsub = selection.primaryId.subscribe((entityId: string | null) => {
                    if (entityId) {
                        entityTitle.updateProps({ text: `Entity: ${entityId.substring(0, 8)}...` });
                        emptyState.getElement().style.display = 'none';
                        tabBar.style.display = 'flex';
                        activeTabId = 'overview';
                        updateTabStyles();
                        void loadSubsystemData('overview');
                    } else {
                        entityTitle.updateProps({ text: 'No Entity Selected' });
                        emptyState.getElement().style.display = 'flex';
                        tabBar.style.display = 'none';
                        contentArea.innerHTML = '';
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
