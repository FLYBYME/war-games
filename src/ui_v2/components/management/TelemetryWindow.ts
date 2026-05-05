import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

/**
 * TelemetryWindow: Running tally of destroyed units and expended munitions.
 * Ported to V2 WindowManager architecture.
 */
export class TelemetryWindow extends Component {
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private blueHistory: number[] = [];
    private redHistory: number[] = [];
    private munitionsExpended = 0;

    constructor() { super('div', 'losses-widget'); }

    protected styles() {
        return `
        .losses-widget { padding: var(--sp-3); display: flex; flex-direction: column; gap: var(--sp-2); }
        .lg-title { font-size: var(--text-xs); font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--sp-2); letter-spacing: 0.05em; }
        .lg-canvas { width: 100%; height: 120px; background: var(--bg-base); border: 1px solid var(--border-color); border-radius: var(--radius-sm); }
        .lg-stats { display: flex; gap: var(--sp-4); margin-top: var(--sp-2); font-size: var(--text-xs); font-family: var(--font-mono); background: var(--bg-surface); padding: var(--sp-2); border-radius: var(--radius-sm); border: 1px solid var(--border-color); }
        .lg-stat { display: flex; flex-direction: column; gap: 2px; }
        .lg-stat__label { color: var(--text-dim); text-transform: uppercase; font-weight: 600; }
        .lg-stat__value { font-size: var(--text-lg); font-weight: 700; }
        .lg-stat__value--blue { color: var(--color-friendly); }
        .lg-stat__value--red { color: var(--color-hostile); }
        .lg-stat__value--mun { color: var(--accent-warning); }
        `;
    }

    protected render() {
        this.element.innerHTML = '';
        this.element.appendChild(this.el('div', 'lg-title', 'LOSSES & EXPENDITURES'));

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'lg-canvas';
        this.canvas.width = 300;
        this.canvas.height = 120;
        this.element.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d')!;

        const stats = this.el('div', 'lg-stats');
        const blueStat = this.makeStat('Blue', '0', 'lg-stat__value--blue');
        const redStat = this.makeStat('Red', '0', 'lg-stat__value--red');
        const munStat = this.makeStat('Munitions', '0', 'lg-stat__value--mun');
        stats.append(blueStat.el, redStat.el, munStat.el);
        this.element.appendChild(stats);

        this.subscribe(UIStore.viewState, vs => {
            if (!vs) return;
            const blueLosses = vs.losses?.blue || 0;
            const redLosses = vs.losses?.red || 0;
            
            this.blueHistory.push(blueLosses);
            this.redHistory.push(redLosses);
            if (this.blueHistory.length > 100) { this.blueHistory.shift(); this.redHistory.shift(); }

            blueStat.valueEl.textContent = String(blueLosses);
            redStat.valueEl.textContent = String(redLosses);
            munStat.valueEl.textContent = String(this.munitionsExpended);
            this.drawGraph();
        });
    }

    private drawGraph() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, 300, 120);
        this.drawLine(this.blueHistory, '#00d4ff', 120);
        this.drawLine(this.redHistory, '#ff2d55', 120);
    }

    private drawLine(data: number[], color: string, height: number) {
        if (data.length < 2) return;
        const max = Math.max(...data, 1);
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < data.length; i++) {
            const x = (i / (data.length - 1)) * 300;
            const y = height - (data[i] / max) * (height - 10);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    private makeStat(label: string, value: string, valueClass: string) {
        const el = this.el('div', 'lg-stat');
        el.appendChild(this.el('span', 'lg-stat__label', label));
        const valueEl = this.el('span', `lg-stat__value ${valueClass}`, value);
        el.appendChild(valueEl);
        return { el, valueEl };
    }
}
