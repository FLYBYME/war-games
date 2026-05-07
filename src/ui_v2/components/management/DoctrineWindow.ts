import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { sdkClient } from '../../framework/Client';
import { ROE, EMCONState } from '../../../sdk/schemas';

/**
 * DoctrineWindow: Controls ROE and EMCON for the selected unit.
 */
export class DoctrineWindow extends Component {
    constructor() {
        super('div', 'doctrine-window', 'doctrine-window');
    }

    protected styles(): string {
        return `
            .doctrine-window {
                padding: 15px;
                background: #111;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            .doctrine-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 10px;
            }
            .label { font-size: 11px; color: #888; text-transform: uppercase; }
            select { background: #222; border: 1px solid #333; color: #fff; padding: 4px; font-size: 12px; }
        `;
    }

    protected render(): void {
        this.element.innerHTML = `
            <div class="doctrine-row">
                <span class="label">Rules of Engagement</span>
                <select id="select-roe">
                    <option value="${ROE.FREE}">FREE (Fire at will)</option>
                    <option value="${ROE.TIGHT}">TIGHT (ID required)</option>
                    <option value="${ROE.HOLD}">HOLD (Self-defense only)</option>
                </select>
            </div>
            <div class="doctrine-row">
                <span class="label">EMCON State</span>
                <select id="select-emcon">
                    <option value="${EMCONState.Alpha}">ALPHA (Active)</option>
                    <option value="${EMCONState.Silent}">SILENT (Passive Only)</option>
                </select>
            </div>
        `;

        const roeSelect = this.element.querySelector('#select-roe') as HTMLSelectElement;
        const emconSelect = this.element.querySelector('#select-emcon') as HTMLSelectElement;

        this.listen(roeSelect, 'change', () => {
            const unit = UIStore.selectedEntityId.get();
            if (unit) {
                void sdkClient.dispatch({ type: 'SetUnitROE', entityId: unit, roe: roeSelect.value });
            }
        });

        this.listen(emconSelect, 'change', () => {
            const unit = UIStore.selectedEntityId.get();
            if (unit) {
                void sdkClient.dispatch({ type: 'SetEMCON', entityId: unit, state: emconSelect.value });
            }
        });

    }
}
