import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { CommandDispatcher } from '../../framework/CommandDispatcher';

/**
 * FlightPlanEditor: Waypoint editor for NavigationComponent paths.
 * Ported to V2 with real ViewState binding.
 */
export class FlightPlanEditor extends Component {
    private tableBody!: HTMLElement;

    constructor() { super('div', 'fp-editor'); }

    protected styles() {
        return `
        .fp-editor { width: 100%; display: flex; flex-direction: column; gap: var(--sp-2); }
        .fp-title { font-size: var(--text-xs); font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--sp-2); display: flex; justify-content: space-between; align-items: center; letter-spacing: 0.05em; }
        .fp-table { width: 100%; border-collapse: collapse; font-size: var(--text-xs); font-family: var(--font-mono); background: var(--bg-base); border: 1px solid var(--border-color); border-radius: var(--radius-sm); overflow: hidden; }
        .fp-table th { background: var(--bg-header); color: var(--text-dim); padding: var(--sp-1) var(--sp-2); border: 1px solid var(--border-color); text-transform: uppercase; font-weight: 600; }
        .fp-table td { padding: 0; border: 1px solid var(--border-color); }
        .fp-input { width: 100%; background: transparent; border: none; color: var(--text-main); font-family: var(--font-mono); font-size: var(--text-xs); text-align: center; padding: 4px; outline: none; }
        .fp-input:focus { background: var(--bg-hover); color: var(--color-friendly); }
        .fp-del { cursor: pointer; color: var(--accent-danger); text-align: center; font-size: 14px; width: 24px; transition: background 0.2s; }
        .fp-del:hover { background: rgba(239, 68, 68, 0.1); }
        .fp-controls { margin-top: var(--sp-2); display: flex; justify-content: flex-end; }
        `;
    }

    protected onMount() {
        this.render();
        this.subscribe(UIStore.selectedEntityId, () => this.render());
        this.subscribe(UIStore.viewState, () => this.render());
    }

    protected render() {
        const selectedId = UIStore.selectedEntityId.get();
        const vs = UIStore.viewState.get();
        const unit = vs?.units.find((u: any) => u.id === selectedId);

        this.element.innerHTML = '';
        const header = this.el('div', 'fp-title');
        header.appendChild(this.el('span', undefined, 'FLIGHT PLAN / WAYPOINTS'));
        
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn--ghost btn--xs';
        addBtn.textContent = '+ ADD WP';
        addBtn.onclick = () => this.addWaypoint();
        header.appendChild(addBtn);
        this.element.appendChild(header);

        if (!unit || !unit.waypoints || unit.waypoints.length === 0) {
            this.element.appendChild(this.el('div', 'empty-state', 'No waypoints plotted. Use map right-click or button above.'));
            return;
        }

        const table = document.createElement('table');
        table.className = 'fp-table';
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        ['#', 'X (m)', 'Y (m)', 'Alt (m)', 'Spd (kts)', '✕'].forEach(h => {
            const th = document.createElement('th'); th.textContent = h; headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        this.tableBody = document.createElement('tbody');
        unit.waypoints.forEach((wp: any, i: number) => {
            const tr = document.createElement('tr');
            tr.appendChild(this.cell(String(i + 1)));
            
            // X/Y editing (simplified for meters in engine space)
            tr.appendChild(this.editCell(String(Math.round(wp.pos.x)), v => {
                wp.pos.x = Number(v);
                this.updateWaypoint(unit.id, wp);
            }));
            tr.appendChild(this.editCell(String(Math.round(wp.pos.y)), v => {
                wp.pos.y = Number(v);
                this.updateWaypoint(unit.id, wp);
            }));
            tr.appendChild(this.editCell(String(Math.round(wp.pos.z)), v => {
                wp.pos.z = Number(v);
                this.updateWaypoint(unit.id, wp);
            }));
            tr.appendChild(this.editCell(String(Math.round(wp.speedKts || unit.desiredSpeedKts || 300)), v => {
                wp.speedKts = Number(v);
                this.updateWaypoint(unit.id, wp);
            }));

            const delTd = document.createElement('td');
            delTd.className = 'fp-del';
            delTd.textContent = '×';
            delTd.onclick = () => this.deleteWaypoint(unit.id, wp.id);
            tr.appendChild(delTd);
            
            this.tableBody.appendChild(tr);
        });
        table.appendChild(this.tableBody);
        this.element.appendChild(table);
    }

    private cell(text: string): HTMLTableCellElement {
        const td = document.createElement('td');
        td.textContent = text;
        td.style.textAlign = 'center';
        td.style.color = 'var(--text-dim)';
        return td;
    }

    private editCell(value: string, onChange: (v: string) => void): HTMLTableCellElement {
        const td = document.createElement('td');
        const input = document.createElement('input');
        input.className = 'fp-input';
        input.value = value;
        input.onchange = () => onChange(input.value);
        td.appendChild(input);
        return td;
    }

    private addWaypoint() {
        const id = UIStore.selectedEntityId.get();
        if (!id || !UIStore.client) return;
        // Logic to add a waypoint near the unit or at 0,0
        UIStore.client.dispatch({ type: 'AddWaypoint', entityId: id, pos: { x: 0, y: 0, z: 1000 } } as any);
    }

    private updateWaypoint(entityId: string, wp: any) {
        if (!UIStore.client) return;
        UIStore.client.dispatch({ type: 'UpdateWaypoint', entityId, waypointId: wp.id, pos: wp.pos, speedKts: wp.speedKts } as any);
    }

    private deleteWaypoint(entityId: string, waypointId: string) {
        if (!UIStore.client) return;
        UIStore.client.dispatch({ type: 'RemoveWaypoint', entityId, waypointId } as any);
    }
}
