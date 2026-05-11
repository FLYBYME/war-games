/**
 * DBBrowserExtension — Low-level inspection of the simulation state.
 */

import { Extension, ExtensionContext } from '../core/extensions/Extension';
import { ViewProvider } from '../core/extensions/ViewProvider';
import * as uiLib from '../ui-lib';

export const DBBrowserExtension: Extension = {
    id: 'wargames.db-browser',
    name: 'DB Browser',
    version: '1.0.0',

    activate(context: ExtensionContext) {
        const ide = context.ide;
        const client = ide.getClient();

        const dbViewProvider: ViewProvider = {
            id: 'db.browser',
            name: 'Database Browser',
            resolveView: (container, disposables) => {
                const root = new uiLib.Column({ fill: true });

                // Header
                const header = new uiLib.Row({ 
                    padding: 'sm', 
                    gap: 'md', 
                    align: 'center'
                });
                
                header.getElement().style.borderBottom = '1px solid var(--border)';

                const title = new uiLib.Heading({ text: 'RECORDS', level: 4 });
                const refreshBtn = new uiLib.Button({ 
                    label: 'Refresh', 
                    icon: 'fas fa-sync', 
                    size: 'sm',
                    onClick: () => { void loadData(); }
                });

                header.appendChildren(title, refreshBtn);
                root.appendChildren(header);

                const list = new uiLib.Column({ padding: 'md', gap: 'xs' });
                const scroll = new uiLib.ScrollArea({ fill: true, children: [list] });
                root.appendChildren(scroll);

                const loadData = async () => {
                    list.getElement().innerHTML = 'Loading...';
                    try {
                        const result = await client.api.db.scenario_list({ page: 1, pageSize: 100 });
                        list.getElement().innerHTML = '';
                        
                        result.scenarios.forEach(s => {
                            const item = new uiLib.Card({
                                children: [
                                    new uiLib.Text({ text: s.name, weight: 'bold' }),
                                    new uiLib.Text({ text: s.id, size: 'xs', variant: 'muted' })
                                ]
                            });
                            list.appendChildren(item);
                        });
                    } catch (err) {
                        list.getElement().innerHTML = `Error: ${err instanceof Error ? err.message : String(err)}`;
                    }
                };

                void loadData();
                root.mount(container);
            }
        };

        ide.views.registerProvider('center-panel', dbViewProvider);

        ide.activityBar.registerItem({
            id: 'db.browser',
            location: 'center-panel',
            icon: 'fas fa-database',
            title: 'DB Browser',
            order: 50
        });

        console.log('✅ DBBrowserExtension activated');
    }
};
