/**
 * SimControlExtension — Simulation playback controls toolbar.
 *
 * Provides Play/Pause/Step/Reset buttons and a time compression slider.
 * Renders as a floating toolbar above the center panel.
 */

import { Extension, ExtensionContext } from '../core/extensions/Extension';
import { ViewProvider } from '../core/extensions/ViewProvider';
import { MatchServiceEvents } from '../core/services/MatchService';
import * as uiLib from '../ui-lib';

export const SimControlExtension: Extension = {
    id: 'wargames.sim-controls',
    name: 'Simulation Controls',
    version: '1.0.0',

    activate(context: ExtensionContext) {
        const ide = context.ide;
        const client = ide.getClient();
        const matches = ide.matches;

        // ── Sim Control Toolbar View ─────────────────────────────────────────

        const controlProvider: ViewProvider = {
            id: 'sim.controls',
            name: 'Sim Controls',
            resolveView: (container, disposables) => {
                const root = new uiLib.Row({
                    padding: 'xs',
                    gap: 'xs',
                    align: 'center',
                    fill: true
                });

                const toolbar = new uiLib.Row({
                    padding: 'xs',
                    gap: 'xs',
                    align: 'center',
                    backgroundColor: 'var(--bg-panel, #1e1e1e)',
                    border: true,
                    borderRadius: 'md'
                });

                // State
                let isPaused = true;
                let timeCompression = 1;

                // Play/Pause button
                const playPauseBtn = new uiLib.Button({
                    label: '',
                    icon: 'fas fa-play',
                    variant: 'ghost',
                    size: 'sm',
                    onClick: async () => {
                        const matchId = matches.currentMatchId.get();
                        if (!matchId) return;
                        try {
                            isPaused = !isPaused;
                            await client.api.sim.update({ matchId, isPaused });
                            updatePlayPauseIcon();
                        } catch (err) {
                            console.error('Play/Pause failed', err);
                        }
                    }
                });

                // Step button
                const stepBtn = new uiLib.Button({
                    label: '',
                    icon: 'fas fa-step-forward',
                    variant: 'ghost',
                    size: 'sm',
                    onClick: async () => {
                        const matchId = matches.currentMatchId.get();
                        if (!matchId) return;
                        try {
                            await client.api.sim.step({ matchId, ticks: 1 });
                        } catch (err) {
                            console.error('Step failed', err);
                        }
                    }
                });

                // Step-10 button
                const step10Btn = new uiLib.Button({
                    label: '+10',
                    icon: 'fas fa-forward',
                    variant: 'ghost',
                    size: 'sm',
                    onClick: async () => {
                        const matchId = matches.currentMatchId.get();
                        if (!matchId) return;
                        try {
                            await client.api.sim.step({ matchId, ticks: 10 });
                        } catch (err) {
                            console.error('Step-10 failed', err);
                        }
                    }
                });

                // Time compression label
                const tcLabel = new uiLib.Text({ 
                    text: '1x', 
                    font: 'mono', 
                    size: 'xs', 
                    variant: 'muted',
                    id: 'tc-label'
                });
                tcLabel.getElement().style.minWidth = '40px';

                // Time compression slider
                const tcSlider = new uiLib.Slider({
                    min: 1,
                    max: 100,
                    value: 1,
                    onChange: async (value: number) => {
                        timeCompression = value;
                        tcLabel.updateProps({ text: `${value}x` });
                        const matchId = matches.currentMatchId.get();
                        if (!matchId) return;
                        try {
                            await client.api.sim.update({ matchId, timeCompression: value });
                        } catch (err) {
                            console.error('Time compression update failed', err);
                        }
                    }
                });

                // Status indicator
                const statusIcon = new uiLib.Icon({
                    icon: 'fas fa-circle',
                    size: 'xs',
                    color: 'var(--status-warn, #ff9800)'
                });

                const updatePlayPauseIcon = () => {
                    playPauseBtn.updateProps({
                        icon: isPaused ? 'fas fa-play' : 'fas fa-pause',
                    });
                    statusIcon.updateProps({
                        color: isPaused ? 'var(--status-warn, #ff9800)' : 'var(--status-ok, #4caf50)'
                    });
                };

                toolbar.appendChildren(
                    playPauseBtn,
                    stepBtn,
                    step10Btn,
                    new uiLib.Text({ text: '|', variant: 'muted' }),
                    tcLabel,
                    tcSlider,
                    statusIcon
                );

                root.appendChildren(toolbar);
                root.mount(container);

                // Sync state on match activation
                const subActivated = ide.commands.on(MatchServiceEvents.MATCH_ACTIVATED, async (data: unknown) => {
                    const payload = data as { matchId: string };
                    try {
                        const simState = await client.api.sim.get({ matchId: payload.matchId });
                        isPaused = simState.isPaused;
                        timeCompression = simState.timeCompression;
                        tcLabel.updateProps({ text: `${timeCompression}x` });
                        tcSlider.updateProps({ value: timeCompression });
                        updatePlayPauseIcon();
                    } catch (_err) {
                        // ignore, will sync later
                    }
                });
                disposables.push({ dispose: () => ide.commands.off(subActivated) });
            }
        };

        ide.views.registerProvider('bottom-panel', controlProvider);

        ide.activityBar.registerItem({
            id: 'sim.controls',
            location: 'bottom-panel',
            icon: 'fas fa-play-circle',
            title: 'Sim Controls',
            order: 5
        });

        console.log('✅ SimControlExtension activated');
    }
};
