import { sdkClient } from '../../framework/Client.js';
import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

/**
 * WRAEditor: Weapon Release Authorization rule builder.
 */
export class WRAEditor extends Component {
    private rulesEl!: HTMLElement;
    private rules: any[] = [];
    private selectedId: string | null = null;

    constructor() { super('div', 'wra-widget'); }

    protected styles() {
        return `
        .wra-widget { padding:var(--sp-3); }
        .wra-title { font-size:var(--text-xs); font-weight:600; color:var(--text-muted); text-transform:uppercase; margin-bottom:var(--sp-2); display:flex; justify-content:space-between; align-items:center; }
        .wra-rule { display:grid; grid-template-columns:1fr 50px 60px 1fr 30px; gap:4px; align-items:center; padding:var(--sp-1) 0; border-bottom:1px solid var(--border-color); font-size:var(--text-xs); }
        .wra-input { background:var(--bg-surface); border:1px solid var(--border-color); border-radius:2px; padding:2px 4px; font-size:var(--text-xs); color:var(--text-main); font-family:var(--font-mono); width:100%; }
        .wra-input:focus { border-color:var(--accent-warning); outline:none; }
        .wra-del { cursor:pointer; color:var(--accent-danger); text-align:center; }
        .wra-header { color:var(--text-dim); font-weight:500; text-transform:uppercase; }
        .wra-empty { color:var(--text-dim); text-align:center; padding:var(--sp-4); font-style:italic; }
        `;
    }

    protected render() {
        const header = this.el('div', 'wra-title');
        header.appendChild(this.el('span', undefined, 'WEAPON RELEASE AUTHORIZATION'));
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn--ghost btn--sm';
        addBtn.textContent = '+ Rule';
        addBtn.addEventListener('click', () => {
            this.rules.push({ targetType: 'Any', weaponType: 'Any', quantity: 1, maxRangePct: 0.75 });
            this.rebuildRules();
            this.saveRules();
        });
        header.appendChild(addBtn);
        this.element.appendChild(header);

        const headRow = this.el('div', 'wra-rule wra-header');
        for (const h of ['Target Type', 'Qty', 'Range%', 'Weapon', '']) {
            headRow.appendChild(this.el('span', undefined, h));
        }
        this.element.appendChild(headRow);

        this.rulesEl = this.el('div');
        this.element.appendChild(this.rulesEl);
    }

    protected onMount() {
        this.subscribe(UIStore.selectedEntityId, id => {
            this.selectedId = id;
            this.refreshFromState();
        });

        this.subscribe(UIStore.viewState, () => {
            this.refreshFromState();
        });
    }

    private refreshFromState() {
        if (!this.selectedId) {
            this.rules = [];
            this.rebuildRules();
            return;
        }

        const vs = UIStore.viewState.get();
        const unit = vs?.units.find((u: any) => u.id === this.selectedId);
        if (unit?.doctrine?.wraRules) {
            // Only update if length differs or something (to avoid losing focus while typing)
            if (JSON.stringify(this.rules) !== JSON.stringify(unit.doctrine.wraRules)) {
                this.rules = JSON.parse(JSON.stringify(unit.doctrine.wraRules));
                this.rebuildRules();
            }
        } else {
            this.rules = [];
            this.rebuildRules();
        }
    }

    private rebuildRules() {
        this.rulesEl.replaceChildren();
        if (this.rules.length === 0) {
            this.rulesEl.appendChild(this.el('div', 'wra-empty', 'No active WRA rules.'));
            return;
        }

        for (let i = 0; i < this.rules.length; i++) {
            const r = this.rules[i];
            const row = this.el('div', 'wra-rule');
            
            row.appendChild(this.makeInput(r.targetType, v => { r.targetType = v; this.saveRules(); }));
            row.appendChild(this.makeInput(String(r.quantity), v => { r.quantity = Number(v); this.saveRules(); }));
            row.appendChild(this.makeInput(`${Math.round((r.maxRangePct || 1.0) * 100)}%`, v => { 
                r.maxRangePct = parseInt(v) / 100; 
                this.saveRules(); 
            }));
            row.appendChild(this.makeInput(r.weaponType || 'Any', v => { r.weaponType = v; this.saveRules(); }));

            const del = this.el('span', 'wra-del', '✕');
            del.addEventListener('click', () => { 
                this.rules.splice(i, 1); 
                this.rebuildRules(); 
                this.saveRules();
            });
            row.appendChild(del);
            this.rulesEl.appendChild(row);
        }
    }

    private saveRules() {
        if (this.selectedId) {
            sdkClient.dispatch({
                type: 'UpdateWRARules' as any,
                entityId: this.selectedId,
                rules: this.rules
            });
        }
    }

    private makeInput(value: string, onChange: (v: string) => void): HTMLInputElement {
        const input = document.createElement('input');
        input.className = 'wra-input';
        input.value = value;
        input.addEventListener('change', () => onChange(input.value));
        return input;
    }
}
