/**
 * MatchExtension — Domain extension for match lifecycle management.
 *
 * Responsibilities:
 * - Match Explorer sidebar (list, create, select matches)
 * - Status bar items (match name, status, tick, side)
 * - Simulation control commands (play, pause, step)
 * - Notification status item (required by NotificationService)
 */

import { Extension, ExtensionContext } from '../core/extensions/Extension';
import { ViewProvider } from '../core/extensions/ViewProvider';
import { MatchServiceEvents } from '../core/services/MatchService';
import { Match } from '@sdk/contracts/match/match.schema';
import * as uiLib from '../ui-lib';

export const MatchExtension: Extension = {
    id: 'wargames.match',
    name: 'Match Manager',
    version: '1.0.0',

    activate(context: ExtensionContext) {
        const ide = context.ide;
        const matchService = ide.matches;
        const client = ide.getClient();
        const statusBar = ide.layout.statusBar;

        // ── Status Bar Items ─────────────────────────────────────────────────

        // Notification status (required by NotificationService)
        statusBar.addItem('notification-status', { tooltip: 'Notifications', text: '' }, 'left');

        // Match info items
        statusBar.addItem('match-name', {
            tooltip: 'Active match',
            text: 'No Match',
            icon: 'fas fa-crosshairs'
        }, 'left');

        statusBar.addItem('match-status', {
            tooltip: 'Match status',
            text: '—'
        }, 'left');

        statusBar.addItem('sim-tick', {
            tooltip: 'Current simulation tick',
            text: 'Tick: —',
            icon: 'fas fa-clock'
        }, 'right');

        statusBar.addItem('active-side', {
            tooltip: 'Active force perspective',
            text: 'Observer',
            icon: 'fas fa-eye'
        }, 'right');

        // ── Signal Subscriptions ─────────────────────────────────────────────

        // Update status bar when match changes
        const unsubMatch = matchService.currentMatch.subscribe((match: Match | null) => {
            const nameItem = statusBar.getItem('match-name');
            const statusItem = statusBar.getItem('match-status');
            if (nameItem) {
                nameItem.updateProps({
                    text: match ? match.name : 'No Match',
                    icon: 'fas fa-crosshairs'
                });
            }
            if (statusItem) {
                statusItem.updateProps({
                    text: match ? match.status.toUpperCase() : '—'
                });
            }
        });
        context.subscriptions.push({ dispose: unsubMatch });

        // Update status bar when side changes
        const unsubSide = matchService.currentSide.subscribe((side) => {
            const sideItem = statusBar.getItem('active-side');
            if (sideItem) {
                const sideLabels: Record<string, string> = {
                    blue: '🔵 Blue',
                    red: '🔴 Red',
                    observer: '👁 Observer'
                };
                sideItem.updateProps({ text: sideLabels[side] ?? side });
            }
        });
        context.subscriptions.push({ dispose: unsubSide });

        // ── Match Explorer View (Left Sidebar) ──────────────────────────────

        const matchExplorerProvider: ViewProvider = {
            id: 'match.explorer',
            name: 'Match Explorer',
            resolveView: async (container, disposables) => {
                const root = new uiLib.Column({ padding: 'md', gap: 'md', fill: true });

                const header = new uiLib.Heading({ text: 'MATCHES', level: 4, transform: 'uppercase' });
                root.appendChildren(header);

                // Match list container
                const listContainer = new uiLib.Column({ gap: 'xs' });

                // Header actions
                const actionsRow = new uiLib.Row({ gap: 'xs' });
                
                const refreshBtn = new uiLib.Button({
                    label: 'Refresh',
                    icon: 'fas fa-sync',
                    variant: 'ghost',
                    size: 'sm',
                    onClick: () => { void loadMatches(); }
                });

                const createBtn = new uiLib.Button({
                    label: 'New Match',
                    icon: 'fas fa-plus',
                    variant: 'primary',
                    size: 'sm',
                    onClick: () => { void showCreateMatchModal(); }
                });

                actionsRow.appendChildren(refreshBtn, createBtn);
                root.appendChildren(actionsRow);
                root.appendChildren(listContainer);

                const showCreateMatchModal = async () => {
                    // Fetch scenarios for the dropdown
                    const scenariosResult = await client.api.db.scenario_list({ page: 1, pageSize: 100 });
                    const scenarios = scenariosResult.scenarios;

                    let currentName = '';
                    let currentScenarioId = scenarios[0]?.id ?? '';

                    const nameInput = new uiLib.TextInput({ 
                        label: 'Match Name', 
                        placeholder: 'Enter match name...',
                        onChange: (v) => { currentName = v; }
                    });
                    
                    const scenarioSelect = new uiLib.Select({
                        label: 'Scenario',
                        options: scenarios.map(s => ({ label: s.name, value: s.id })),
                        value: currentScenarioId,
                        onChange: (v) => { currentScenarioId = v; }
                    });

                    const modal = new uiLib.Modal({
                        title: 'Create New Match',
                        children: [
                            new uiLib.Column({
                                gap: 'md',
                                children: [nameInput, scenarioSelect]
                            })
                        ],
                        footer: [
                            new uiLib.Button({ label: 'Cancel', onClick: () => modal.hide() }),
                            new uiLib.Button({ 
                                label: 'Create', 
                                variant: 'primary', 
                                onClick: async () => {
                                    if (!currentName) {
                                        ide.notifications?.notify('Match name is required', 'error');
                                        return;
                                    }

                                    try {
                                        await client.api.match.create({ 
                                            name: currentName, 
                                            scenarioId: currentScenarioId,
                                            maxTurns: 10000
                                        });
                                        ide.notifications?.notify(`Match "${currentName}" created`, 'success');
                                        modal.hide();
                                        void loadMatches();
                                    } catch (err) {
                                        ide.notifications?.notify(`Failed to create match: ${err instanceof Error ? err.message : String(err)}`, 'error');
                                    }
                                }
                            })
                        ]
                    });
                    modal.show();
                };

                // Load and render match list
                const loadMatches = async () => {
                    try {
                        const result = await client.api.match.list({ page: 1, pageSize: 50 });
                        renderMatchList(result.matches, listContainer, disposables);
                    } catch (err) {
                        console.error('MatchExtension: Failed to load matches', err);
                        ide.notifications?.notify('Failed to load matches', 'error');
                    }
                };

                const renderMatchList = (
                    matches: Match[],
                    target: uiLib.Column,
                    _disposables: { dispose: () => void }[]
                ) => {
                    // Clear existing items
                    target.getElement().innerHTML = '';

                    if (matches.length === 0) {
                        const empty = new uiLib.EmptyStateView({
                            icon: 'fas fa-chess',
                            title: 'No Matches',
                            description: 'Create a match to begin.'
                        });
                        target.appendChildren(empty);
                        return;
                    }

                    for (const match of matches) {
                        const card = new uiLib.Card({
                            title: match.name,
                            subtitle: `${match.status} • Turn ${match.currentTurn}`,
                            hoverable: true,
                            onClick: () => {
                                void matchService.selectMatch(match.id);
                            }
                        });
                        target.appendChildren(card);
                    }
                };

                root.mount(container);

                // Initial load
                void loadMatches();
            }
        };

        ide.views.registerProvider('left-panel', matchExplorerProvider);

        ide.activityBar.registerItem({
            id: 'match.explorer',
            location: 'left-panel',
            icon: 'fas fa-chess',
            title: 'Match Explorer',
            order: 1
        });

        // ── Simulation Control Commands ──────────────────────────────────────

        ide.commands.register({
            id: 'sim.step',
            label: 'Step Simulation',
            keybinding: 'Ctrl+N',
            handler: async () => {
                const matchId = matchService.currentMatchId.get();
                if (!matchId) {
                    ide.notifications?.notify('No active match', 'warning');
                    return;
                }
                try {
                    const result = await client.api.sim.step({ matchId, ticks: 1 });
                    const tickItem = statusBar.getItem('sim-tick');
                    if (tickItem) {
                        tickItem.updateProps({ text: `Tick: ${result.tick}` });
                    }
                } catch (err) {
                    console.error('sim.step failed', err);
                }
            }
        });

        ide.commands.register({
            id: 'sim.togglePlayPause',
            label: 'Toggle Play/Pause',
            keybinding: 'Ctrl+Shift+P',
            handler: async () => {
                const matchId = matchService.currentMatchId.get();
                if (!matchId) return;
                try {
                    const current = await client.api.sim.get({ matchId });
                    await client.api.sim.update({ matchId, isPaused: !current.isPaused });
                    await matchService.refresh();
                } catch (err) {
                    console.error('sim.togglePlayPause failed', err);
                }
            }
        });

        ide.commands.register({
            id: 'selection.clear',
            label: 'Clear Selection',
            keybinding: 'Escape',
            handler: () => {
                ide.selection.clear();
            }
        });

        // ── Menu Items ───────────────────────────────────────────────────────

        ide.layout.header.menuBar.addMenuItem({
            id: 'simulation',
            label: 'Simulation',
            items: [
                { id: 'sim:step', label: 'Step (N)', command: 'sim.step' },
                { id: 'sim:playpause', label: 'Play / Pause (Space)', command: 'sim.togglePlayPause' },
            ]
        });

        // ── Stream Integration ───────────────────────────────────────────────

        // When a match is activated, subscribe to the stream for tick updates
        ide.commands.on(MatchServiceEvents.MATCH_ACTIVATED, (data: unknown) => {
            const payload = data as { matchId: string };
            const unsub = ide.stream.subscribe(payload.matchId, (event) => {
                // Update tick display for any event that has a tick
                if ('tick' in event && typeof event.tick === 'number') {
                    const tickItem = statusBar.getItem('sim-tick');
                    if (tickItem) {
                        tickItem.updateProps({ text: `Tick: ${event.tick}` });
                    }
                }
            });
            context.subscriptions.push({ dispose: unsub });
        });

        // When match is deactivated, stream is torn down by SimStreamService
        ide.commands.on(MatchServiceEvents.MATCH_DEACTIVATED, () => {
            ide.stream.teardown();
            const tickItem = statusBar.getItem('sim-tick');
            if (tickItem) {
                tickItem.updateProps({ text: 'Tick: —' });
            }
        });

        console.log('✅ MatchExtension activated');
    }
};
