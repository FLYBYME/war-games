import { sdkClient } from '../../framework/Client.js';
import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

/**
 * WeaponAllocationMatrix: Manual mount-to-target assignment grid.
 */
export class WeaponAllocationMatrix extends Component {
    constructor() { super('div', 'wam-widget'); }

    protected styles() {
        return `
        .wam-widget { padding:var(--sp-3); }
        .wam-table { width:100%; border-collapse:collapse; font-size:var(--text-xs); }
        .wam-table th, .wam-table td { padding:4px 6px; border:1px solid var(--border-color); text-align:center; }
        .wam-table th { background:var(--bg-surface); color:var(--text-muted); text-transform:uppercase; font-weight:500; }
        .wam-cell { cursor:pointer; transition:background var(--transition-fast); }
        .wam-cell:hover { background:var(--bg-hover); }
        .wam-cell.is-assigned { background:rgba(255,45,85,0.15); color:var(--color-hostile); font-weight:600; }
        .wam-title { font-size:var(--text-xs); font-weight:600; color:var(--text-muted); text-transform:uppercase; margin-bottom:var(--sp-2); }
        `;
    }

    protected async onMount() {
        this.subscribe(UIStore.viewState, () => this.refresh());
        this.subscribe(UIStore.selectedEntityId, () => this.refresh());
    }

    private refresh() {
        this.element.innerHTML = '';
        this.render();
    }

    protected render() {
        const selectedId = UIStore.selectedEntityId.get();
        const vs = UIStore.viewState.get();
        const unit = vs?.units.find((u: any) => u.id === selectedId);
        const tracks = vs?.tracks || [];

        this.element.appendChild(this.el('div', 'wam-title', 'WEAPON ALLOCATION'));

        if (!unit || !unit.mounts || unit.mounts.length === 0) {
            const placeholder = this.el('div', 'wam-empty', 'No mounts available for selection');
            placeholder.style.fontSize = 'var(--text-xs)';
            placeholder.style.color = 'var(--text-muted)';
            placeholder.style.padding = 'var(--sp-2)';
            this.element.appendChild(placeholder);
            return;
        }

        const table = document.createElement('table');
        table.className = 'wam-table';

        // Header
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');
        const thMount = document.createElement('th');
        thMount.textContent = 'Mount';
        headRow.appendChild(thMount);
        
        for (const t of tracks) {
            const th = document.createElement('th');
            th.textContent = t.id;
            headRow.appendChild(th);
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Body
        const tbody = document.createElement('tbody');

        for (const mount of unit.mounts) {
            const tr = document.createElement('tr');
            const tdName = document.createElement('td');
            tdName.innerHTML = `<div style="text-align:left">${mount.type}</div><div style="font-size:8px; color:var(--text-muted)">QTY: ${mount.roundsRemaining}</div>`;
            tdName.style.textAlign = 'left';
            tdName.style.fontFamily = 'var(--font-mono)';
            tr.appendChild(tdName);

            for (const track of tracks) {
                const td = document.createElement('td');
                td.className = 'wam-cell';
                
                const isAssigned = vs?.weaponBindings.some((b: any) => 
                    b.shooterId === unit.id && 
                    (b.weaponId === mount.type || b.weaponId === 'Global') && 
                    b.targetId === track.id
                );

                if (isAssigned) {
                    td.classList.add('is-assigned');
                    td.textContent = '✕';
                } else {
                    td.textContent = '—';
                }

                td.addEventListener('click', () => {
                    sdkClient.dispatch({ 
                        type: 'AssignWeapon', 
                        entityId: unit.id, 
                        mount: mount.type, 
                        targetId: track.id 
                    });
                });
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        this.element.appendChild(table);
    }
}
