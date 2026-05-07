import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { WRARule } from '../../../sdk/schemas/domain.js';

/**
 * WRAEditor: Policy editor for Weapon Release Authority.
 */
export class WRAEditor extends Component {
    private rules: WRARule[] = [];
    private listEl!: HTMLElement;

    constructor() {
        super('div', 'wra-editor', 'wra-editor');
    }

    protected styles(): string {
        return `
            .wra-editor { padding: var(--sp-4); background: var(--bg-panel); border: 1px solid var(--border-color); }
            .wra-row { display: grid; grid-template-columns: 80px 100px 40px 60px 1fr; gap: 8px; padding: 4px 0; border-bottom: 1px solid var(--border-color); align-items: center; }
            .wra-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; }
        `;
    }

    protected render(): void {
        this.element.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 10px;">ENGAGEMENT POLICIES (WRA)</div>
            <div class="wra-row" style="border: none;">
                <span class="wra-label">Target</span>
                <span class="wra-label">Weapon</span>
                <span class="wra-label">Qty</span>
                <span class="wra-label">Range %</span>
                <span></span>
            </div>
            <div id="wra-list"></div>
            <button id="btn-add-wra" style="margin-top: 10px; font-size: 11px;">+ ADD POLICY</button>
        `;

        this.listEl = this.element.querySelector('#wra-list') as HTMLElement;
        const addBtn = this.element.querySelector('#btn-add-wra') as HTMLButtonElement;
        
        this.listen(addBtn, 'click', () => {
            this.rules.push({ targetType: 'Any', weaponType: 'Any', quantity: 1, maxRangePct: 0.75 });
            this.sync();
        });

        this.subscribe(UIStore.selectedEntityId, () => {
            // Mock fetching rules for entity
            this.rules = [
                { targetType: 'Air', weaponType: 'Any', quantity: 2, maxRangePct: 0.8 },
                { targetType: 'Surface', weaponType: 'Any', quantity: 1, maxRangePct: 0.5 }
            ];
            this.sync();
        });
    }

    private sync() {
        this.listEl.innerHTML = '';
        this.rules.forEach((r, idx) => {
            const row = this.el('div', 'wra-row');
            row.innerHTML = `
                <div style="font-size: 11px;">${r.targetType}</div>
                <div style="font-size: 11px;">${r.weaponType}</div>
                <div style="font-size: 11px;">${r.quantity}</div>
                <div style="font-size: 11px;">${(r.maxRangePct || 1) * 100}%</div>
                <button class="btn-del" style="background: none; border: none; color: var(--accent-danger); cursor: pointer;">X</button>
            `;
            
            this.listen(row.querySelector('.btn-del')!, 'click', () => {
                this.rules.splice(idx, 1);
                this.sync();
            });

            this.listEl.appendChild(row);
        });
    }
}
