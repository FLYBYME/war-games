import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { ListManager } from '../../framework/ListManager';

/**
 * ContactsWindowContent: A tabular, virtualized view of all active sensor tracks.
 */
export class ContactsWindowContent extends Component {
    private listManager: ListManager<any> | null = null;
    private listContainer: HTMLElement | null = null;
    private tracks: any[] = [];
    private itemHeight = 32; // px
    private buffer = 10;

    constructor() {
        super('div', 'contacts-window');
    }

    protected styles(): string {
        return `
            .contacts-window {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: var(--bg-panel);
                color: var(--text-main);
                font-family: var(--font-ui);
            }

            .contacts-header {
                display: grid;
                grid-template-columns: 60px 1fr 70px 70px;
                padding: var(--sp-2) var(--sp-3);
                background: var(--bg-header);
                font-size: var(--text-xs);
                font-weight: 600;
                color: var(--text-muted);
                border-bottom: 1px solid var(--border-color);
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }

            .contacts-list {
                flex: 1;
                overflow-y: auto;
                position: relative;
            }

            .contacts-scroll-spacer {
                width: 100%;
                position: absolute;
                top: 0;
                left: 0;
                pointer-events: none;
            }

            .contact-row {
                position: absolute;
                width: 100%;
                height: 32px;
                display: grid;
                grid-template-columns: 60px 1fr 70px 70px;
                padding: 0 var(--sp-3);
                border-bottom: 1px solid rgba(255,255,255,0.03);
                font-size: var(--text-sm);
                cursor: pointer;
                transition: background var(--transition-fast);
                align-items: center;
                box-sizing: border-box;
            }

            .contact-row:hover { background: var(--bg-hover); }
            .contact-row.selected { background: var(--bg-active); border-left: 2px solid var(--color-friendly); }

            .cls-tag {
                font-size: 9px;
                padding: 1px 4px;
                border-radius: 2px;
                font-weight: 700;
                text-align: center;
                margin-right: 8px;
                text-transform: uppercase;
            }

            .cls-hostile { background: rgba(255, 45, 85, 0.2); color: var(--color-hostile); border: 1px solid rgba(255, 45, 85, 0.3); }
            .cls-friendly { background: rgba(0, 212, 255, 0.2); color: var(--color-friendly); border: 1px solid rgba(0, 212, 255, 0.3); }
            .cls-neutral { background: rgba(48, 209, 88, 0.2); color: var(--color-neutral); border: 1px solid rgba(48, 209, 88, 0.3); }
            .cls-unknown { background: rgba(255, 214, 10, 0.2); color: var(--color-unknown); border: 1px solid rgba(255, 214, 10, 0.3); }

            .val-mono { font-family: var(--font-mono); color: var(--text-dim); font-size: 11px; }

            .trk-id {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                color: var(--text-main);
            }
        `;
    }

    protected render(): void {
        const header = this.el('div', 'contacts-header');
        header.innerHTML = `
            <span>Class</span>
            <span>ID</span>
            <span>Range</span>
            <span>Speed</span>
        `;
        
        const list = this.el('div', 'contacts-list', '', 'contacts-list');
        const spacer = this.el('div', 'contacts-scroll-spacer', '', 'contacts-spacer');
        list.appendChild(spacer);

        this.element.appendChild(header);
        this.element.appendChild(list);
        this.listContainer = list;

        this.listManager = new ListManager<any>({
            container: list,
            keySelector: (t) => t.id,
            renderItem: (t) => this.createRow(t),
            updateItem: (t, el) => this.updateRow(t, el)
        });

        this.listen(list, 'scroll', () => this.syncVirtualList());

        this.subscribe(UIStore.viewState, () => {
            this.refreshData();
            this.syncVirtualList();
        });
        this.subscribe(UIStore.selectedEntityId, () => this.syncVirtualList());
    }

    private refreshData() {
        const vs = UIStore.viewState.get();
        if (!vs) return;

        this.tracks = vs.tracks.filter(t => {
            if (t.classification === 'Weapon') {
                const vx = t.vel?.x || 0;
                const vy = t.vel?.y || 0;
                const vz = t.vel?.z || 0;
                const speedMs = Math.sqrt(vx * vx + vy * vy + vz * vz);
                return speedMs < 800; // Filter out gun shells
            }
            return true;
        }).sort((a, b) => {
            const priority = { 'Hostile': 0, 'Unknown': 1, 'Neutral': 2, 'Friendly': 3 };
            const pa = (priority as any)[a.classification] ?? 99;
            const pb = (priority as any)[b.classification] ?? 99;
            if (pa !== pb) return pa - pb;
            return a.id.localeCompare(b.id);
        });
    }

    private syncVirtualList() {
        if (!this.listManager || !this.listContainer) return;

        const container = this.listContainer;
        const scrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;

        const totalItems = this.tracks.length;
        const spacer = container.querySelector('#contacts-spacer') as HTMLElement;
        if (spacer) spacer.style.height = `${totalItems * this.itemHeight}px`;

        const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.buffer);
        const endIndex = Math.min(totalItems, Math.ceil((scrollTop + containerHeight) / this.itemHeight) + this.buffer);

        const visibleItems = this.tracks.slice(startIndex, endIndex);
        this.listManager.sync(visibleItems);

        // Update positions of visible items
        visibleItems.forEach((track, idx) => {
            const el = container.querySelector(`[data-testid="contact-row-${track.id}"]`) as HTMLElement;
            if (el) {
                el.style.top = `${(startIndex + idx) * this.itemHeight}px`;
            }
        });
    }

    private createRow(track: any): HTMLElement {
        const row = this.el('div', 'contact-row', '', `contact-row-${track.id}`);
        row.innerHTML = `
            <span class="cls-tag" data-testid="trk-cls"></span>
            <span class="trk-id" data-testid="trk-id"></span>
            <span class="trk-range val-mono" data-testid="trk-range"></span>
            <span class="trk-speed val-mono" data-testid="trk-speed"></span>
        `;
        row.onclick = () => UIStore.selectedEntityId.set(track.id);
        this.updateRow(track, row);
        return row;
    }

    private updateRow(track: any, row: HTMLElement) {
        const vs = UIStore.viewState.get();
        const selectedId = UIStore.selectedEntityId.get();

        // Update Class Tag
        const clsTag = row.querySelector('[data-testid="trk-cls"]')!;
        clsTag.className = `cls-tag cls-${track.classification.toLowerCase()}`;
        clsTag.textContent = track.classification.substring(0, 3);

        // Update ID
        row.querySelector('[data-testid="trk-id"]')!.textContent = track.id.substring(0, 12);

        // Calculate Range
        const selectedUnit = vs?.units.find(u => u.id === selectedId);
        const referencePos = selectedUnit ? selectedUnit.pos : { x: 0, y: 0, z: 0 };
        const distM = Math.sqrt(Math.pow(track.pos.x - referencePos.x, 2) + Math.pow(track.pos.y - referencePos.y, 2) + Math.pow(track.pos.z - referencePos.z, 2));
        row.querySelector('[data-testid="trk-range"]')!.textContent = `${(distM / 1852).toFixed(1)}nm`;

        // Calculate Speed
        const speedMs = Math.sqrt(Math.pow(track.vel?.x || 0, 2) + Math.pow(track.vel?.y || 0, 2) + Math.pow(track.vel?.z || 0, 2));
        row.querySelector('[data-testid="trk-speed"]')!.textContent = `${(speedMs * 1.94384).toFixed(0)}kt`;

        // Selection State
        row.classList.toggle('selected', selectedId === track.id);
    }
}
