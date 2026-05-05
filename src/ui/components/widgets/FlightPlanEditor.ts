import { Component } from '../../framework/Component';

interface WPRow { idx: number; lat: number; lon: number; alt: number; speedKts: number; action: string; }

/**
 * FlightPlanEditor: Modal waypoint editor for NavigationComponent paths.
 */
export class FlightPlanEditor extends Component {
    private tableBody!: HTMLElement;
    private waypoints: WPRow[] = [
        { idx: 1, lat: 34.0, lon: -118.5, alt: 5000, speedKts: 400, action: 'Transit' },
        { idx: 2, lat: 33.5, lon: -119.0, alt: 3000, speedKts: 350, action: 'Descend' },
        { idx: 3, lat: 33.0, lon: -119.5, alt: 200, speedKts: 500, action: 'Attack' },
        { idx: 4, lat: 33.8, lon: -118.0, alt: 8000, speedKts: 450, action: 'Egress' },
    ];

    constructor() { super('div', 'fp-editor'); }

    protected styles() {
        return `
        .fp-editor { padding:var(--sp-3); }
        .fp-title { font-size:var(--text-xs); font-weight:600; color:var(--text-muted); text-transform:uppercase; margin-bottom:var(--sp-2); display:flex; justify-content:space-between; align-items:center; }
        .fp-table { width:100%; border-collapse:collapse; font-size:var(--text-xs); font-family:var(--font-mono); }
        .fp-table th { background:var(--bg-surface); color:var(--text-muted); padding:4px 6px; border:1px solid var(--border-color); text-transform:uppercase; font-weight:500; }
        .fp-table td { padding:2px 4px; border:1px solid var(--border-color); }
        .fp-input { width:100%; background:transparent; border:none; color:var(--text-main); font-family:var(--font-mono); font-size:var(--text-xs); text-align:right; padding:2px; }
        .fp-input:focus { background:var(--bg-surface); outline:1px solid var(--color-friendly); }
        .fp-del { cursor:pointer; color:var(--accent-danger); text-align:center; }
        .fp-total { font-size:var(--text-xs); color:var(--text-dim); margin-top:var(--sp-2); font-family:var(--font-mono); }
        `;
    }

    protected render() {
        const header = this.el('div', 'fp-title');
        header.appendChild(this.el('span', undefined, 'FLIGHT PLAN'));
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn--ghost btn--sm';
        addBtn.textContent = '+ WP';
        addBtn.addEventListener('click', () => this.addWaypoint());
        header.appendChild(addBtn);
        this.element.appendChild(header);

        const table = document.createElement('table');
        table.className = 'fp-table';
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        for (const h of ['WP', 'Lat', 'Lon', 'Alt(m)', 'Spd(kts)', 'Action', '✕']) {
            const th = document.createElement('th'); th.textContent = h; headRow.appendChild(th);
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        this.tableBody = document.createElement('tbody');
        table.appendChild(this.tableBody);
        this.element.appendChild(table);
        this.element.appendChild(this.el('div', 'fp-total'));

        this.rebuildTable();
    }

    private rebuildTable() {
        this.tableBody.replaceChildren();
        for (let i = 0; i < this.waypoints.length; i++) {
            const wp = this.waypoints[i];
            const tr = document.createElement('tr');
            tr.appendChild(this.cell(`WP${i + 1}`, true));
            tr.appendChild(this.editCell(String(wp.lat), v => wp.lat = Number(v)));
            tr.appendChild(this.editCell(String(wp.lon), v => wp.lon = Number(v)));
            tr.appendChild(this.editCell(String(wp.alt), v => wp.alt = Number(v)));
            tr.appendChild(this.editCell(String(wp.speedKts), v => wp.speedKts = Number(v)));
            tr.appendChild(this.editCell(wp.action, v => wp.action = v));
            const delTd = document.createElement('td');
            delTd.className = 'fp-del';
            delTd.textContent = '✕';
            delTd.addEventListener('click', () => { this.waypoints.splice(i, 1); this.rebuildTable(); });
            tr.appendChild(delTd);
            this.tableBody.appendChild(tr);
        }
    }

    private cell(text: string, isLabel = false): HTMLTableCellElement {
        const td = document.createElement('td');
        td.textContent = text;
        if (isLabel) td.style.color = 'var(--text-dim)';
        return td;
    }

    private editCell(value: string, onChange: (v: string) => void): HTMLTableCellElement {
        const td = document.createElement('td');
        const input = document.createElement('input');
        input.className = 'fp-input';
        input.value = value;
        input.addEventListener('change', () => onChange(input.value));
        td.appendChild(input);
        return td;
    }

    private addWaypoint() {
        const last = this.waypoints[this.waypoints.length - 1];
        this.waypoints.push({ idx: this.waypoints.length + 1, lat: last?.lat || 0, lon: last?.lon || 0, alt: last?.alt || 0, speedKts: last?.speedKts || 300, action: 'Transit' });
        this.rebuildTable();
    }
}
