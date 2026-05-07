import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { ViewTrackPayload } from '../../../sdk/schemas';


interface SortState {
    column: keyof ViewTrackPayload | 'id';
    direction: 'asc' | 'desc';
}

/**
 * ContactsWindow: Sortable and filterable table of all tactical tracks.
 * Uses virtualization pattern for high-count scenarios.
 */
export class ContactsWindow extends Component {
    private tableBody!: HTMLElement;
    private sortState: SortState = { column: 'id', direction: 'asc' };
    private tracks: ViewTrackPayload[] = [];

    constructor() {
        super('div', 'contacts-window', 'contacts-window');
    }

    protected styles(): string {
        return `
            .contacts-window {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: #111;
                font-size: 11px;
            }
            .contacts-header {
                display: grid;
                grid-template-columns: 80px 100px 100px 80px 80px 100px 1fr;
                background: #222;
                border-bottom: 1px solid #333;
                font-weight: bold;
                color: #888;
            }
            .header-cell {
                padding: 8px;
                cursor: pointer;
                user-select: none;
                border-right: 1px solid #333;
            }
            .header-cell:hover { background: #333; color: #fff; }
            .header-cell.active { color: #00d1ff; }

            .contacts-body {
                flex: 1;
                overflow-y: auto;
            }
            .track-row {
                display: grid;
                grid-template-columns: 80px 100px 100px 80px 80px 100px 1fr;
                border-bottom: 1px solid #222;
                cursor: pointer;
            }
            .track-row:hover { background: #1a1a1a; }
            .track-row.selected { background: #004466; }

            .cell {
                padding: 6px 8px;
                border-right: 1px solid #222;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .id-hostile { color: #ff4444; }
            .id-friendly { color: #44ff44; }
            .id-neutral { color: #ffffff; }
            .id-unknown { color: #ffff44; }
        `;
    }

    protected render(): void {
        const header = this.el('div', 'contacts-header');
        const cols: { label: string, key: keyof ViewTrackPayload | 'id' }[] = [
            { label: 'ID', key: 'id' },
            { label: 'CLASS', key: 'classification' },
            { label: 'ID STATUS', key: 'identification' },
            { label: 'LAT', key: 'lla' },
            { label: 'LON', key: 'lla' },
            { label: 'LAST SEEN', key: 'lastSeen' },
            { label: 'CONF', key: 'cep' } // Use cep instead of confidence as it's in the schema
        ];

        cols.forEach(c => {
            const cell = this.el('div', 'header-cell', c.label);
            this.listen(cell, 'click', () => this.handleSort(c.key));
            header.appendChild(cell);
        });

        this.tableBody = this.el('div', 'contacts-body');
        
        this.element.appendChild(header);
        this.element.appendChild(this.tableBody);

        this.subscribe(UIStore.viewState, (vs) => {
            this.tracks = vs?.tracks || [];
            this.refresh();
        });

        this.subscribe(UIStore.selectedEntityId, () => this.refresh());
    }

    private handleSort(col: keyof ViewTrackPayload | 'id') {
        if (this.sortState.column === col) {
            this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortState.column = col;
            this.sortState.direction = 'asc';
        }
        this.refresh();
    }

    private refresh() {
        if (!this.tableBody) return;
        
        const sorted = [...this.tracks].sort((a, b) => {
            const col = this.sortState.column;
            let valA = (a as Record<string, unknown>)[col];
            let valB = (b as Record<string, unknown>)[col];

            if (col === 'lla') {
                valA = a.lla?.lat || 0;
                valB = b.lla?.lat || 0;
            }

            if (valA === valB) return 0;
            const multiplier = this.sortState.direction === 'asc' ? 1 : -1;
            return (valA as number) < (valB as number) ? -1 * multiplier : 1 * multiplier;
        });

        this.tableBody.innerHTML = '';
        sorted.forEach(t => {
            const row = this.el('div', 'track-row');
            if (UIStore.selectedEntityId.get() === t.id) row.classList.add('selected');

            row.appendChild(this.el('div', 'cell', t.id));
            row.appendChild(this.el('div', 'cell', t.classification || 'Unknown'));
            
            const idStatus = t.identification || 'Unknown';
            const idCell = this.el('div', `cell id-${idStatus.toLowerCase()}`, idStatus);
            row.appendChild(idCell);

            row.appendChild(this.el('div', 'cell', t.lla?.lat.toFixed(4) || '---'));
            row.appendChild(this.el('div', 'cell', t.lla?.lon.toFixed(4) || '---'));
            row.appendChild(this.el('div', 'cell', `${t.lastSeen} t`));
            row.appendChild(this.el('div', 'cell', `${Math.round(t.cep)}m`));

            this.listen(row, 'click', () => {
                UIStore.selectedEntityId.set(t.id);
            });

            this.tableBody.appendChild(row);
        });
    }
}

export const ContactsWindowContent = ContactsWindow;
