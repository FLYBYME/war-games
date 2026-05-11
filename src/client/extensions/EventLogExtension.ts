/**
 * EventLogExtension — Live simulation event stream viewer.
 *
 * Subscribes to SimStreamService and displays a chronological,
 * filterable list of simulation events (entity spawned, weapon fired, etc.).
 */

import { Extension, ExtensionContext } from '../core/extensions/Extension';
import { ViewProvider } from '../core/extensions/ViewProvider';
import { MatchServiceEvents } from '../core/services/MatchService';
import { SimulationEvent } from '@sdk/contracts/domain/events.schema';
import * as uiLib from '../ui-lib';

/** Color mapping for event types */
const EVENT_COLORS: Record<string, { variant: 'accent' | 'error' | 'warning' | 'success'; icon: string }> = {
    'EntitySpawned': { variant: 'success', icon: 'fas fa-plus-circle' },
    'EntityDestroyed': { variant: 'error', icon: 'fas fa-skull-crossbones' },
    'WeaponFired': { variant: 'warning', icon: 'fas fa-crosshairs' },
    'DamageDealt': { variant: 'error', icon: 'fas fa-bolt' },
    'SimulationSpeedChanged': { variant: 'accent', icon: 'fas fa-tachometer-alt' },
    'Detection': { variant: 'accent', icon: 'fas fa-satellite-dish' },
    'MissionStatusChanged': { variant: 'success', icon: 'fas fa-tasks' },
};

const MAX_LOG_ENTRIES = 500;

