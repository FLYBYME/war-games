import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

/**
 * WRAWindow: Weapon Release Authorization rule builder.
 * Ported to V2 WindowManager architecture.
 */
export class WRAWindow extends Component {
    private rulesEl!: HTMLElement;
    private rules: any[] = [];
    private selectedId: string | null = null;

    constructor() { super('div', 'wra-widget'); }

    protected styles() {
        return `
        .wra-widget { padding: var(--sp-3); display: flex; flex-direction: column; gap: var(--sp-2); height: 100%; box-sizing: border-box; }
        .wra-title { font-size: var(--text-xs); font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--sp-2); display: flex; justify-content: space-between; align-items: center; letter-spacing: 0.05em; }
        .wra-rule { display: grid; grid-template-columns: 1fr 50px 60px 1fr 30px; gap: 4px; align-items: center; padding: var(--sp-1) 0; border-bottom: 1px solid var(--border-color); font-size: var(--text-xs); }
        .wra-input { background: var(--bg-base); border: 1px solid var(--border-color); border-radius: 2px; padding: 4px; font-size: var(--text-xs); color: var(--text-main); font-family: var(--font-mono); width: 100%; outline: none; }
        .wra-input:focus { border-color: var(--color-friendly); }
        .wra-del { cursor: pointer; color: var(--accent-danger); text-align: center; font-size: 14px; width: 24px; transition: background 0.2s; }
        .wra-del:hover { background: rgba(239, 68, 68, 0.1); }
        .wra-header { color: var(--text-dim); font-weight: 600; text-transform: uppercase; background: var(--bg-header); padding: var(--sp-1) 0; }
        .wra-empty { color: var(--text-dim); text-align: center; padding: var(--sp-4); font-style: italic; }
        .wra-content { flex: 1; overflow-y: auto; }
        `;
    }

    protected render() {
        this.element.innerHTML = '';
        
        const header = this.el('div', 'wra-title');
        header.appendChild(this.el('span', undefined, 'WEAPON RELEASE AUTHORIZATION'));
        
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn--ghost btn--xs';
        addBtn.textContent = '+ ADD RULE';
        addBtn.addEventListener('click', () => {
            this.rules.push({ targetType: 'Any', weaponType: 'Any', quantity: 1, maxRangePct: 0.75 });
            this.rebuildRules();
            this.saveRules();
        });
        header.appendChild(addBtn);
        this.element.appendChild(header);

        const headRow = this.el('div', 'wra-rule wra-header');
        ['Target Type', 'Qty', 'Range%', 'Weapon', '✕'].forEach(h => {
            headRow.appendChild(this.el('span', undefined, h));
        });
        this.element.appendChild(headRow);

        this.rulesEl = this.el('div', 'wra-content');
        this.element.appendChild(this.rulesEl);
        
        this.refreshFromState();
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
        if (!this.rulesEl) return;
        
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
            this.rulesEl.appendChild(this.el('div', 'wra-empty', 'No active WRA rules for selected unit.'));
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
        if (this.selectedId && UIStore.client) {
            UIStore.client.dispatch({
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
