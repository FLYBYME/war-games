import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

/**
 * LogisticsWindow: Global list of airborne assets with fuel levels.
 * Ported to V2 WindowManager architecture.
 */
export class LogisticsWindow extends Component {
    private listEl!: HTMLElement;

    constructor() { super('div', 'fuel-widget'); }

    protected styles() {
        return `
        .fuel-widget { padding: var(--sp-3); display: flex; flex-direction: column; gap: var(--sp-2); height: 100%; box-sizing: border-box; }
        .fw-title { font-size: var(--text-xs); font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--sp-2); letter-spacing: 0.05em; }
        .fw-row { display: grid; grid-template-columns: 1fr 60px 100px 60px; gap: 4px; align-items: center; padding: var(--sp-1) 0; border-bottom: 1px solid var(--border-color); font-size: var(--text-xs); }
        .fw-name { color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
        .fw-fuel { font-family: var(--font-mono); text-align: right; color: var(--text-main); }
        .fw-bar { height: 4px; background: var(--bg-hover); border-radius: 2px; overflow: hidden; border: 1px solid var(--border-color); }
        .fw-bar__fill { height: 100%; border-radius: 2px; }
        .fw-bingo { font-family: var(--font-mono); text-align: right; color: var(--color-neutral); font-weight: 600; }
        .fw-bingo--low { color: var(--accent-danger); }
        .fw-header { color: var(--text-dim); font-weight: 600; text-transform: uppercase; background: var(--bg-header); padding: var(--sp-1) 0; }
        .fw-content { flex: 1; overflow-y: auto; }
        .fw-empty { color: var(--text-dim); text-align: center; padding: var(--sp-4); font-style: italic; }
        `;
    }

    protected render() {
        this.element.innerHTML = '';
        this.element.appendChild(this.el('div', 'fw-title', 'FUEL & BINGO STATUS'));

        const header = this.el('div', 'fw-row fw-header');
        ['Unit', 'Fuel %', 'Bar', 'Bingo'].forEach(h => {
            header.appendChild(this.el('span', undefined, h));
        });
        this.element.appendChild(header);

        this.listEl = this.el('div', 'fw-content');
        this.element.appendChild(this.listEl);
    }

    protected onMount() {
        this.render();
        this.subscribe(UIStore.viewState, vs => {
            if (!vs || !this.listEl) return;
            this.listEl.replaceChildren();

            let count = 0;
            for (const u of vs.units) {
                // Check if they have fuel
                if (u.fuelPct === undefined || u.fuelPct === null) continue;
                
                count++;
                const fuelPct = u.fuelPct * 100;
                const bingo = u.isBingo;

                const row = this.el('div', 'fw-row');
                row.appendChild(this.el('span', 'fw-name', u.id.substring(0, 12)));
                row.appendChild(this.el('span', 'fw-fuel', `${fuelPct.toFixed(0)}%`));

                const barWrap = this.el('div', 'fw-bar');
                const barFill = this.el('div', 'fw-bar__fill');
                barFill.style.width = `${Math.max(0, Math.min(100, fuelPct))}%`;
                barFill.style.background = fuelPct > 50 ? 'var(--accent-success)' : fuelPct > 20 ? 'var(--accent-warning)' : 'var(--accent-danger)';
                barWrap.appendChild(barFill);
                row.appendChild(barWrap);

                const bingoEl = this.el('span', `fw-bingo${bingo ? ' fw-bingo--low' : ''}`, bingo ? 'BINGO' : 'OK');
                row.appendChild(bingoEl);

                this.listEl.appendChild(row);
            }
            
            if (count === 0) {
                this.listEl.appendChild(this.el('div', 'fw-empty', 'No units with fuel systems tracking.'));
            }
        });
    }
}
