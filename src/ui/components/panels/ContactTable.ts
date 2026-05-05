import { Component } from '../../framework/Component';
import { UIStore, ViewTrack } from '../../framework/UIStore';

/**
 * ContactTable: Sortable data table of all current tracks from TMSSystem.
 */
export class ContactTable extends Component {
    private tbody!: HTMLElement;
    private sortKey: keyof ViewTrack = 'id';
    private sortAsc = true;

    constructor() { super('div', 'contact-table-widget'); }

    protected styles() {
        return `
        .contact-table-widget { display:flex; flex-direction:column; height:100%; }
        .ct-title { font-size:var(--text-xs); font-weight:600; color:var(--text-muted); text-transform:uppercase; padding:var(--sp-2) var(--sp-3); border-bottom:1px solid var(--border-color); }
        .ct-table { width:100%; border-collapse:collapse; font-size:var(--text-xs); font-family:var(--font-mono); }
        .ct-table th { background:var(--bg-surface); color:var(--text-muted); padding:4px 6px; border:1px solid var(--border-color); cursor:pointer; user-select:none; text-transform:uppercase; }
        .ct-table th:hover { color:var(--text-main); }
        .ct-table td { padding:3px 6px; border-bottom:1px solid rgba(30,41,59,0.3); }
        .ct-row:hover { background:var(--bg-hover); }
        .ct-row.is-selected { background:var(--bg-active); }
        .ct-hostile { color:var(--color-hostile); }
        .ct-friendly { color:var(--color-friendly); }
        .ct-unknown { color:var(--color-unknown); }
        `;
    }

    protected render() {
        this.element.appendChild(this.el('div', 'ct-title', 'CONTACT / TARGET LIST'));

        const table = document.createElement('table');
        table.className = 'ct-table';

        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        const columns: { key: string; label: string }[] = [
            { key: 'id', label: 'Track ID' },
            { key: 'classification', label: 'Class' },
            { key: 'speed', label: 'Speed (kts)' },
            { key: 'alt', label: 'Alt (m)' },
            { key: 'cep', label: 'CEP (m)' },
            { key: 'lastSeen', label: 'Last Seen' },
        ];
        for (const col of columns) {
            const th = document.createElement('th');
            th.textContent = col.label;
            th.addEventListener('click', () => {
                if (this.sortKey === col.key as any) this.sortAsc = !this.sortAsc;
                else { this.sortKey = col.key as any; this.sortAsc = true; }
                this.updateTable();
            });
            headRow.appendChild(th);
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        this.tbody = document.createElement('tbody');
        table.appendChild(this.tbody);

        const scrollWrap = this.el('div');
        scrollWrap.style.flex = '1';
        scrollWrap.style.overflow = 'auto';
        scrollWrap.appendChild(table);
        this.element.appendChild(scrollWrap);
    }

    protected onMount() {
        this.subscribe(UIStore.viewState, () => this.updateTable());
    }

    private updateTable() {
        const vs = UIStore.viewState.get();
        if (!vs) return;

        const tracks = [...vs.tracks].sort((a, b) => {
            let va: any = (a as any)[this.sortKey];
            let vb: any = (b as any)[this.sortKey];
            if (this.sortKey === 'speed' as any) {
                va = Math.sqrt(a.vel.x ** 2 + a.vel.y ** 2) * 1.94384;
                vb = Math.sqrt(b.vel.x ** 2 + b.vel.y ** 2) * 1.94384;
            }
            if (this.sortKey === 'alt' as any) { va = a.pos.z; vb = b.pos.z; }
            if (typeof va === 'string') return this.sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
            return this.sortAsc ? va - vb : vb - va;
        });

        this.tbody.replaceChildren();
        const selectedId = UIStore.selectedEntityId.get();

        for (const t of tracks) {
            const tr = document.createElement('tr');
            tr.className = `ct-row${t.id === selectedId ? ' is-selected' : ''}`;
            tr.addEventListener('click', () => UIStore.selectedEntityId.set(t.id));

            const speed = Math.sqrt(t.vel.x ** 2 + t.vel.y ** 2 + t.vel.z ** 2) * 1.94384;
            const cls = t.classification?.toLowerCase() || 'unknown';

            tr.appendChild(this.cell(t.id));
            const clsTd = this.cell(t.classification || 'UNKNOWN');
            clsTd.className = `ct-${cls}`;
            tr.appendChild(clsTd);
            tr.appendChild(this.cell(speed.toFixed(0)));
            tr.appendChild(this.cell(t.pos.z.toFixed(0)));
            tr.appendChild(this.cell(t.cep.toFixed(0)));
            tr.appendChild(this.cell(String(t.lastSeen)));

            this.tbody.appendChild(tr);
        }
    }

    private cell(text: string): HTMLTableCellElement {
        const td = document.createElement('td');
        td.textContent = text;
        return td;
    }
}
