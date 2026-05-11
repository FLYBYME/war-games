/**
 * HistoryExtension — Post-match analytics and telemetry replay.
 *
 * Provides:
 * - Timeline scrubber to replay simulation ticks
 * - Battle damage assessment (BDA) summary
 * - Entity trajectory replay
 * - Engagement timeline
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

        // ── History View (Center Panel Tab) ──────────────────────────────────

        const historyViewProvider: ViewProvider = {
            id: 'history.view',
            name: 'Post-Action Review',
            resolveView: async (container, disposables) => {
                const root = new uiLib.Column({ padding: 'md', gap: 'md', fill: true });

                // Header
                const header = document.createElement('div');
                Object.assign(header.style, {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border, #3e3e42)',
                    paddingBottom: '8px',
                });

                const title = new uiLib.Heading({ text: 'POST-ACTION REVIEW', level: 3, transform: 'uppercase' });
                header.appendChild(title.getElement());

                // Match selector for historical review
                const matchSelect = new uiLib.Select({
                    options: [{ label: 'Select a match...', value: '' }],
                    value: '',
                    placeholder: 'Select match to review...'
                });
                header.appendChild(matchSelect.getElement());
                root.getElement().appendChild(header);

                // ── Timeline Scrubber ────────────────────────────────────────
                const timelineSection = document.createElement('div');
                Object.assign(timelineSection.style, {
                    padding: '8px 0',
                });

                const timelineLabel = document.createElement('div');
                Object.assign(timelineLabel.style, {
                    fontSize: '10px',
                    color: 'var(--text-muted, #888)',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                    fontWeight: '600',
                    letterSpacing: '0.05em',
                });
                timelineLabel.textContent = 'TIMELINE';
                timelineSection.appendChild(timelineLabel);

                const timelineSlider = new uiLib.Slider({
                    min: 0,
                    max: 1000,
                    value: 0,
                    onChange: (_tick: number) => {
                        tickDisplay.textContent = `Tick: ${_tick}`;
                        // Would scrub the replay here
                    }
                });
                timelineSection.appendChild(timelineSlider.getElement());

                const tickDisplay = document.createElement('div');
                Object.assign(tickDisplay.style, {
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono, monospace)',
                    color: 'var(--text-main, #ccc)',
                    textAlign: 'center',
                    padding: '4px 0',
                });
                tickDisplay.textContent = 'Tick: 0';
                timelineSection.appendChild(tickDisplay);

                root.getElement().appendChild(timelineSection);

                // ── Stats Grid ───────────────────────────────────────────────
                const statsGrid = document.createElement('div');
                Object.assign(statsGrid.style, {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    padding: '8px 0',
                });

                const statCards = [
                    { label: 'Duration', value: '—', icon: 'fas fa-clock', color: 'var(--accent, #007acc)' },
                    { label: 'Blue Losses', value: '—', icon: 'fas fa-skull', color: 'var(--blue-force, #00bcd4)' },
                    { label: 'Red Losses', value: '—', icon: 'fas fa-skull', color: 'var(--red-force, #ff9800)' },
                    { label: 'Munitions Expended', value: '—', icon: 'fas fa-bomb', color: 'var(--warning, #ff9800)' },
                    { label: 'Engagements', value: '—', icon: 'fas fa-crosshairs', color: 'var(--error, #f44336)' },
                    { label: 'Outcome', value: '—', icon: 'fas fa-trophy', color: 'var(--success, #4caf50)' },
                ];

                for (const stat of statCards) {
                    const card = document.createElement('div');
                    Object.assign(card.style, {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        padding: '12px',
                        backgroundColor: 'var(--bg-sidebar, #252526)',
                        border: '1px solid var(--border, #3e3e42)',
                        borderRadius: '6px',
                    });

                    const cardIcon = document.createElement('i');
                    cardIcon.className = stat.icon;
                    cardIcon.style.color = stat.color;
                    cardIcon.style.fontSize = '14px';

                    const cardLabel = document.createElement('span');
                    Object.assign(cardLabel.style, {
                        fontSize: '10px',
                        color: 'var(--text-muted, #888)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    });
                    cardLabel.textContent = stat.label;

                    const cardValue = document.createElement('span');
                    cardValue.className = `stat-value-${stat.label.toLowerCase().replace(/ /g, '-')}`;
                    Object.assign(cardValue.style, {
                        fontSize: '20px',
                        fontWeight: '700',
                        fontFamily: 'var(--font-mono, monospace)',
                        color: 'var(--text-main, #ccc)',
                    });
                    cardValue.textContent = stat.value;

                    card.appendChild(cardIcon);
                    card.appendChild(cardLabel);
                    card.appendChild(cardValue);
                    statsGrid.appendChild(card);
                }

                root.getElement().appendChild(statsGrid);

                // ── Engagement Timeline ──────────────────────────────────────
                const engagementSection = document.createElement('div');
                const engagementTitle = new uiLib.Heading({ text: 'ENGAGEMENT LOG', level: 4, transform: 'uppercase' });
                engagementSection.appendChild(engagementTitle.getElement());

                const engagementList = document.createElement('div');
                Object.assign(engagementList.style, {
                    maxHeight: '300px',
                    overflow: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    marginTop: '8px',
                });

                // Placeholder
                const emptyLog = new uiLib.EmptyStateView({
                    icon: 'fas fa-chart-line',
                    title: 'No Data',
                    description: 'Select a completed match to view engagement history.'
                });
                engagementList.appendChild(emptyLog.getElement());

                engagementSection.appendChild(engagementList);
                root.getElement().appendChild(engagementSection);

                root.mount(container);

                // ── Load Match List ──────────────────────────────────────────
                try {
                    const matchResult = await client.api.match.list({ page: 1, pageSize: 100 });
                    const finishedMatches = matchResult.matches.filter(m => m.status === 'finished');

                    const selectEl = matchSelect.getElement().querySelector('select') as HTMLSelectElement | null;
                    if (selectEl) {
                        selectEl.innerHTML = '<option value="">Select a completed match...</option>';
                        for (const m of finishedMatches) {
                            const opt = document.createElement('option');
                            opt.value = m.id;
                            opt.textContent = `${m.name} (${m.winType})`;
                            selectEl.appendChild(opt);
                        }

                        const onChangeHandler = async () => {
                            const selectedId = selectEl.value;
                            if (!selectedId) return;

                            try {
                                const match = await client.api.match.get({ matchId: selectedId });
                                const score = match.score;

                                // Update stat cards
                                const updateStat = (className: string, value: string) => {
                                    const el = statsGrid.querySelector(`.stat-value-${className}`);
                                    if (el) el.textContent = value;
                                };
                                updateStat('duration', `${match.currentTurn} ticks`);
                                updateStat('blue-losses', String(score.blue));
                                updateStat('red-losses', String(score.red));
                                updateStat('munitions-expended', String(score.munitionsExpended));
                                updateStat('outcome', match.winType.replace('_', ' ').toUpperCase());

                                // Update timeline max
                                timelineSlider.updateProps({ max: match.currentTurn });

                            } catch (err) {
                                console.error('HistoryExtension: Failed to load match', err);
                            }
                        };
                        selectEl.addEventListener('change', onChangeHandler);
                        disposables.push({ dispose: () => selectEl.removeEventListener('change', onChangeHandler) });
                    }
                } catch (err) {
                    console.error('HistoryExtension: Failed to load match list', err);
                }
            }
        };

        ide.views.registerProvider('center-panel', historyViewProvider);

        ide.commands.register({
            id: 'history.open',
            label: 'Open Post-Action Review',
            handler: () => {
                void ide.views.renderView('center-panel', 'history.view');
            }
        });

        // Menu item
        ide.layout.header.menuBar.addMenuItem({
            id: 'analysis',
            label: 'Analysis',
            items: [
                { id: 'history:open', label: 'Post-Action Review', command: 'history.open' },
            ]
        });

        console.log('✅ HistoryExtension activated');
    }
};
