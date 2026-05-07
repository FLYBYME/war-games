import { Component } from '../framework/Component';
import { UIStore, ViewUnit, ViewState } from '../framework/UIStore';
import { ListManager } from '../framework/ListManager';

/**
 * ForceOOB: Displays the current Order of Battle for the player's side.
 * Reactive to UIStore.viewState and handles unit selection.
 */
export class ForceOOB extends Component {
    private listContainer: HTMLElement | null = null;
    private summaryArea: HTMLElement | null = null;
    private listManager: ListManager<ViewUnit> | null = null;
    
    private unitsStatEl: HTMLElement | null = null;
    private lossesStatEl: HTMLElement | null = null;

    constructor() {
        super('div', 'force-oob', 'force-oob');
    }

    private units: ViewUnit[] = [];
    private itemHeight = 44; // px
    private buffer = 5;

    protected styles(): string {
        return `
            .force-oob {
                display: flex;
                flex-direction: column;
                width: 100%;
                height: 100%;
                background: var(--bg-panel);
                border-right: 1px solid var(--border-color);
                font-size: var(--text-sm);
            }

            .oob-header {
                padding: var(--sp-3);
                background: var(--bg-header);
                border-bottom: 1px solid var(--border-color);
                font-weight: 600;
                letter-spacing: 0.05em;
                color: var(--text-muted);
                display: flex;
                justify-content: space-between;
                align-items: center;
                text-transform: uppercase;
            }

            .oob-summary {
                padding: var(--sp-2) var(--sp-3);
                background: var(--bg-base);
                border-bottom: 1px solid var(--border-color);
                display: flex;
                gap: var(--sp-4);
                color: var(--text-dim);
                font-size: var(--text-xs);
            }

            .summary-stat b { color: var(--text-main); }
            .stat-loss { color: var(--accent-danger); }

            .oob-list {
                flex: 1;
                overflow-y: auto;
                position: relative;
            }

            .oob-scroll-spacer {
                width: 100%;
                position: absolute;
                top: 0;
                left: 0;
                pointer-events: none;
            }

            .unit-item {
                position: absolute;
                width: 100%;
                height: 44px;
                padding: 0 var(--sp-3);
                display: flex;
                align-items: center;
                gap: var(--sp-3);
                cursor: pointer;
                border-left: 2px solid transparent;
                transition: background var(--transition-fast);
                box-sizing: border-box;
            }
            .unit-item:hover {
                background: var(--bg-hover);
            }
            .unit-item.selected {
                background: var(--bg-active);
                border-left-color: var(--color-friendly);
            }

            .unit-icon {
                width: 14px;
                height: 14px;
                border: 1px solid var(--color-friendly);
                border-radius: 1px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 8px;
                color: var(--color-friendly);
                flex-shrink: 0;
            }

            .unit-info {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            .unit-name {
                color: var(--text-main);
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .unit-subtext {
                font-size: var(--text-xs);
                color: var(--text-muted);
            }

            .unit-status {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 4px;
            }

            .fuel-bar-mini {
                width: 32px;
                height: 3px;
                background: var(--bg-active);
                border-radius: 1px;
                overflow: hidden;
            }
            .fuel-fill-mini {
                height: 100%;
                background: var(--accent-success);
            }
            .fuel-fill-mini.low { background: var(--accent-warning); }
            .fuel-fill-mini.critical { background: var(--accent-danger); }
        `;
    }

