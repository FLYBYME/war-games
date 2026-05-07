import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { sdkClient } from '../../framework/Client';
import { EMCONState } from '../../../sdk/schemas/domain.js';

/**
 * EMCONMatrix: Global and unit-level emission control interface.
 */
export class EMCONMatrix extends Component {
    constructor() {
        super('div', 'emcon-matrix', 'emcon-matrix');
    }

    protected styles(): string {
        return `
            .emcon-matrix { padding: 15px; background: #111; color: #ddd; }
            .matrix-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; }
            .label { font-size: 11px; color: #888; text-transform: uppercase; }
            select { background: #222; border: 1px solid #333; color: #fff; padding: 4px; font-size: 11px; }
        `;
    }

    protected render(): void {
        this.element.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px;">EMISSION CONTROL (EMCON)</div>
            <div class="matrix-row">
                <span class="label">Global EMCON</span>
                <select id="select-global-emcon">
                    <option value="${EMCONState.Alpha}">ALPHA (Active)</option>
                    <option value="${EMCONState.Silent}">SILENT (Passive)</option>
                </select>
            </div>
            <div id="unit-emcon-list" style="margin-top: 15px;"></div>
        `;

        const globalSelect = this.element.querySelector('#select-global-emcon') as HTMLSelectElement;
        this.listen(globalSelect, 'change', () => {
            void sdkClient.dispatch({ type: 'SetEMCON', state: globalSelect.value });
        });

        this.subscribe(UIStore.viewState, () => this.sync());
    }

    private sync() {
        const vs = UIStore.viewState.get();
        if (!vs) return;

        const list = this.element.querySelector('#unit-emcon-list')!;
        list.innerHTML = '';
        
        vs.units.slice(0, 5).forEach(u => {
            const row = this.el('div', 'matrix-row');
            row.innerHTML = `
                <span style="font-size: 10px;">${u.id}</span>
                <select class="unit-emcon-select" data-id="${u.id}">
                    <option value="${EMCONState.Alpha}" ${u.sensors.some(s => s.active) ? 'selected' : ''}>ACTIVE</option>
                    <option value="${EMCONState.Silent}" ${u.sensors.every(s => !s.active) ? 'selected' : ''}>SILENT</option>
                </select>
            `;
            
            const select = row.querySelector('select') as HTMLSelectElement;
            this.listen(select, 'change', () => {
                void sdkClient.dispatch({ type: 'SetEMCON', entityId: u.id, state: select.value });
            });

            list.appendChild(row);
        });
    }
}
