import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { commandDispatcher } from '../../framework/CommandDispatcher';

/**
 * TOTCalculator: Time-on-Target routing calculator.
 * Adjusts speed at waypoints to ensure simultaneous arrival.
 * Ported to V2 with real ViewState binding.
 */
export class TOTCalculator extends Component {
    constructor() {
        super('div', 'tot-widget');
    }

    protected styles(): string {
        return `
            .tot-widget {
                padding: var(--sp-2);
                background: var(--bg-surface);
                border-radius: var(--radius-md);
                border: 1px solid var(--border-color);
            }
            .tot-title {
                font-size: var(--text-xs);
                font-weight: 700;
                color: var(--text-muted);
                text-transform: uppercase;
                margin-bottom: var(--sp-2);
                letter-spacing: 0.05em;
            }
            .tot-row {
                display: grid;
                grid-template-columns: 80px 1fr 1fr 1fr;
                gap: 4px;
                padding: var(--sp-1) 0;
                font-size: var(--text-xs);
                border-bottom: 1px solid var(--border-color);
                align-items: center;
            }
            .tot-header {
                color: var(--text-dim);
                font-weight: 600;
                text-transform: uppercase;
            }
            .tot-input {
                background: var(--bg-base);
                border: 1px solid var(--border-color);
                border-radius: 2px;
                padding: 2px 4px;
                font-size: var(--text-xs);
                color: var(--text-main);
                font-family: var(--font-mono);
                text-align: right;
                width: 100%;
                outline: none;
            }
            .tot-input:focus { border-color: var(--color-friendly); }
            
            .tot-result {
                font-family: var(--font-mono);
                color: var(--color-friendly);
                font-size: var(--text-xs);
                margin-top: var(--sp-3);
                padding: var(--sp-2);
                background: var(--bg-active);
                border-radius: var(--radius-sm);
                border: 1px solid rgba(0, 212, 255, 0.2);
            }

            .tot-empty {
                padding: var(--sp-4);
                text-align: center;
                color: var(--text-dim);
                font-style: italic;
                font-size: var(--text-xs);
            }
        `;
    }

    protected render(): void {
        this.subscribe(UIStore.selectedEntityId, () => this.refresh());
        this.subscribe(UIStore.viewState, () => this.refresh());
    }

    private refresh() {
        const selectedId = UIStore.selectedEntityId.get();
        const vs = UIStore.viewState.get();
        const unit = vs?.units.find(u => u.id === selectedId);

        this.element.innerHTML = '';
        this.element.appendChild(this.el('div', 'tot-title', 'TIME-ON-TARGET CALCULATOR'));

        if (!unit || !unit.waypoints || unit.waypoints.length === 0) {
            this.element.appendChild(this.el('div', 'tot-empty', 'Select a unit with active waypoints to calculate TOT.'));
            return;
        }

        // Header
        const header = this.el('div', 'tot-row tot-header');
        ['Waypoint', 'Range (nm)', 'Speed (kts)', 'ETA (min)'].forEach(h => {
            header.appendChild(this.el('span', undefined, h));
        });
        this.element.appendChild(header);

        const etaEls: HTMLElement[] = [];
        const waypointData = unit.waypoints.map((wp: any, index: number) => {
            // Range from previous waypoint or unit pos
            const prevPos = index === 0 ? unit.pos : unit.waypoints[index - 1].pos;
            const distM = Math.sqrt(Math.pow(wp.pos.x - prevPos.x, 2) + Math.pow(wp.pos.y - prevPos.y, 2) + Math.pow(wp.pos.z - prevPos.z, 2));
            const rangeNm = distM / 1852;
            const speedKts = wp.speedKts || unit.desiredSpeedKts || 450;

            const row = this.el('div', 'tot-row');
            row.appendChild(this.el('span', undefined, `WP ${index + 1}`));
            
            const rangeInput = this.makeInput(rangeNm.toFixed(1), () => this.recalc(waypointData, etaEls, resultEl));
            const speedInput = this.makeInput(String(Math.round(speedKts)), (val) => {
                wp.speedKts = Number(val);
                this.recalc(waypointData, etaEls, resultEl);
            });
            
            row.appendChild(rangeInput);
            row.appendChild(speedInput);

            const etaEl = this.el('span', 'val-mono', '0.0 min');
            etaEls.push(etaEl);
            row.appendChild(etaEl);

            this.element.appendChild(row);

            return { range: rangeNm, speed: speedKts, wp };
        });

        const resultEl = this.el('div', 'tot-result', 'Calculating TOT...');
        this.element.appendChild(resultEl);

        const commitBtn = document.createElement('button');
        commitBtn.className = 'btn btn--primary btn--sm';
        commitBtn.style.width = '100%';
        commitBtn.style.marginTop = 'var(--sp-2)';
        commitBtn.textContent = 'UPDATE WAYPOINT SPEEDS';
        commitBtn.onclick = () => {
            waypointData.forEach((wd: any) => {
                commandDispatcher.dispatch({
                    type: 'SetWaypointSpeed',
                    entityId: unit.id,
                    waypointId: wd.wp.id,
                    speedKts: wd.speed
                });
            });
        };
        this.element.appendChild(commitBtn);

        this.recalc(waypointData, etaEls, resultEl);
    }

    private recalc(data: any[], etaEls: HTMLElement[], resultEl: HTMLElement) {
        let totalEta = 0;
        data.forEach((d, i) => {
            const eta = d.speed > 0 ? (d.range / d.speed) * 60 : 0;
            totalEta += eta;
            etaEls[i].textContent = `${eta.toFixed(1)} min`;
        });
        resultEl.textContent = `TOTAL TIME OVER TARGET: ${totalEta.toFixed(1)} min`;
    }

    private makeInput(value: string, onChange: (v: string) => void): HTMLInputElement {
        const input = document.createElement('input');
        input.className = 'tot-input';
        input.value = value;
        input.onchange = () => onChange(input.value);
        return input;
    }
}
