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
                const headerRow = document.createElement('div');
                headerRow.style.display = 'flex';
                headerRow.style.alignItems = 'center';
                headerRow.style.gap = '8px';

                const title = new uiLib.Heading({ text: 'EVENT LOG', level: 4, transform: 'uppercase' });
                headerRow.appendChild(title.getElement());

                countBadge = new uiLib.Badge({ count: '0', variant: 'accent', size: 'sm' });
                headerRow.appendChild(countBadge.getElement());

                // Spacer
                const spacer = document.createElement('div');
                spacer.style.flex = '1';
                headerRow.appendChild(spacer);

                // Clear button
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
                headerRow.appendChild(clearBtn.getElement());

                root.getElement().appendChild(headerRow);

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
                const scrollArea = document.createElement('div');
                scrollArea.style.flex = '1';
                scrollArea.style.overflow = 'auto';
                scrollArea.style.display = 'flex';
                scrollArea.style.flexDirection = 'column';
                scrollArea.style.gap = '2px';
                scrollArea.style.minHeight = '0';

                listContainer = scrollArea;
                root.getElement().appendChild(scrollArea);
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
                    const eventType = 'type' in e ? String(e.type) : '';
                    const entityId = e.entityId ?? '';
                    return eventType.toLowerCase().includes(filterText)
                        || entityId.toLowerCase().includes(filterText);
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

                const row = document.createElement('div');
                Object.assign(row.style, {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 6px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono, monospace)',
                    color: 'var(--text-main, #ccc)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                });
                row.addEventListener('mouseenter', () => {
                    row.style.backgroundColor = 'rgba(255,255,255,0.03)';
                });
                row.addEventListener('mouseleave', () => {
                    row.style.backgroundColor = 'transparent';
                });

                // Tick
                const tickSpan = document.createElement('span');
                tickSpan.style.color = 'var(--text-muted, #888)';
                tickSpan.style.minWidth = '40px';
                tickSpan.textContent = `T${event.tick}`;
                row.appendChild(tickSpan);

                // Icon
                const iconEl = document.createElement('i');
                iconEl.className = config.icon;
                iconEl.style.width = '14px';
                iconEl.style.textAlign = 'center';
                row.appendChild(iconEl);

                // Event type badge
                const typeBadge = document.createElement('span');
                typeBadge.textContent = eventType;
                typeBadge.style.fontWeight = '600';
                typeBadge.style.minWidth = '120px';
                row.appendChild(typeBadge);

                // Entity ID
                if (event.entityId) {
                    const entitySpan = document.createElement('span');
                    entitySpan.textContent = event.entityId.substring(0, 8);
                    entitySpan.style.color = 'var(--accent, #007acc)';
                    entitySpan.style.cursor = 'pointer';
                    entitySpan.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (event.entityId) {
                            ide.selection.select(event.entityId);
                        }
                    });
                    row.appendChild(entitySpan);
                }

                // Detail summary
                if ('data' in event && event.data) {
                    const detailSpan = document.createElement('span');
                    detailSpan.style.color = 'var(--text-muted, #888)';
                    detailSpan.style.overflow = 'hidden';
                    detailSpan.style.textOverflow = 'ellipsis';
                    detailSpan.style.whiteSpace = 'nowrap';
                    detailSpan.textContent = JSON.stringify(event.data).substring(0, 80);
                    row.appendChild(detailSpan);
                }

                listContainer.appendChild(row);
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
