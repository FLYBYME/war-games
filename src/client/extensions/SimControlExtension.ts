/**
 * SimControlExtension — Real-time simulation control panel.
 */

import { Extension, ExtensionContext } from '../core/extensions/Extension';
import { ViewProvider } from '../core/extensions/ViewProvider';
import * as uiLib from '../ui-lib';

export const SimControlExtension: Extension = {
    id: 'wargames.sim-controls',
    name: 'Simulation Controls',
    version: '1.0.0',

    activate(context: ExtensionContext) {
        const ide = context.ide;
        const client = ide.getClient();
        const matches = ide.matches;

        const controlViewProvider: ViewProvider = {
            id: 'sim.controls',
            name: 'Simulation Controls',
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
                    align: 'center'
                });
                
                toolbar.getElement().style.backgroundColor = 'var(--bg-panel, #1e1e1e)';
                toolbar.getElement().style.border = '1px solid var(--border)';
                toolbar.getElement().style.borderRadius = 'var(--radius-md, 4px)';

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
                    size: 'xs', 
                    variant: 'muted'
                });
                tcLabel.getElement().id = 'tc-label';
                tcLabel.getElement().style.fontFamily = 'var(--font-mono, monospace)';
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
                    size: 'sm',
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
            }
        };

        ide.views.registerProvider('bottom-panel', controlViewProvider);

        console.log('✅ SimControlExtension activated');
    }
};
