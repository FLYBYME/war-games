import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

/**
 * FuelBingoDashboard: Global list of airborne assets with fuel levels.
 */
export class FuelBingoDashboard extends Component {
    private listEl!: HTMLElement;

    constructor() { super('div', 'fuel-widget'); }

    protected styles() {
        return `
        .fuel-widget { padding:var(--sp-3); }
        .fw-title { font-size:var(--text-xs); font-weight:600; color:var(--text-muted); text-transform:uppercase; margin-bottom:var(--sp-2); }
        .fw-row { display:grid; grid-template-columns:1fr 60px 100px 60px; gap:4px; align-items:center; padding:var(--sp-1) 0; border-bottom:1px solid var(--border-color); font-size:var(--text-xs); }
        .fw-name { color:var(--text-main); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .fw-fuel { font-family:var(--font-mono); text-align:right; }
        .fw-bar { height:4px; background:var(--bg-surface); border-radius:2px; overflow:hidden; }
        .fw-bar__fill { height:100%; border-radius:2px; }
        .fw-bingo { font-family:var(--font-mono); text-align:right; }
        .fw-bingo--low { color:var(--accent-danger); font-weight:600; }
        .fw-header { color:var(--text-dim); font-weight:500; text-transform:uppercase; }
        `;
    }

    protected render() {
        this.element.appendChild(this.el('div', 'fw-title', 'FUEL & BINGO STATUS'));

        const header = this.el('div', 'fw-row fw-header');
        for (const h of ['Unit', 'Fuel %', 'Bar', 'Bingo']) {
            header.appendChild(this.el('span', undefined, h));
        }
        this.element.appendChild(header);

        this.listEl = this.el('div');
        this.element.appendChild(this.listEl);
    }

    protected onMount() {
        this.subscribe(UIStore.viewState, vs => {
            if (!vs) return;
            this.listEl.replaceChildren();

            for (const u of vs.units) {
                const fuelData = { fuelPct: u.fuelPct, isBingo: u.isBingo };
                if (!fuelData) continue;

                const fuelPct = fuelData.fuelPct * 100;
                const bingo = fuelData.isBingo;

                const row = this.el('div', 'fw-row');
                row.appendChild(this.el('span', 'fw-name', u.id));
                row.appendChild(this.el('span', 'fw-fuel', `${fuelPct.toFixed(0)}%`));

                const barWrap = this.el('div', 'fw-bar');
                const barFill = this.el('div', 'fw-bar__fill');
                barFill.style.width = `${fuelPct}%`;
                barFill.style.background = fuelPct > 50 ? 'var(--accent-success)' : fuelPct > 20 ? 'var(--accent-warning)' : 'var(--accent-danger)';
                barWrap.appendChild(barFill);
                row.appendChild(barWrap);

                const bingoEl = this.el('span', `fw-bingo${bingo ? ' fw-bingo--low' : ''}`, bingo ? 'BINGO' : 'OK');
                row.appendChild(bingoEl);

                this.listEl.appendChild(row);
            }
        });
    }
}
