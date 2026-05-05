import { Component } from '../../framework/Component';
import { UIStore, ViewUnit, ViewTrack } from '../../framework/UIStore';

export class LeftPanelOOB extends Component {
    private unitsBody!: HTMLElement;
    private contactsBody!: HTMLElement;
    private tabUnits!: HTMLElement;
    private tabContacts!: HTMLElement;

    constructor() { super('div', 'panel panel-left'); }

    protected styles() {
        return `
        .panel { background:var(--bg-panel); border:1px solid var(--border-color); display:flex; flex-direction:column; overflow:hidden; }
        .panel__header { display:flex; align-items:center; justify-content:space-between; padding:var(--sp-1) var(--sp-3); background:var(--bg-surface); border-bottom:1px solid var(--border-color); font-size:var(--text-xs); font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); min-height:28px; user-select:none; }
        .panel__body { flex:1; overflow-y:auto; overflow-x:hidden; }
        .tabs { display:flex; background:var(--bg-surface); border-bottom:1px solid var(--border-color); overflow-x:auto; }
        .tabs__tab { padding:var(--sp-2) var(--sp-3); font-size:var(--text-xs); font-weight:500; color:var(--text-muted); cursor:pointer; transition:all var(--transition-fast); border-bottom:2px solid transparent; white-space:nowrap; text-transform:uppercase; letter-spacing:0.04em; }
        .tabs__tab:hover { color:var(--text-main); background:var(--bg-hover); }
        .tabs__tab.is-active { color:var(--color-friendly); border-bottom-color:var(--color-friendly); }
        .oob-row { display:flex; align-items:center; gap:var(--sp-2); padding:2px var(--sp-3); font-size:var(--text-sm); cursor:pointer; transition:background var(--transition-fast); border-left:3px solid transparent; }
        .oob-row:hover { background:var(--bg-hover); }
        .oob-row.is-selected { background:var(--bg-active); border-left-color:var(--color-friendly); }
        .oob-row.is-destroyed { opacity:0.35; text-decoration:line-through; }
        .oob-row__icon { width:14px; height:14px; border-radius:2px; flex-shrink:0; }
        .oob-row__icon--friendly { background:var(--color-friendly); }
        .oob-row__icon--hostile { background:var(--color-hostile); }
        .oob-row__icon--neutral { background:var(--color-neutral); }
        .oob-row__icon--unknown { background:var(--color-unknown); }
        .oob-row__name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-main); }
        .oob-row__hp { font-family:var(--font-mono); font-size:var(--text-xs); color:var(--text-muted); }
        `;
    }

    protected render() {
        const header = this.el('div', 'panel__header', 'TACTICAL PICTURE');

        const tabs = this.el('div', 'tabs');
        this.tabUnits = this.el('div', 'tabs__tab is-active', 'OOB');
        this.tabContacts = this.el('div', 'tabs__tab', 'CONTACTS');
        tabs.append(this.tabUnits, this.tabContacts);

        this.unitsBody = this.el('div', 'panel__body');
        this.contactsBody = this.el('div', 'panel__body');
        this.contactsBody.style.display = 'none';

        this.element.append(header, tabs, this.unitsBody, this.contactsBody);

        this.tabUnits.addEventListener('click', () => this.switchTab('units'));
        this.tabContacts.addEventListener('click', () => this.switchTab('contacts'));
    }

    private switchTab(tab: 'units' | 'contacts') {
        this.tabUnits.classList.toggle('is-active', tab === 'units');
        this.tabContacts.classList.toggle('is-active', tab === 'contacts');
        this.unitsBody.style.display = tab === 'units' ? '' : 'none';
        this.contactsBody.style.display = tab === 'contacts' ? '' : 'none';
    }

    protected onMount() {
        this.subscribe(UIStore.viewState, vs => {
            if (!vs) return;
            this.reconcileRows(this.unitsBody, vs.units, false);
            this.reconcileRows(this.contactsBody, vs.tracks, true);
        });
    }

    private reconcileRows(container: HTMLElement, items: (ViewUnit | ViewTrack)[], isTrack: boolean) {
        const selectedId = UIStore.selectedEntityId.get();

        // Grow/shrink row pool
        while (container.children.length > items.length) container.lastChild?.remove();
        while (container.children.length < items.length) {
            container.appendChild(this.createRow());
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const row = container.children[i] as HTMLElement;
            const id = item.id;

            row.dataset.entityId = id;
            row.dataset.testid = isTrack ? `contact-row-${id}` : `oob-row-${id}`;
            row.classList.toggle('is-selected', id === selectedId);
            row.classList.toggle('is-destroyed', 'isDestroyed' in item && (item as ViewUnit).isDestroyed);

            const icon = row.children[0] as HTMLElement;
            icon.className = `oob-row__icon oob-row__icon--${this.classColor(item, isTrack)}`;

            (row.children[1] as HTMLElement).textContent = id;
            (row.children[2] as HTMLElement).textContent = isTrack
                ? `CEP ${(item as ViewTrack).cep?.toFixed(0) || '?'}m`
                : `${(item as ViewUnit).hp}%`;
        }
    }

    private createRow(): HTMLElement {
        const row = this.el('div', 'oob-row');
        row.appendChild(this.el('div', 'oob-row__icon oob-row__icon--friendly'));
        row.appendChild(this.el('span', 'oob-row__name'));
        row.appendChild(this.el('span', 'oob-row__hp'));
        row.addEventListener('click', () => {
            if (row.dataset.entityId) UIStore.selectedEntityId.set(row.dataset.entityId);
        });
        return row;
    }

    private classColor(item: ViewUnit | ViewTrack, isTrack: boolean): string {
        if (!isTrack) return 'friendly';
        const cls = (item as ViewTrack).classification?.toLowerCase();
        if (cls === 'hostile') return 'hostile';
        if (cls === 'neutral') return 'neutral';
        return 'unknown';
    }
}
