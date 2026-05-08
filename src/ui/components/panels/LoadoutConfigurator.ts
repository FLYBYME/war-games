import { sdkClient } from '../../framework/Client.js';
import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore.js';

/**
 * LoadoutConfigurator: Aircraft loadout editor affecting weight/drag/RCS.
 */
export class LoadoutConfigurator extends Component {
    constructor() { super('div', 'loadout-widget'); }

    protected styles() {
        return `
        .loadout-widget { padding:var(--sp-3); }
        .lo-title { font-size:var(--text-xs); font-weight:600; color:var(--text-muted); text-transform:uppercase; margin-bottom:var(--sp-2); }
        .lo-preset { display:flex; flex-direction:column; gap:var(--sp-2); }
        .lo-card { padding:var(--sp-2) var(--sp-3); background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); cursor:pointer; transition:all var(--transition-fast); }
        .lo-card:hover { border-color:var(--border-light); background:var(--bg-hover); }
        .lo-card.is-selected { border-color:var(--color-friendly); background:rgba(0,212,255,0.05); }
        .lo-card__name { font-size:var(--text-sm); font-weight:500; color:var(--text-main); }
        .lo-card__desc { font-size:var(--text-xs); color:var(--text-muted); margin-top:2px; }
        .lo-card__stats { display:flex; gap:var(--sp-3); margin-top:4px; font-size:var(--text-xs); font-family:var(--font-mono); color:var(--text-dim); }
        .lo-station { display:grid; grid-template-columns:60px 1fr; gap:4px; padding:var(--sp-1) 0; font-size:var(--text-xs); border-bottom:1px solid var(--border-color); }
        .lo-station__label { color:var(--text-dim); }
        .lo-station__select { background:var(--bg-surface); border:1px solid var(--border-color); border-radius:2px; padding:2px 4px; font-size:var(--text-xs); color:var(--text-main); width:100%; }
        `;
    }

    protected render() {
        this.element.appendChild(this.el('div', 'lo-title', 'LOADOUT CONFIGURATOR'));

        const presets = [
            { name: 'CAP — Long Range', desc: '4× AIM-120D, 2× AIM-9X, 2× Drop Tanks', weight: 2400, drag: '+8%', rcs: '1.2 m²' },
            { name: 'Strike — Heavy', desc: '4× JDAM, 2× AIM-120D, 2× AIM-9X', weight: 4200, drag: '+22%', rcs: '4.5 m²' },
            { name: 'SEAD', desc: '2× AGM-88 HARM, 2× AIM-120D, ECM Pod', weight: 3100, drag: '+15%', rcs: '2.8 m²' },
            { name: 'Clean', desc: 'Internal guns only', weight: 200, drag: '0%', rcs: '0.8 m²' },
        ];

        let selectedIdx = 0;
        const presetContainer = this.el('div', 'lo-preset');

        for (let i = 0; i < presets.length; i++) {
            const p = presets[i];
            const card = this.el('div', `lo-card${i === selectedIdx ? ' is-selected' : ''}`);
            card.appendChild(this.el('div', 'lo-card__name', p.name));
            card.appendChild(this.el('div', 'lo-card__desc', p.desc));
            const stats = this.el('div', 'lo-card__stats');
            stats.appendChild(this.el('span', undefined, `${p.weight} kg`));
            stats.appendChild(this.el('span', undefined, `Drag: ${p.drag}`));
            stats.appendChild(this.el('span', undefined, `RCS: ${p.rcs}`));
            card.appendChild(stats);

            card.addEventListener('click', () => {
                const selectedEntityId = UIStore.selectedEntityId.get();
                if (!selectedEntityId) return;

                presetContainer.querySelectorAll('.lo-card').forEach(c => c.classList.remove('is-selected'));
                card.classList.add('is-selected');
                selectedIdx = i;
                sdkClient.dispatch({ type: 'SetLoadout', entityId: selectedEntityId, loadout: p.name });
            });
            presetContainer.appendChild(card);
        }
        this.element.appendChild(presetContainer);

        // Custom station editor
        this.element.appendChild(this.el('div', 'lo-title', 'CUSTOM STATIONS'));
        const weapons = ['Empty', 'AIM-120D', 'AIM-9X', 'AGM-88', 'GBU-31 JDAM', 'AGM-84', 'Drop Tank', 'ECM Pod'];
        for (let s = 1; s <= 9; s++) {
            const row = this.el('div', 'lo-station');
            row.appendChild(this.el('span', 'lo-station__label', `STA ${s}`));
            const sel = document.createElement('select');
            sel.className = 'lo-station__select';
            for (const w of weapons) {
                const opt = document.createElement('option');
                opt.value = w; opt.textContent = w;
                sel.appendChild(opt);
            }
            row.appendChild(sel);
            this.element.appendChild(row);
        }
    }
}
