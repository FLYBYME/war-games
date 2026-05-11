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

                // Header
                const header = new uiLib.Row({ 
                    padding: 'sm', 
                    gap: 'md', 
                    align: 'center'
                });
                
                header.getElement().style.borderBottom = '1px solid var(--border)';

                const title = new uiLib.Heading({ text: 'ANALYTICS', level: 4 });
                header.appendChildren(title);
                root.appendChildren(header);

                const list = new uiLib.Column({ padding: 'md', gap: 'md' });
                const scroll = new uiLib.ScrollArea({ fill: true, children: [list] });
                root.appendChildren(scroll);

                const loadMatches = async () => {
                    try {
                        const result = await client.api.match.list({ page: 1, pageSize: 50 });
                        list.getElement().innerHTML = '';

                        result.matches.forEach(m => {
                            const card = new uiLib.Card({
                                variant: 'default',
                                children: [
                                    new uiLib.Text({ text: m.name, weight: 'bold' }),
                                    new uiLib.Text({ text: m.id, size: 'xs', variant: 'muted' })
                                ]
                            });
                            list.appendChildren(card);
                        });
                    } catch (err) {
                        list.getElement().innerHTML = 'Error loading history';
                    }
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
