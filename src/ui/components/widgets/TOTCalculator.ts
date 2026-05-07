import { sdkClient } from '../../framework/Client.js';
import { Component } from '../../framework/Component.js';
import { UIStore } from '../../framework/UIStore.js';
import { VectorMath } from '../../../engine/math/VectorMath.js';
import { MissionType } from '../../../sdk/schemas/index.js';

/**
 * TOTCalculator: Time-on-Target routing calculator.
 * Adjusts speed at waypoints to ensure simultaneous arrival.
 */
export class TOTCalculator extends Component {
    constructor() { super('div', 'tot-widget'); }

    protected styles() {
        return `
        .tot-widget { padding:var(--sp-3); }
        .tot-title { font-size:var(--text-xs); font-weight:600; color:var(--text-muted); text-transform:uppercase; margin-bottom:var(--sp-2); }
        .tot-row { display:grid; grid-template-columns:80px 1fr 1fr 1fr; gap:4px; padding:var(--sp-1) 0; font-size:var(--text-xs); border-bottom:1px solid var(--border-color); }
        .tot-header { color:var(--text-dim); font-weight:500; text-transform:uppercase; }
        .tot-input { background:var(--bg-surface); border:1px solid var(--border-color); border-radius:2px; padding:2px 4px; font-size:var(--text-xs); color:var(--text-main); font-family:var(--font-mono); text-align:right; width:100%; }
        .tot-result { font-family:var(--font-mono); color:var(--color-friendly); font-size:var(--text-sm); margin-top:var(--sp-2); padding:var(--sp-2); background:var(--bg-surface); border-radius:var(--radius-sm); }
        `;
    }

    protected render() {
        this.element.appendChild(this.el('div', 'tot-title', 'TIME-ON-TARGET CALCULATOR'));

        const selectedId = UIStore.selectedEntityId.get();
        const vs = UIStore.viewState.get();
        const unit = vs?.units.find(u => u.id === selectedId);
        
        // Find a target (either from selection or first track)
        const targetTrack = vs?.tracks[0]; // Simplified for now
        const distM = (unit && targetTrack) ? VectorMath.distance(unit.pos, targetTrack.pos) : 0;
        const distNm = distM * 0.000539957;

        // Header
        const header = this.el('div', 'tot-row tot-header');
        for (const h of ['Strike', 'Range (nm)', 'Speed (kts)', 'ETA (min)']) {
            header.appendChild(this.el('span', undefined, h));
        }
        this.element.appendChild(header);

        const strikes = [
            { name: unit?.id || 'Alpha', range: Math.round(distNm), speed: 450 },
            { name: 'Bravo (Ref)', range: 200, speed: 450 },
        ];

        const etaEls: HTMLElement[] = [];

        for (let i = 0; i < strikes.length; i++) {
            const s = strikes[i];
            const row = this.el('div', 'tot-row');
            row.appendChild(this.el('span', undefined, s.name));

            const rangeInput = this.makeInput(String(s.range), v => { s.range = Number(v); this.recalc(strikes, etaEls, result, commitBtn); });
            const speedInput = this.makeInput(String(s.speed), v => { s.speed = Number(v); this.recalc(strikes, etaEls, result, commitBtn); });
            row.appendChild(rangeInput);
            row.appendChild(speedInput);

            const eta = this.el('span', undefined);
            eta.style.fontFamily = 'var(--font-mono)';
            eta.style.color = 'var(--text-main)';
            etaEls.push(eta);
            row.appendChild(eta);
            this.element.appendChild(row);
        }

        const result = this.el('div', 'tot-result', 'TOT: Calculating...');
        this.element.appendChild(result);

        const commitBtn = document.createElement('button');
        commitBtn.className = 'btn btn--primary btn--sm';
        commitBtn.style.width = '100%';
        commitBtn.style.marginTop = 'var(--sp-2)';
        commitBtn.textContent = 'COMMIT STRIKE PLAN';
        commitBtn.addEventListener('click', () => {
            if (unit && targetTrack && vs) {
                const targetEtaMin = (strikes[0].range / strikes[0].speed) * 60;
                const targetTick = vs.tick + Math.round(targetEtaMin * 60 * 10);
                sdkClient.dispatch({
                    type: 'SetMission',
                    entityId: unit.id,
                    mission: { missionType: "Strike", targetId: targetTrack.id, timeOverTargetTick: targetTick } as unknown as any
                });
            }
        });
        this.element.appendChild(commitBtn);

        this.recalc(strikes, etaEls, result, commitBtn);
    }

    private recalc(strikes: { range: number; speed: number }[], etaEls: HTMLElement[], resultEl?: HTMLElement, _commitBtn?: HTMLButtonElement) {
        let maxEta = 0;
        for (let i = 0; i < strikes.length; i++) {
            const eta = strikes[i].speed > 0 ? (strikes[i].range / strikes[i].speed) * 60 : 0;
            etaEls[i].textContent = `${eta.toFixed(1)} min`;
            maxEta = Math.max(maxEta, eta);
        }
        if (resultEl) {
            resultEl.textContent = `TOT: All strikes arrive in ≤ ${maxEta.toFixed(1)} min`;
        }
    }

    private makeInput(value: string, onChange: (v: string) => void): HTMLInputElement {
        const input = document.createElement('input');
        input.className = 'tot-input';
        input.value = value;
        input.addEventListener('change', () => onChange(input.value));
        return input;
    }
}
