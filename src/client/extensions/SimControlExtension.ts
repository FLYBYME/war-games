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
                container.style.padding = '4px 8px';

                const toolbar = document.createElement('div');
                Object.assign(toolbar.style, {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    backgroundColor: 'var(--bg-sidebar, #252526)',
                    borderRadius: '6px',
                    border: '1px solid var(--border, #3e3e42)',
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
                toolbar.appendChild(playPauseBtn.getElement());

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
                toolbar.appendChild(stepBtn.getElement());

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
                toolbar.appendChild(step10Btn.getElement());

                // Divider
                const divider = document.createElement('div');
                Object.assign(divider.style, {
                    width: '1px',
                    height: '18px',
                    backgroundColor: 'var(--border, #3e3e42)',
                    margin: '0 4px',
                });
                toolbar.appendChild(divider);

                // Time compression label
                const tcLabel = document.createElement('span');
                Object.assign(tcLabel.style, {
                    fontSize: '11px',
                    color: 'var(--text-muted, #888)',
                    fontFamily: 'var(--font-mono, monospace)',
                    minWidth: '40px',
                });
                tcLabel.textContent = '1x';
                toolbar.appendChild(tcLabel);

                // Time compression slider
                const tcSlider = new uiLib.Slider({
                    min: 1,
                    max: 100,
                    value: 1,
                    onChange: async (value: number) => {
                        timeCompression = value;
                        tcLabel.textContent = `${value}x`;
                        const matchId = matches.currentMatchId.get();
                        if (!matchId) return;
                        try {
                            await client.api.sim.update({ matchId, timeCompression: value });
                        } catch (err) {
                            console.error('Time compression update failed', err);
                        }
                    }
                });
                toolbar.appendChild(tcSlider.getElement());

                // Status indicator
                const statusDot = document.createElement('div');
                Object.assign(statusDot.style, {
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--status-ok, #4caf50)',
                    marginLeft: '8px',
                    transition: 'background-color 0.3s ease',
                });
                toolbar.appendChild(statusDot);

                const updatePlayPauseIcon = () => {
                    playPauseBtn.updateProps({
                        label: '',
                        icon: isPaused ? 'fas fa-play' : 'fas fa-pause',
                        variant: 'ghost',
                        size: 'sm',
                    });
                    statusDot.style.backgroundColor = isPaused
                        ? 'var(--status-warn, #ff9800)'
                        : 'var(--status-ok, #4caf50)';
                };

                // Sync state on match activation
                const subActivated = ide.commands.on(MatchServiceEvents.MATCH_ACTIVATED, async (data: unknown) => {
                    const payload = data as { matchId: string };
                    try {
                        const simState = await client.api.sim.get({ matchId: payload.matchId });
                        isPaused = simState.isPaused;
                        timeCompression = simState.timeCompression;
                        tcLabel.textContent = `${timeCompression}x`;
                        updatePlayPauseIcon();
                    } catch (_err) {
                        // ignore, will sync later
                    }
                });
                disposables.push({ dispose: () => ide.commands.off(subActivated) });

                container.appendChild(toolbar);
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
