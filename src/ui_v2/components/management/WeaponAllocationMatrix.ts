import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

/**
 * WeaponAllocationMatrix: Manual mount-to-target assignment grid.
 * Ported to V2 for UnitInspector.
 */
export class WeaponAllocationMatrix extends Component {
    constructor() { super('div', 'wam-widget'); }

    protected styles() {
        return `
        .wam-widget { width: 100%; display: flex; flex-direction: column; gap: var(--sp-2); }
        .wam-title { font-size: var(--text-xs); font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--sp-2); letter-spacing: 0.05em; }
        .wam-scroll { overflow-x: auto; border: 1px solid var(--border-color); border-radius: var(--radius-sm); }
        .wam-table { width: 100%; border-collapse: collapse; font-size: var(--text-xs); background: var(--bg-base); }
        .wam-table th, .wam-table td { padding: 6px 8px; border: 1px solid var(--border-color); text-align: center; }
        .wam-table th { background: var(--bg-header); color: var(--text-muted); text-transform: uppercase; font-weight: 600; white-space: nowrap; }
        .wam-mount-cell { text-align: left !important; font-family: var(--font-mono); min-width: 120px; }
        .wam-mount-name { color: var(--text-main); font-weight: 500; }
        .wam-mount-qty { font-size: 9px; color: var(--text-dim); }
        .wam-cell { cursor: pointer; transition: background var(--transition-fast); min-width: 60px; font-family: var(--font-mono); }
        .wam-cell:hover { background: var(--bg-hover); }
        .wam-cell.is-assigned { background: rgba(255, 45, 85, 0.2); color: var(--color-hostile); font-weight: 700; }
        `;
    }

    protected onMount() {
        this.render();
        this.subscribe(UIStore.viewState, () => this.render());
        this.subscribe(UIStore.selectedEntityId, () => this.render());
    }

    protected render() {
        const selectedId = UIStore.selectedEntityId.get();
        const vs = UIStore.viewState.get();
        const unit = vs?.units.find((u: any) => u.id === selectedId);
        const tracks = vs?.tracks || [];

        this.element.innerHTML = '';
        this.element.appendChild(this.el('div', 'wam-title', 'WEAPON ALLOCATION'));

        if (!unit || !unit.mounts || unit.mounts.length === 0) {
            this.element.appendChild(this.el('div', 'empty-state', 'No weapon mounts available.'));
            return;
        }

        if (tracks.length === 0) {
            this.element.appendChild(this.el('div', 'empty-state', 'No active tracks for targeting.'));
            return;
        }

        const scroll = this.el('div', 'wam-scroll');
        const table = document.createElement('table');
        table.className = 'wam-table';

        // Header
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        const thMount = document.createElement('th');
        thMount.textContent = 'Mount';
        headRow.appendChild(thMount);
        
        tracks.forEach(t => {
            const th = document.createElement('th');
            th.textContent = t.id.substring(0, 8);
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Body
        const tbody = document.createElement('tbody');
        unit.mounts.forEach((mount: any) => {
            const tr = document.createElement('tr');
            const tdName = document.createElement('td');
            tdName.className = 'wam-mount-cell';
            tdName.innerHTML = `
                <div class="wam-mount-name">${mount.type}</div>
                <div class="wam-mount-qty">ROUNDS: ${mount.roundsRemaining}</div>
            `;
            tr.appendChild(tdName);

            tracks.forEach(track => {
                const td = document.createElement('td');
                td.className = 'wam-cell';
                
                const isAssigned = vs?.weaponBindings?.some((b: any) => 
                    b.shooterId === unit.id && 
                    (b.weaponId === mount.type || b.weaponId === 'Global') && 
                    b.targetId === track.id
                );

                if (isAssigned) {
                    td.classList.add('is-assigned');
                    td.textContent = 'LOCK';
                } else {
                    td.textContent = '—';
                }

                td.onclick = () => {
                    if (UIStore.client) {
                        UIStore.client.dispatch({ 
                            type: 'AssignWeapon', 
                            entityId: unit.id, 
                            mount: mount.type, 
                            targetId: track.id 
                        } as any);
                    }
                };
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        scroll.appendChild(table);
        this.element.appendChild(scroll);
    }
}
