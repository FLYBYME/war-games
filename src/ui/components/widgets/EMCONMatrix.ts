import { sdkClient } from '../../framework/Client.js';
import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore.js';
import { DatabaseService } from '../../framework/DatabaseService.js';

/**
 * EMCONMatrix: Per-sensor emission control override checklist.
 */
export class EMCONMatrix extends Component {
    constructor() { super('div', 'emcon-widget'); }

    protected styles() {
        return `
        .emcon-widget { padding:var(--sp-3); }
        .emcon-title { font-size:var(--text-xs); font-weight:600; color:var(--text-muted); text-transform:uppercase; margin-bottom:var(--sp-2); }
        .emcon-row { display:flex; align-items:center; justify-content:space-between; padding:var(--sp-1) 0; border-bottom:1px solid var(--border-color); }
        .emcon-row:last-child { border-bottom:none; }
        .emcon-sensor { font-size:var(--text-sm); color:var(--text-main); }
        .emcon-type { font-size:var(--text-xs); color:var(--text-dim); font-family:var(--font-mono); }
        .emcon-toggle { width:36px; height:18px; border-radius:9px; background:var(--bg-surface); border:1px solid var(--border-color); cursor:pointer; position:relative; transition:all var(--transition-fast); }
        .emcon-toggle.is-on { background:rgba(0,212,255,0.2); border-color:var(--color-friendly); }
        .emcon-toggle::after { content:''; position:absolute; top:2px; left:2px; width:12px; height:12px; border-radius:50%; background:var(--text-muted); transition:all var(--transition-fast); }
        .emcon-toggle.is-on::after { left:20px; background:var(--color-friendly); }
        `;
    }

    protected render() {
        this.element.appendChild(this.el('div', 'emcon-title', 'EMISSION CONTROL'));

        const id = UIStore.selectedEntityId.get();
        const vs = UIStore.viewState.get();
        const unit = vs?.units.find((u: any) => u.id === id);
        
        if (!unit || !unit.profileId) {
            this.element.appendChild(this.el('div', 'emcon-type', 'No profile data'));
            return;
        }

        const profile = DatabaseService.getProfile(unit.profileId);
        if (!profile || !profile.sensors) {
            this.element.appendChild(this.el('div', 'emcon-type', 'Profile not loaded'));
            return;
        }

        const mask = unit.sensorMask || 0;

        for (let i = 0; i < profile.sensors.length; i++) {
            const s = profile.sensors[i];
            const isActive = (mask & (1 << i)) !== 0;

            const row = this.el('div', 'emcon-row');
            const info = this.el('div');
            info.appendChild(this.el('div', 'emcon-sensor', s.name || s.type || 'Unnamed Sensor'));
            info.appendChild(this.el('div', 'emcon-type', s.type));
            row.appendChild(info);

            const toggle = this.el('div', `emcon-toggle${isActive ? ' is-on' : ''}`);
            toggle.addEventListener('click', () => {
                const newState = !toggle.classList.contains('is-on');
                toggle.classList.toggle('is-on', newState);
                sdkClient.dispatch({ type: 'SetSensorState', entityId: unit.id, sensor: s.name || s.type, active: newState });
            });
            row.appendChild(toggle);
            this.element.appendChild(row);
        }
    }
}