    protected render(): void {
        const header = this.el('div', 'oob-header', 'FORCE OOB');
        const summary = this.el('div', 'oob-summary', '', 'oob-summary');
        const list = this.el('div', 'oob-list', '', 'oob-list');
        const spacer = this.el('div', 'oob-scroll-spacer', '', 'oob-spacer');
        list.appendChild(spacer);

        this.summaryArea = summary;
        this.listContainer = list;

        this.unitsStatEl = this.el('div', 'summary-stat');
        this.lossesStatEl = this.el('div', 'summary-stat');
        this.summaryArea.appendChild(this.unitsStatEl);
        this.summaryArea.appendChild(this.lossesStatEl);

        this.element.appendChild(header);
        this.element.appendChild(summary);
        this.element.appendChild(list);

        // Virtual List Manager
        this.listManager = new ListManager<ViewUnit>({
            container: list,
            keySelector: (u) => u.id,
            renderItem: (u) => this.createUnitItem(u),
            updateItem: (u, el) => this.updateUnitItem(u, el)
        });

        // Scroll listener for virtualization
        this.listen(list, 'scroll', () => this.syncVirtualList());

        // Subscribe to ViewState for unit updates
        this.subscribe(UIStore.viewState, (vs: ViewState | null) => {
            if (!vs) return;
            this.units = vs.units;
            this.syncVirtualList();
            this.updateSummary(vs);
        });
        
        // Subscribe to Selection
        this.subscribe(UIStore.selectedEntityId, () => this.syncVirtualList());
    }

    private syncVirtualList() {
        if (!this.listManager || !this.listContainer) return;

        const container = this.listContainer;
        const scrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;

        const totalItems = this.units.length;
        const spacer = container.querySelector('[data-testid="oob-spacer"]') as HTMLElement;
        if (spacer) spacer.style.height = `${totalItems * this.itemHeight}px`;

        const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.buffer);
        const endIndex = Math.min(totalItems, Math.ceil((scrollTop + containerHeight) / this.itemHeight) + this.buffer);

        const visibleItems = this.units.slice(startIndex, endIndex);
        this.listManager.sync(visibleItems);

        // Update positions of visible items
        visibleItems.forEach((unit, idx) => {
            const el = container.querySelector(`[data-testid="oob-unit-${unit.id}"]`) as HTMLElement;
            if (el) {
                el.style.top = `${(startIndex + idx) * this.itemHeight}px`;
            }
        });
    }

    private updateSummary(vs: ViewState) {
        if (!this.summaryArea || !vs || !this.unitsStatEl || !this.lossesStatEl) return;
        
        const unitsCount = vs.units.length;
        const losses = vs.losses?.blue || 0;

        this.unitsStatEl.innerHTML = `UNITS: <b>${unitsCount}</b>`;
        this.lossesStatEl.innerHTML = `LOSSES: <b class="stat-loss">${losses}</b>`;
    }

    private createUnitItem(unit: ViewUnit): HTMLElement {
        const item = this.el('div', 'unit-item', '', `oob-unit-${unit.id}`);
        
        this.listen(item, 'click', () => {
            UIStore.selectedEntityId.set(unit.id);
        });

        const icon = this.el('div', 'unit-icon', '□');
        const info = this.el('div', 'unit-info');
        info.appendChild(this.el('div', 'unit-name', unit.id, 'unit-name'));
        info.appendChild(this.el('div', 'unit-subtext', '', 'unit-subtext'));

        const status = this.el('div', 'unit-status');
        const fuelBar = this.el('div', 'fuel-bar-mini');
        const fuelFill = this.el('div', 'fuel-fill-mini', '', 'fuel-fill');
        
        fuelBar.appendChild(fuelFill);
        status.appendChild(fuelBar);

        item.appendChild(icon);
        item.appendChild(info);
        item.appendChild(status);

        this.updateUnitItem(unit, item);
        return item;
    }

    private updateUnitItem(unit: ViewUnit, element: HTMLElement) {
        // Update selection state
        element.classList.toggle('selected', UIStore.selectedEntityId.get() === unit.id);

        // Update subtext (dynamic)
        const subtext = element.querySelector('[data-testid="unit-subtext"]')!;
        subtext.textContent = `${unit.logState} • ${Math.round(unit.pos.z)}m`;

        // Update fuel (dynamic)
        const fuelFill = element.querySelector('[data-testid="fuel-fill"]') as HTMLElement;
        fuelFill.style.width = `${unit.fuelPct * 100}%`;
        fuelFill.classList.remove('low', 'critical');
        if (unit.fuelPct < 0.3) fuelFill.classList.add('low');
        if (unit.fuelPct < 0.15) fuelFill.classList.add('critical');
    }
}
