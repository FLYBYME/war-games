import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { WRARule } from '../../../sdk/schemas/domain.js';

/**
 * WRAWindow: Weapon Release Authority editor.
 * Configures engagement rules based on target classification.
 */
export class WRAWindow extends Component {
    private rules: WRARule[] = [];
    private rulesListEl!: HTMLElement;

    constructor() {
        super('div', 'wra-window', 'wra-window');
    }

    protected styles(): string {
        return `
            .wra-window { padding: 15px; background: #111; color: #ddd; }
            .rule-row {
                display: grid;
                grid-template-columns: 100px 100px 60px 60px 1fr;
                gap: 8px;
                padding: 6px 0;
                border-bottom: 1px solid #222;
                align-items: center;
            }
            .label { font-size: 10px; color: #666; text-transform: uppercase; }
            input, select { background: #000; border: 1px solid #333; color: #fff; font-size: 11px; padding: 2px 4px; }
            .btn-add { background: #006644; color: white; border: none; padding: 4px 10px; cursor: pointer; margin-top: 10px; font-size: 11px; }
        `;
    }

    protected render(): void {
        this.element.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;">WRA Policies</div>
            <div class="rule-row" style="border: none;">
                <span class="label">Target</span>
                <span class="label">Weapon</span>
                <span class="label">Qty</span>
                <span class="label">Range %</span>
                <span></span>
            </div>
            <div id="rules-list"></div>
            <button class="btn-add" id="btn-add-rule">+ NEW RULE</button>
        `;

        this.rulesListEl = this.element.querySelector('#rules-list') as HTMLElement;
        const addBtn = this.element.querySelector('#btn-add-rule') as HTMLButtonElement;
        this.listen(addBtn, 'click', () => this.addDefaultRule());

        // Sync with selected entity
        this.subscribe(UIStore.selectedEntityId, () => this.sync());
    }

    private sync() {
        const entityId = UIStore.selectedEntityId.get();
        if (!entityId) return;

        // In a real app, we'd fetch WRA from the engine via SDK
        // For now, use a default set
        if (this.rules.length === 0) {
            this.rules = [
                { targetType: 'Air', weaponType: 'Any', quantity: 2, maxRangePct: 0.8 },
                { targetType: 'Surface', weaponType: 'Any', quantity: 1, maxRangePct: 0.5 }
            ];
        }
        this.refreshList();
    }

    private refreshList() {
        this.rulesListEl.innerHTML = '';
        this.rules.forEach((rule, idx) => {
            const row = this.el('div', 'rule-row');
            
            const targetSelect = document.createElement('select');
            ['Air', 'Surface', 'Subsurface', 'Any'].forEach(t => {
                const opt = document.createElement('option');
                opt.value = t; opt.textContent = t;
                if (t === rule.targetType) opt.selected = true;
                targetSelect.appendChild(opt);
            });

            const qtyInput = document.createElement('input');
            qtyInput.type = 'number'; qtyInput.value = String(rule.quantity || 1);
            qtyInput.style.width = '40px';

            row.appendChild(targetSelect);
            row.appendChild(this.el('div', '', rule.weaponType || 'Any'));
            row.appendChild(qtyInput);
            row.appendChild(this.el('div', '', `${(rule.maxRangePct || 1) * 100}%`));
            
            const delBtn = this.el('button', '', 'X');
            delBtn.style.background = '#441111'; delBtn.style.color = '#fff'; delBtn.style.border = 'none';
            this.listen(delBtn, 'click', () => {
                this.rules.splice(idx, 1);
                this.refreshList();
            });
            row.appendChild(delBtn);

            this.rulesListEl.appendChild(row);
        });
    }

    private addDefaultRule() {
        this.rules.push({ targetType: 'Any', weaponType: 'Any', quantity: 1, maxRangePct: 0.75 });
        this.refreshList();
    }
}