export const EventLogExtension: Extension = {
    id: 'wargames.event-log',
    name: 'Event Log',
    version: '1.0.0',

    activate(context: ExtensionContext) {
        const ide = context.ide;

        // Shared log buffer
        let logEntries: SimulationEvent[] = [];
        let filterText = '';
        let listContainer: HTMLElement | null = null;
        let countBadge: uiLib.Badge | null = null;

        const eventLogProvider: ViewProvider = {
            id: 'event-log.view',
            name: 'Event Log',
            resolveView: (container, disposables) => {
                const root = new uiLib.Column({ padding: 'sm', gap: 'sm', fill: true });

                // Header bar
                const headerRow = new uiLib.Row({ align: 'center', gap: 'sm' });

                const title = new uiLib.Heading({ text: 'EVENT LOG', level: 4 });
                countBadge = new uiLib.Badge({ count: '0', variant: 'accent', size: 'sm' });
                
                const clearBtn = new uiLib.Button({
                    label: 'Clear',
                    icon: 'fas fa-trash',
                    variant: 'ghost',
                    size: 'sm',
                    onClick: () => {
                        logEntries = [];
                        renderLog();
                    }
                });

                headerRow.appendChildren(title, countBadge, new uiLib.Spacer(), clearBtn);
                root.appendChildren(headerRow);

                // Filter
                const filter = new uiLib.SearchInput({
                    placeholder: 'Filter events...',
                    onSearch: (text: string) => {
                        filterText = text.toLowerCase();
                        renderLog();
                    }
                });
                root.appendChildren(filter);

                // Scrollable log list
                const listRoot = new uiLib.Column({ gap: 'none' });
                const scrollArea = new uiLib.ScrollArea({ fill: true, children: [listRoot] });

                listContainer = listRoot.getElement();
                root.appendChildren(scrollArea);
                root.mount(container);

                // Subscribe to stream when a match is active
                const matchId = ide.matches.currentMatchId.get();
                if (matchId) {
                    subscribeToStream(matchId, disposables);
                }

                // Listen for match changes
                const subActivated = ide.commands.on(MatchServiceEvents.MATCH_ACTIVATED, (data: unknown) => {
                    const payload = data as { matchId: string };
                    logEntries = [];
                    renderLog();
                    subscribeToStream(payload.matchId, disposables);
                });
                disposables.push({ dispose: () => ide.commands.off(subActivated) });

                const subDeactivated = ide.commands.on(MatchServiceEvents.MATCH_DEACTIVATED, () => {
                    logEntries = [];
                    renderLog();
                });
                disposables.push({ dispose: () => ide.commands.off(subDeactivated) });
            }
        };

        const subscribeToStream = (matchId: string, disposables: { dispose: () => void }[]) => {
            const unsub = ide.stream.subscribe(matchId, (event: SimulationEvent) => {
                // Filter out high-frequency UI sync events from the log viewer
                if (event.type === 'ViewStateUpdated') return;

                logEntries.push(event);
                // Cap the buffer
                if (logEntries.length > MAX_LOG_ENTRIES) {
                    logEntries = logEntries.slice(-MAX_LOG_ENTRIES);
                }
                renderLog();
            });
            disposables.push({ dispose: unsub });
        };

        const renderLog = () => {
            if (!listContainer) return;

            const filtered = filterText
                ? logEntries.filter(e => {
                    const eventType = e.type;
                    const entityId = ('entityId' in e) ? (e as { entityId?: string }).entityId : '';
                    return eventType.toLowerCase().includes(filterText)
                        || (typeof entityId === 'string' && entityId.toLowerCase().includes(filterText));
                })
                : logEntries;

            // Update count
            if (countBadge) {
                countBadge.updateProps({ count: String(filtered.length) });
            }

            // Render (newest first)
            listContainer.innerHTML = '';
            const reversed = [...filtered].reverse();

            for (const event of reversed.slice(0, 200)) {
                const eventType = 'type' in event ? String(event.type) : 'Unknown';
                const config = EVENT_COLORS[eventType] ?? { variant: 'accent' as const, icon: 'fas fa-circle' };

                const row = new uiLib.Row({
                    padding: 'xs',
                    gap: 'sm',
                    align: 'center'
                });
                row.getElement().classList.add('event-log-row');

                // Tick
                const tickText = new uiLib.Text({ 
                    text: `T${event.tick}`, 
                    variant: 'muted', 
                    size: 'xs', 
                    monospace: true 
                });
                tickText.getElement().style.minWidth = '40px';

                // Icon
                const variantColor = config.variant === 'error' ? 'var(--error)' :
                                   config.variant === 'warning' ? 'var(--warning)' :
                                   config.variant === 'success' ? 'var(--success)' : 'var(--accent)';
                const icon = new uiLib.Icon({ icon: config.icon, size: 'sm', color: variantColor });

                // Event type
                const typeText = new uiLib.Text({ text: eventType, weight: 'bold', size: 'xs' });
                typeText.getElement().style.minWidth = '120px';

                row.appendChildren(tickText, icon, typeText);

                // Entity ID
                if ('entityId' in event && event.entityId) {
                    const eid = event.entityId;
                    const entityLink = new uiLib.Text({ 
                        text: eid.substring(0, 8), 
                        variant: 'accent', 
                        size: 'xs',
                        onClick: () => {
                            ide.selection.select(eid);
                        }
                    });
                    row.appendChildren(entityLink);
                }

                // Detail summary
                if ('data' in event && event.data) {
                    const detailText = new uiLib.Text({ 
                        text: JSON.stringify(event.data).substring(0, 80), 
                        variant: 'muted', 
                        size: 'xs',
                        truncate: true
                    });
                    row.appendChildren(detailText);
                }

                if (listContainer) {
                    listContainer.appendChild(row.getElement());
                }
            }

            // Auto-scroll to top (newest)
            listContainer.scrollTop = 0;
        };

        ide.views.registerProvider('bottom-panel', eventLogProvider);

        ide.activityBar.registerItem({
            id: 'event-log.view',
            location: 'bottom-panel',
            icon: 'fas fa-stream',
            title: 'Event Log',
            order: 10
        });

        ide.commands.register({
            id: 'eventLog.open',
            label: 'Open Event Log',
            handler: () => {
                void ide.views.renderView('bottom-panel', 'event-log.view');
            }
        });

        console.log('✅ EventLogExtension activated');
    }
};
