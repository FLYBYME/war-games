/**
 * HistoryExtension — Analytics and telemetry playback.
 */

import { Extension, ExtensionContext } from '../core/extensions/Extension';
import { ViewProvider } from '../core/extensions/ViewProvider';
import * as uiLib from '../ui-lib';

export const HistoryExtension: Extension = {
    id: 'wargames.history',
    name: 'History & Analytics',
    version: '1.0.0',

    activate(context: ExtensionContext) {
        const ide = context.ide;
        const client = ide.getClient();

        const historyViewProvider: ViewProvider = {
            id: 'history.explorer',
            name: 'Match History',
            resolveView: (container, disposables) => {
                const root = new uiLib.Column({ fill: true });

                // Main content split
                const mainArea = new uiLib.Row({ fill: true, gap: 'none' });
                
                // Left: Match List
                const listSidebar = new uiLib.Column({ 
                    width: '300px', 
                    gap: 'sm', 
                    padding: 'md', 
                    fill: true 
                });
                listSidebar.getElement().style.borderRight = '1px solid var(--border)';
                
                const listTitle = new uiLib.Heading({ text: 'PAST SESSIONS', level: 6 });
                listTitle.getElement().style.color = 'var(--text-muted)';
                listSidebar.appendChildren(listTitle);

                const listContainer = new uiLib.Column({ gap: 'sm' });
                const listScroll = new uiLib.ScrollArea({ fill: true, children: [listContainer] });
                listSidebar.appendChildren(listScroll);

                // Right: Analytics Detail
                const analyticsArea = new uiLib.Column({ fill: true, padding: 'lg', gap: 'lg' });
                
                const emptyDetail = new uiLib.EmptyStateView({
                    icon: 'fas fa-chart-line',
                    title: 'Select a Session',
                    description: 'Review telemetry and engagement metrics from previous simulation runs.'
                });
                analyticsArea.appendChildren(emptyDetail);

                mainArea.appendChildren(listSidebar, analyticsArea);
                root.appendChildren(mainArea);

                // Replay Controls (Bottom)
                const footer = new uiLib.Row({ 
                    padding: 'sm', 
                    align: 'center' 
                });
                footer.getElement().style.height = '60px';
                footer.getElement().style.display = 'none';
                footer.getElement().style.borderTop = '1px solid var(--border)';

                const timeline = new uiLib.Timeline({
                    minTick: 0,
                    maxTick: 1000,
                    currentTick: 0,
                    onChange: (tick) => {
                        console.log('Scrubbing to tick', tick);
                    }
                });
                footer.appendChildren(timeline);
                root.appendChildren(footer);

                const loadMatches = async () => {
                    try {
                        const result = await client.api.match.list({ page: 1, pageSize: 50 });
                        listContainer.getElement().innerHTML = '';

                        result.matches.filter(m => m.status === 'finished').forEach(m => {
                            const card = new uiLib.Card({
                                title: m.name,
                                subtitle: `Ticks: ${m.currentTurn} • ${new Date().toLocaleDateString()}`,
                                hoverable: true,
                                onClick: () => {
                                    showMatchAnalytics(m);
                                }
                            });
                            listContainer.appendChildren(card);
                        });
                        
                        if (listContainer.getElement().children.length === 0) {
                            listContainer.appendChildren(new uiLib.Text({ text: 'No finished matches found.', variant: 'muted', size: 'xs' }));
                        }
                    } catch (err) {
                        listContainer.getElement().innerHTML = 'Error loading history';
                    }
                };

                const showMatchAnalytics = (match: any) => {
                    analyticsArea.getElement().innerHTML = '';
                    footer.getElement().style.display = 'flex';
                    
                    const title = new uiLib.Heading({ text: `ANALYTICS: ${match.name}`, level: 3 });
                    analyticsArea.appendChildren(title);

                    const stats = new uiLib.Row({ gap: 'lg' });
                    stats.appendChildren(
                        new uiLib.Card({ variant: 'default', title: 'Total Ticks', subtitle: String(match.currentTurn) }),
                        new uiLib.Card({ variant: 'default', title: 'Engagements', subtitle: '12' }),
                        new uiLib.Card({ variant: 'default', title: 'Efficiency', subtitle: '84%' })
                    );
                    analyticsArea.appendChildren(stats);

                    timeline.updateProps({ maxTick: match.currentTurn, currentTick: 0 });
                };

                void loadMatches();
                root.mount(container);
            }
        };

        ide.views.registerProvider('center-panel', historyViewProvider);

        ide.activityBar.registerItem({
            id: 'history.explorer',
            location: 'center-panel',
            icon: 'fas fa-history',
            title: 'History',
            order: 40
        });

        console.log('✅ HistoryExtension activated');
    }
};
