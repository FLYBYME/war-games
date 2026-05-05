import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

/**
 * TimeCompressionSafety: Auto-pause triggers and log severity filters.
 */
export class TimeCompressionSafety extends Component {
    constructor() { super('div', 'tcs-widget'); }

    protected styles() {
        return `
        .tcs-widget { padding:var(--sp-3); }
        .tcs-title { font-size:var(--text-xs); font-weight:600; color:var(--text-muted); text-transform:uppercase; margin-bottom:var(--sp-2); }
        .tcs-section { margin-bottom:var(--sp-3); }
        .tcs-check { display:flex; align-items:center; gap:var(--sp-2); padding:var(--sp-1) 0; font-size:var(--text-sm); cursor:pointer; }
        .tcs-checkbox { width:14px; height:14px; accent-color:var(--color-friendly); cursor:pointer; }
        .tcs-label { color:var(--text-main); }
        `;
    }

    protected render() {
        // Auto-pause triggers
        this.element.appendChild(this.el('div', 'tcs-title', 'AUTO-PAUSE TRIGGERS'));
        const triggers = this.el('div', 'tcs-section');

        const autoPauseItems: { label: string; signal: typeof UIStore.autoPauseOnNewHostile }[] = [
            { label: 'New Hostile Contact', signal: UIStore.autoPauseOnNewHostile },
            { label: 'Weapon Fired', signal: UIStore.autoPauseOnWeaponFired },
            { label: 'Unit Destroyed', signal: UIStore.autoPauseOnUnitDestroyed },
        ];

        for (const item of autoPauseItems) {
            const row = this.el('div', 'tcs-check');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'tcs-checkbox';
            cb.checked = item.signal.get();
            cb.addEventListener('change', () => item.signal.set(cb.checked));
            row.appendChild(cb);
            row.appendChild(this.el('span', 'tcs-label', item.label));
            triggers.appendChild(row);
        }
        this.element.appendChild(triggers);

        // Log severity filters
        this.element.appendChild(this.el('div', 'tcs-title', 'LOG SEVERITY FILTERS'));
        const filters = this.el('div', 'tcs-section');
        const severities = ['Info', 'Warning', 'Critical', 'Combat'];
        const currentFilters = UIStore.logFilterSeverity.get();

        for (const sev of severities) {
            const row = this.el('div', 'tcs-check');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'tcs-checkbox';
            cb.checked = currentFilters.has(sev);
            cb.addEventListener('change', () => {
                const set = UIStore.logFilterSeverity.get();
                if (cb.checked) set.add(sev); else set.delete(sev);
                UIStore.logFilterSeverity.set(new Set(set));
            });
            row.appendChild(cb);
            row.appendChild(this.el('span', 'tcs-label', sev));
            filters.appendChild(row);
        }
        this.element.appendChild(filters);

        // Category filters
        this.element.appendChild(this.el('div', 'tcs-title', 'LOG CATEGORY FILTERS'));
        const catFilters = this.el('div', 'tcs-section');
        const categories = ['SYSTEM', 'COMBAT', 'SENSORS', 'NAV', 'EW', 'LOGISTICS'];
        const currentCatFilters = UIStore.logFilterCategory.get();

        for (const cat of categories) {
            const row = this.el('div', 'tcs-check');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'tcs-checkbox';
            cb.checked = currentCatFilters.has(cat);
            cb.addEventListener('change', () => {
                const set = UIStore.logFilterCategory.get();
                if (cb.checked) set.add(cat); else set.delete(cat);
                UIStore.logFilterCategory.set(new Set(set));
            });
            row.appendChild(cb);
            row.appendChild(this.el('span', 'tcs-label', cat));
            catFilters.appendChild(row);
        }
        this.element.appendChild(catFilters);
    }
}
