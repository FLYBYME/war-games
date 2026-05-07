import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { ViewTrackPayload } from '../../../sdk/schemas/index.js';

interface SortState {
    column: keyof ViewTrackPayload;
    direction: 'asc' | 'desc';
}

/**
 * ContactTable: Sortable table of all tactical tracks.
 */
export class ContactTable extends Component {
    private sortState: SortState = { column: 'id', direction: 'asc' };

    constructor() {
        super('div', 'contact-table');
    }

    protected render(): void {
        const state = UIStore.viewState.get();
        const tracks = state?.tracks || [];
        const sorted = this.sortTracks(tracks);

        this.element.innerHTML = `
            <div class="panel-header">Tactical Tracks (${tracks.length})</div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th data-col="id">ID</th>
                            <th data-col="classification">Type</th>
                            <th data-col="identification">ID</th>
                            <th>Range</th>
                            <th>Bearing</th>
                            <th>Last Seen</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sorted.map(t => this.renderRow(t, state as unknown as Record<string, unknown>)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        this.element.querySelectorAll('th[data-col]').forEach(th => {
            this.listen(th as HTMLElement, 'click', () => {
                const col = th.getAttribute('data-col') as keyof ViewTrackPayload;
                this.handleSort(col);
            });
        });
    }

    private sortTracks(tracks: ViewTrackPayload[]): ViewTrackPayload[] {
        return [...tracks].sort((a, b) => {
            const col = this.sortState.column;
            const valA = a[col];
            const valB = b[col];

            if (valA === undefined || valB === undefined) return 0;
            if (valA === valB) return 0;
            
            const multiplier = this.sortState.direction === 'asc' ? 1 : -1;
            const compA = typeof valA === 'number' ? valA : String(valA);
            const compB = typeof valB === 'number' ? valB : String(valB);
            return compA < compB ? -1 * multiplier : 1 * multiplier;
        });
    }

    private renderRow(track: ViewTrackPayload, state: Record<string, unknown> | null): string {
        const isSelected = state?.selectedId === track.id;
        const idClass = `id-${(track.identification || 'unknown').toLowerCase()}`;

        return `
            <tr class="${isSelected ? 'selected' : ''}" data-id="${track.id}">
                <td class="mono">${track.id}</td>
                <td>${track.classification || 'Unknown'}</td>
                <td class="${idClass}">${track.identification}</td>
                <td class="mono">-</td>
                <td class="mono">-</td>
                <td class="mono">${track.lastSeen}</td>
            </tr>
        `;
    }

    private handleSort(col: keyof ViewTrackPayload) {
        if (this.sortState.column === col) {
            this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortState.column = col;
            this.sortState.direction = 'asc';
        }
        this.render();
    }
}
