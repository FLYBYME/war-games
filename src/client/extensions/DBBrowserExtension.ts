/**
 * DBBrowserExtension — Browse entity/weapon/scenario profiles from the global registry.
 *
 * Provides a searchable, categorized view into the database of platform profiles,
 * weapon systems, and scenarios. Uses the DB domain contracts.
 */

import { Extension, ExtensionContext } from '../core/extensions/Extension';
import { ViewProvider } from '../core/extensions/ViewProvider';
import * as uiLib from '../ui-lib';

export const DBBrowserExtension: Extension = {
    id: 'wargames.db-browser',
    name: 'Database Browser',
    version: '1.0.0',

    activate(context: ExtensionContext) {
        const ide = context.ide;
        const client = ide.getClient();

        const dbBrowserProvider: ViewProvider = {
            id: 'db.browser',
            name: 'Database Browser',
            resolveView: async (container, disposables) => {
                const root = new uiLib.Column({ padding: 'md', gap: 'md', fill: true });

                // Header
                const header = new uiLib.Heading({ text: 'DATABASE', level: 4, transform: 'uppercase' });
                root.appendChildren(header);

                // Category tabs
                const categories = ['platforms', 'weapons', 'scenarios'] as const;
                let activeCategory: string = 'platforms';

                const tabRow = document.createElement('div');
                Object.assign(tabRow.style, {
                    display: 'flex',
                    gap: '2px',
                    borderBottom: '1px solid var(--border, #3e3e42)',
                    marginBottom: '8px',
                });

                const contentArea = new uiLib.Column({ gap: 'sm' });

                for (const cat of categories) {
                    const btn = document.createElement('button');
                    btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
                    btn.dataset['cat'] = cat;
                    Object.assign(btn.style, {
                        padding: '4px 12px',
                        fontSize: '11px',
                        background: 'transparent',
                        color: 'var(--text-muted, #888)',
                        border: 'none',
                        borderBottom: cat === activeCategory ? '2px solid var(--accent, #007acc)' : '2px solid transparent',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontWeight: cat === activeCategory ? '600' : '400',
                    });
                    btn.addEventListener('click', () => {
                        activeCategory = cat;
                        // Update tab styles
                        tabRow.querySelectorAll('button').forEach(b => {
                            const isActive = b.dataset['cat'] === activeCategory;
                            b.style.borderBottomColor = isActive ? 'var(--accent, #007acc)' : 'transparent';
                            b.style.color = isActive ? 'var(--text-main, #ccc)' : 'var(--text-muted, #888)';
                            b.style.fontWeight = isActive ? '600' : '400';
                        });
                        void loadCategory(cat);
                    });
                    tabRow.appendChild(btn);
                }

                // Search
                const search = new uiLib.SearchInput({
                    placeholder: 'Search profiles...',
                    onSearch: (_text: string) => {
                        void loadCategory(activeCategory);
                    }
                });

                root.getElement().appendChild(tabRow);
                root.appendChildren(search);
                root.appendChildren(contentArea);
                root.mount(container);

                // Load data for a category
                const loadCategory = async (category: string) => {
                    contentArea.getElement().innerHTML = '';

                    const spinner = new uiLib.Spinner({ size: 'sm' });
                    contentArea.appendChildren(spinner);

                    try {
                        let items: { id: string; name: string; category?: string; description?: string }[] = [];

                        switch (category) {
                            case 'platforms': {
                                const result = await client.api.db.profile_list({ page: 1, pageSize: 100 });
                                items = result.profiles.filter(p => p.type !== 'Weapon') ?? [];
                                break;
                            }
                            case 'weapons': {
                                const result = await client.api.db.profile_list({ page: 1, pageSize: 100, type: 'Weapon' });
                                items = result.profiles ?? [];
                                break;
                            }
                            case 'scenarios': {
                                const result = await client.api.db.scenario_list({ page: 1, pageSize: 100 });
                                items = result.scenarios.map(s => ({
                                    id: s.id,
                                    name: s.name,
                                    category: 'Scenario',
                                    description: s.description
                                })) ?? [];
                                break;
                            }
                        }

                        contentArea.getElement().innerHTML = '';

                        if (items.length === 0) {
                            const empty = new uiLib.EmptyStateView({
                                icon: 'fas fa-database',
                                title: `No ${category}`,
                                description: `No ${category} profiles found.`
                            });
                            contentArea.appendChildren(empty);
                            return;
                        }

                        for (const item of items) {
                            const card = new uiLib.Card({
                                title: item.name,
                                subtitle: item.category ?? item.id,
                                hoverable: true,
                                onClick: () => {
                                    // Show details in a drawer
                                    showProfileDetail(item.id);
                                }
                            });
                            contentArea.appendChildren(card);
                        }
                    } catch (err) {
                        contentArea.getElement().innerHTML = '';
                        const error = new uiLib.Alert({
                            message: `Failed to load ${category}: ${err instanceof Error ? err.message : String(err)}`,
                            variant: 'error'
                        });
                        contentArea.appendChildren(error);
                    }
                };

                const showProfileDetail = async (profileId: string) => {
                    try {
                        const profile = await client.api.db.profile_get({ id: profileId });
                        // Show in a modal with JSON tree
                        const modal = new uiLib.Modal({
                            title: `Profile: ${profileId}`,
                            width: '600px',
                        });
                        const jsonTree = new uiLib.JsonTree({
                            data: profile,
                            expandDepth: 3,
                            label: profileId,
                        });
                        modal.getElement().querySelector('.modal-body')?.appendChild(jsonTree.getElement());
                        modal.mount(document.body);
                    } catch (err) {
                        ide.notifications?.notify(`Failed to load profile: ${err instanceof Error ? err.message : String(err)}`, 'error');
                    }
                };

                // Initial load
                void loadCategory(activeCategory);
            }
        };

        ide.views.registerProvider('left-panel', dbBrowserProvider);

        ide.activityBar.registerItem({
            id: 'db.browser',
            location: 'left-panel',
            icon: 'fas fa-database',
            title: 'Database Browser',
            order: 20
        });

        ide.commands.register({
            id: 'db.open',
            label: 'Open Database Browser',
            handler: () => {
                void ide.views.renderView('left-panel', 'db.browser');
            }
        });

        console.log('✅ DBBrowserExtension activated');
    }
};
