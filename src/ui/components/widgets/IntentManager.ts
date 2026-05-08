import { Component } from '../../framework/Component';
import { sdkClient } from '../../framework/Client';
import { ScenarioIntent, MissionType, EMCONState } from '../../../sdk/schemas';

/**
 * IntentManager: UI for higher-level scenario scripting and unit AI intent.
 */
export class IntentManager extends Component {
    constructor() {
        super('div', 'intent-manager', 'intent-manager');
    }

    protected styles(): string {
        return `
            .intent-manager { padding: 15px; background: #111; color: #ddd; }
            .intent-header { font-weight: bold; font-size: 12px; margin-bottom: 10px; color: #888; }
            .btn-intent { background: #222; border: 1px solid #333; color: #fff; padding: 6px; font-size: 11px; cursor: pointer; width: 100%; margin-bottom: 5px; text-align: left; }
            .btn-intent:hover { background: #333; border-color: #00d1ff; }
        `;
    }

    protected render(): void {
        this.element.innerHTML = `
            <div class="intent-header">SCENARIO INTENT</div>
            <button class="btn-intent" id="btn-intent-scout">PATROL NORTH SECTOR</button>
            <button class="btn-intent" id="btn-intent-strike">ENGAGE SURFACE GROUP</button>
            <button class="btn-intent" id="btn-intent-silent">GO SILENT (GLOBAL)</button>
        `;

        this.listen(this.element.querySelector('#btn-intent-scout')!, 'click', () => {
            void this.issueIntent({
                type: 'Mission',
                actorId: 'any',
                missionType: MissionType.Patrol,
                params: { center: { x: 10000, y: 10000, z: 5000 }, radiusM: 5000 }
            });
        });

        this.listen(this.element.querySelector('#btn-intent-silent')!, 'click', () => {
            void this.issueIntent({
                type: 'Doctrine',
                emcon: EMCONState.Charlie
            });
        });
    }

    private async issueIntent(intent: ScenarioIntent) {
        try {
            await sdkClient.dispatch({ type: 'SetIntent', intent });
            console.log('Intent issued:', intent.type);
        } catch (e: unknown) {
            const error = e as Error;
            console.error('Failed to issue intent', error);
        }
    }
}
