import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { ViewUnitPayload, EngineCommandPayload } from '../../../sdk/schemas';

/**
 * EMCONMatrix: Per-sensor emission control override checklist.
 * Ported to V2 for UnitInspector.
 */
export class EMCONMatrix extends Component {
    constructor() { super('div', 'emcon-widget'); }

    protected styles() {
        return `
        .emcon-widget { width: 100%; display: flex; flex-direction: column; gap: var(--sp-2); }
        .emcon-title { font-size: var(--text-xs); font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--sp-2); letter-spacing: 0.05em; }
        .emcon-row { display: flex; align-items: center; justify-content: space-between; padding: var(--sp-2); background: var(--bg-base); border-radius: var(--radius-sm); border: 1px solid var(--border-color); }
        .emcon-info { display: flex; flex-direction: column; }
        .emcon-sensor { font-size: var(--text-sm); color: var(--text-main); font-weight: 500; }
        .emcon-type { font-size: var(--text-xs); color: var(--text-dim); font-family: var(--font-mono); }
        
        .emcon-toggle { width: 36px; height: 18px; border-radius: 9px; background: var(--bg-hover); border: 1px solid var(--border-color); cursor: pointer; position: relative; transition: all var(--transition-fast); }
        .emcon-toggle.is-on { background: rgba(0, 212, 255, 0.2); border-color: var(--color-friendly); }
        .emcon-toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%; background: var(--text-muted); transition: all var(--transition-fast); }
        .emcon-toggle.is-on::after { left: 20px; background: var(--color-friendly); }
        `;
    }

    protected render() {
        this.element.innerHTML = '';
        this.element.appendChild(this.el('div', 'emcon-title', 'EMISSION CONTROL (EMCON)'));

        const id = UIStore.selectedEntityId.get();
        const vs = UIStore.viewState.get();
        const unit = vs?.units.find((u: ViewUnitPayload) => u.id === id);
        
        if (!unit || !unit.sensors || unit.sensors.length === 0) {
            this.element.appendChild(this.el('div', 'empty-state', 'No active/passive sensors equipped.'));
            return;
        }

        unit.sensors.forEach((s) => {
            const row = this.el('div', 'emcon-row');
            
            const info = this.el('div', 'emcon-info');
            info.appendChild(this.el('div', 'emcon-sensor', s.name));
            info.appendChild(this.el('div', 'emcon-type', `Range: ${(s.rangeM / 1852).toFixed(1)} nm`));
            row.appendChild(info);

            const toggle = this.el('div', `emcon-toggle${s.active ? ' is-on' : ''}`);
            toggle.addEventListener('click', () => {
                const newState = !s.active; 
                if (UIStore.client) {
                    UIStore.client.dispatch({
                        type: 'SetSensorState',
                        entityId: unit.id,
                        sensor: s.name,
                        active: newState
                    } as EngineCommandPayload);
                }
            });
            row.appendChild(toggle);
            this.element.appendChild(row);
        });
    }

    protected onMount() {
        this.render();
        this.subscribe(UIStore.selectedEntityId, () => this.render());
        this.subscribe(UIStore.viewState, () => this.render());
    }
}
