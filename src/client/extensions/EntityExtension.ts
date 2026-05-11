/**
 * EntityExtension — In-depth subsystem inspector for simulation actors.
 */

import { Extension, ExtensionContext } from '../core/extensions/Extension';
import { ViewProvider } from '../core/extensions/ViewProvider';
import { MatchServiceEvents } from '../core/services/MatchService';
import { SelectionEvents } from '../core/services/SelectionService';
import * as uiLib from '../ui-lib';
import { MapUnit } from './map/MapState';

interface TabDefinition {
    id: string;
    label: string;
    icon: string;
}

const SUBSYSTEM_TABS: TabDefinition[] = [
    { id: 'overview', label: 'OVERVIEW', icon: 'fas fa-info-circle' },
    { id: 'sensors', label: 'SENSORS', icon: 'fas fa-broadcast-tower' },
    { id: 'combat', label: 'WEAPONS', icon: 'fas fa-crosshairs' },
    { id: 'logistics', label: 'LOGISTICS', icon: 'fas fa-gas-pump' },
    { id: 'mission', label: 'MISSION', icon: 'fas fa-tasks' },
];

export const EntityExtension: Extension = {
    id: 'wargames.entity',
    name: 'Entity Inspector',
    version: '1.0.0',

    activate(context: ExtensionContext) {
        const ide = context.ide;
        const client = ide.getClient();

        const entityViewProvider: ViewProvider = {
            id: 'entity.inspector',
            name: 'Entity Inspector',
            resolveView: (container, disposables) => {
                const root = new uiLib.Column({ padding: 'md', gap: 'md', fill: true });

                // Header with entity name and side badge
                const header = new uiLib.Row({
                    align: 'center',
                    justify: 'space-between'
                });

                const headerEl = header.getElement();
                headerEl.style.paddingBottom = '4px';
                headerEl.style.borderBottom = '1px solid var(--border)';

                const entityTitle = new uiLib.Heading({ text: 'No Selection', level: 4 });
                const sideBadge = new uiLib.Badge({ count: 'NEUTRAL', variant: 'accent' });
                sideBadge.getElement().style.display = 'none';

                header.appendChildren(entityTitle, sideBadge);
                root.appendChildren(header);

                const emptyState = new uiLib.Alert({
                    message: 'Select an entity on the Tactical Map to inspect its subsystems.',
                    variant: 'info'
                });
                root.appendChildren(emptyState);

                // Tab container
                let activeTabId = 'overview';
                const tabBar = new uiLib.Row({
                    gap: 'xs'
                });
                
                const tabBarEl = tabBar.getElement();
                tabBarEl.style.flexWrap = 'wrap';
                tabBarEl.style.paddingBottom = '4px';
                tabBarEl.style.borderBottom = '1px solid var(--border)';
                tabBarEl.style.display = 'none';

                // Content area with ScrollArea
                const contentArea = new uiLib.Column({ fill: true });
                const scrollArea = new uiLib.ScrollArea({ fill: true, children: [contentArea] });
                scrollArea.getElement().style.display = 'none';

                // Build tab buttons
                for (const tab of SUBSYSTEM_TABS) {
                    const tabBtn = new uiLib.Button({
                        label: tab.label,
                        variant: tab.id === activeTabId ? 'primary' : 'ghost',
                        size: 'sm',
                        onClick: () => {
                            activeTabId = tab.id;
                            updateTabStyles();
                            void loadSubsystemData(tab.id);
                        }
                    });
                    tabBar.appendChildren(tabBtn);
                }

                const updateTabStyles = () => {
                    const tabs = tabBar.getChildren() as uiLib.Button[];
                    tabs.forEach((t, i) => {
                        t.updateProps({ variant: SUBSYSTEM_TABS[i].id === activeTabId ? 'primary' : 'ghost' });
                    });
                };

                const loadSubsystemData = async (tabId: string) => {
                    const entityId = ide.selection.primaryId.get();
                    const matchId = ide.matches.currentMatchId.get();
                    if (!entityId || !matchId) return;

                    contentArea.getElement().innerHTML = `<div style="padding: 20px; color: var(--text-muted)">Loading ${tabId}...</div>`;

                    try {
                        if (tabId === 'overview') {
                            const data = await client.api.entity.get({ matchId, entityId });
                            contentArea.getElement().innerHTML = '';
                            
                            // 1. Gauges for kinematic data
                            const gauges = new uiLib.GaugeCluster({
                                gauges: [
                                    { label: 'Speed', value: data.speedKts, max: 1200, unit: 'KTS', color: 'var(--accent)' },
                                    { label: 'Heading', value: data.heading, max: 360, unit: '°', color: 'var(--blue-force)' },
                                    { label: 'Altitude', value: data.position.z, max: 20000, unit: 'M', color: 'var(--success)' },
                                ],
                                size: 'md'
                            });
                            contentArea.appendChildren(gauges);

                            // 2. Identification Section
                            const idSection = new uiLib.Column({ padding: 'none', gap: 'xs' });
                            idSection.getElement().style.marginTop = '16px';
                            
                            const idTitle = new uiLib.Heading({ text: 'IDENTIFICATION', level: 6 });
                            idTitle.getElement().style.color = 'var(--text-muted)';
                            idSection.appendChildren(idTitle);

                            const idProps = [
                                { label: 'Callsign', value: data.id },
                                { label: 'Category', value: data.category?.toUpperCase() || 'UNKNOWN' },
                                { label: 'Force', value: data.side.toUpperCase() },
                            ];

                            idProps.forEach(p => {
                                const row = new uiLib.Row({ justify: 'space-between', padding: 'xs' });
                                row.appendChildren(
                                    new uiLib.Text({ text: p.label, variant: 'muted', size: 'xs' }),
                                    new uiLib.Text({ text: p.value || '', weight: 'bold', size: 'xs', monospace: true })
                                );
                                idSection.appendChildren(row);
                            });
                            contentArea.appendChildren(idSection);

                            // 3. Position Section with Vector3Field
                            const posSection = new uiLib.Column({ padding: 'none', gap: 'sm' });
                            posSection.getElement().style.marginTop = '16px';
                            
                            const posTitle = new uiLib.Heading({ text: 'SPATIAL TELEMETRY', level: 6 });
                            posTitle.getElement().style.color = 'var(--text-muted)';
                            posSection.appendChildren(posTitle);

                            const posField = new uiLib.Vector3Field({
                                value: { x: data.position.x, y: data.position.y, z: data.position.z },
                                labels: { x: 'LAT', y: 'LON', z: 'ALT' },
                                disabled: true
                            });
                            posSection.appendChildren(posField);
                            contentArea.appendChildren(posSection);

                        } else {
                            contentArea.getElement().innerHTML = `<div style="padding: 20px; color: var(--text-muted); font-size: 11px; text-align: center;">${tabId.toUpperCase()} SUBSYSTEM DATA NOT INITIALIZED</div>`;
                        }
                    } catch (err) {
                        contentArea.getElement().innerHTML = `<div style="color: var(--status-crit); padding: 20px; text-align: center;">TELEMETRY FAULT: ${err instanceof Error ? err.message : 'Unknown'}</div>`;
                    }
                };

                // Selection Sync
                const unsubSelect = ide.selection.primaryId.subscribe((id) => {
                    if (id) {
                        entityTitle.updateProps({ text: id.toUpperCase() });
                        emptyState.getElement().style.display = 'none';
                        tabBarEl.style.display = 'flex';
                        scrollArea.getElement().style.display = 'block';
                        void loadSubsystemData(activeTabId);
                    } else {
                        entityTitle.updateProps({ text: 'No Selection' });
                        emptyState.getElement().style.display = 'block';
                        tabBarEl.style.display = 'none';
                        scrollArea.getElement().style.display = 'none';
                    }
                });
                disposables.push({ dispose: unsubSelect });

                root.appendChildren(tabBar, scrollArea);
                root.mount(container);
            }
        };

        ide.views.registerProvider('right-panel', entityViewProvider);

        ide.activityBar.registerItem({
            id: 'entity.inspector',
            location: 'right-panel',
            icon: 'fas fa-info-circle',
            title: 'Inspector',
            order: 10
        });

        console.log('✅ EntityExtension activated');
    }
};
