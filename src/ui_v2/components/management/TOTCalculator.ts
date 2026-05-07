import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';


/**
 * TOTCalculator: Time-Over-Target tool.
 * Computes required speed for coordinated arrivals.
 */
export class TOTCalculator extends Component {
    private targetTimeInput!: HTMLInputElement;
    private resultsEl!: HTMLElement;

    constructor() {
        super('div', 'tot-calculator', 'tot-calculator');
    }

    protected styles(): string {
        return `
            .tot-calculator { padding: 15px; background: #111; color: #ddd; }
            .tot-header { font-weight: bold; font-size: 12px; margin-bottom: 10px; color: #888; }
            input { background: #000; border: 1px solid #333; color: #fff; padding: 4px; font-family: monospace; }
            .tot-results { margin-top: 15px; display: flex; flex-direction: column; gap: 8px; }
            .tot-row { display: flex; justify-content: space-between; font-size: 11px; }
            .req-speed { color: #00d1ff; font-weight: bold; }
        `;
    }

    protected render(): void {
        this.element.innerHTML = `
            <div class="tot-header">COORDINATED ARRIVAL (TOT)</div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <span style="font-size: 10px; color: #666;">TARGET TICK:</span>
                <input type="number" id="tot-input" value="1000">
            </div>
            <div id="tot-results" class="tot-results"></div>
        `;

        this.targetTimeInput = this.element.querySelector('#tot-input') as HTMLInputElement;
        this.resultsEl = this.element.querySelector('#tot-results') as HTMLElement;

        this.listen(this.targetTimeInput, 'input', () => this.sync());
        this.subscribe(UIStore.viewState, () => this.sync());
    }

    private sync() {
        const vs = UIStore.viewState.get();
        if (!vs || !this.resultsEl) return;

        const targetTick = parseInt(this.targetTimeInput.value);
        if (isNaN(targetTick)) return;

        this.resultsEl.innerHTML = '';
        
        // Multi-select or selected unit?
        const units = vs.units.slice(0, 5); // Just show first 5 for now

        units.forEach(u => {
            const row = this.el('div', 'tot-row');
            const dist = 50000; // Mock distance to objective for now
            const remainingTicks = targetTick - vs.tick;
            
            if (remainingTicks <= 0) {
                row.innerHTML = `<span>${u.id}</span> <span style="color: #666;">EXPIRED</span>`;
            } else {
                const reqSpeedMPS = dist / (remainingTicks * 0.1);
                const reqSpeedKts = Math.round(reqSpeedMPS * 1.94384);
                row.innerHTML = `<span>${u.id}</span> <span class="req-speed">${reqSpeedKts} KTS</span>`;
            }
            this.resultsEl.appendChild(row);
        });
    }
}
