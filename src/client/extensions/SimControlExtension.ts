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
        const simControl = ide.layout.header.simControl;

        // ─── Reactive Binding to Header ─────────────────────────────────────
        
        const updateHeader = () => {
            simControl.updateProps({
                isPaused: sim.isPaused.get(),
                speed: sim.timeCompression.get(),
                onTogglePause: () => sim.togglePause(),
                onChangeSpeed: (speed: number) => sim.setTimeCompression(speed)
            });
        };

        // Subscribe to changes
        const unsubPause = sim.isPaused.subscribe(updateHeader);
        const unsubSpeed = sim.timeCompression.subscribe(updateHeader);

        // Initial update
        updateHeader();

        // Clean up on deactivate (not explicitly handled in this simple extension)
        // but we should track disposables if we had an ExtensionContext.disposables
        
        console.log('✅ SimControlExtension activated (Header Mode)');
    }
};
