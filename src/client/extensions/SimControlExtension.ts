/**
 * SimControlExtension — Real-time simulation control panel.
 */

import { Extension, ExtensionContext } from '../core/extensions/Extension';
import { ViewProvider } from '../core/extensions/ViewProvider';
import * as uiLib from '../ui-lib';
import * as Contracts from '../../sdk_v2/contracts';

export const SimControlExtension: Extension = {
    id: 'wargames.sim-controls',
    name: 'Simulation Controls',
    version: '1.0.0',

    activate(context: ExtensionContext) {
        const ide = context.ide;
        const sim = ide.sim;

        const controlViewProvider: ViewProvider = {
            id: 'sim.controls',
            name: 'Simulation Controls',
            resolveView: (container, disposables) => {
                const root = new uiLib.Row({ 
                    padding: 'md',
                    gap: 'md',
                    align: 'center',
                    justify: 'center',
                    fill: true
                });

                const toolbar = new uiLib.Row({
                    padding: 'sm',
                    gap: 'md',
                    align: 'center'
                });
                
                toolbar.getElement().style.backgroundColor = 'var(--bg-input, #1e1e24)';
                toolbar.getElement().style.border = '1px solid var(--border)';
                toolbar.getElement().style.borderRadius = 'var(--radius-lg, 8px)';
                toolbar.getElement().style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';

                // Play/Pause button
                const playPauseBtn = new uiLib.Button({
                    label: 'Play',
                    icon: 'fas fa-play',
                    variant: 'primary',
                    size: 'base',
                    onClick: () => sim.togglePause()
                });

                // Step button
                const stepBtn = new uiLib.Button({
                    label: 'Step',
                    icon: 'fas fa-step-forward',
                    variant: 'secondary',
                    size: 'base',
                    onClick: () => sim.step(1)
                });

                // Time compression label
                const tcLabel = new uiLib.Text({ 
                    text: '1x', 
                    size: 'sm', 
                    weight: 'bold'
                });
                tcLabel.getElement().style.fontFamily = 'var(--font-mono, monospace)';
                tcLabel.getElement().style.minWidth = '50px';
                tcLabel.getElement().style.textAlign = 'center';

                // Time compression slider
                const tcSlider = new uiLib.Slider({
                    min: 1,
                    max: 100,
                    value: 1,
                    onChange: (value: number) => sim.setTimeCompression(value)
                });
                tcSlider.getElement().style.width = '200px';

                // Status indicator
                const statusIcon = new uiLib.Icon({
                    icon: 'fas fa-circle',
                    size: 'sm',
                    color: 'var(--status-warn)'
                });
                statusIcon.getElement().classList.add('status-dot-pulse');

                // ─── Reactive Binding ──────────────────────────────────────────
                
                // Pause State
                disposables.push({ 
                    dispose: sim.isPaused.subscribe(isPaused => {
                        playPauseBtn.updateProps({
                            label: isPaused ? 'Resume' : 'Pause',
                            icon: isPaused ? 'fas fa-play' : 'fas fa-pause',
                            variant: isPaused ? 'primary' : 'secondary'
                        });
                        statusIcon.updateProps({
                            color: isPaused ? 'var(--status-warn)' : 'var(--status-ok)'
                        });
                    })
                });

                // Time Compression
                disposables.push({
                    dispose: sim.timeCompression.subscribe(tc => {
                        tcLabel.updateProps({ text: `${tc}x` });
                        tcSlider.updateProps({ value: tc });
                    })
                });

                toolbar.appendChildren(
                    playPauseBtn,
                    stepBtn,
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

        ide.activityBar.registerItem({
            id: 'sim.controls',
            location: 'bottom-panel',
            icon: 'fas fa-clock',
            title: 'Simulation Controls',
            order: 10
        });

        console.log('✅ SimControlExtension activated');
    }
};
