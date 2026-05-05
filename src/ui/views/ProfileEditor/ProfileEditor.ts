import { Component } from '../../framework/Component';
import { Signal } from '../../framework/Signal';
import { UIStore } from '../../framework/UIStore';

interface ProfileEntry {
    id: string;
    name: string;
    type: string;
    domain: string;
    country: string;
    maxSpeedKts: number;
    maxAltM: number;
    rcsM2: number;
    sensors: string[];
    mounts: string[];
}

const SAMPLE_PROFILES: ProfileEntry[] = [
    { id: 'ddg-51', name: 'Arleigh Burke Flight IIA', type: 'DDG', domain: 'Surface', country: 'US', maxSpeedKts: 31, maxAltM: 0, rcsM2: 1500, sensors: ['AN/SPY-1D', 'AN/SQS-53C', 'AN/SLQ-32'], mounts: ['Mk41 VLS (96)', 'Mk45 5"/62'] },
    { id: 'f-16c', name: 'F-16C Viper', type: 'Fighter', domain: 'Air', country: 'US', maxSpeedKts: 1320, maxAltM: 15240, rcsM2: 1.2, sensors: ['AN/APG-68', 'ALR-56M'], mounts: ['M61A1', 'AIM-120 (6)', 'AIM-9X (2)'] },
    { id: 'ssn-774', name: 'Virginia-class SSN', type: 'SSN', domain: 'Subsurface', country: 'US', maxSpeedKts: 25, maxAltM: -400, rcsM2: 0, sensors: ['BQQ-10', 'TB-29A'], mounts: ['Mk48 ADCAP (25)', 'TLAM (12)'] },
    { id: 'su-30', name: 'Su-30MKI Flanker-H', type: 'Fighter', domain: 'Air', country: 'RU', maxSpeedKts: 1295, maxAltM: 17300, rcsM2: 4.0, sensors: ['N011M BARS', 'OLS-30'], mounts: ['GSh-30-1', 'R-77 (8)', 'R-73 (2)'] },
    { id: 'type-054a', name: 'Type 054A Jiangkai II', type: 'FFG', domain: 'Surface', country: 'CN', maxSpeedKts: 27, maxAltM: 0, rcsM2: 800, sensors: ['Type 382', 'MGK-335'], mounts: ['HHQ-16 VLS (32)', 'H/PJ-26'] },
    { id: 'p-8a', name: 'P-8A Poseidon', type: 'MPA', domain: 'Air', country: 'US', maxSpeedKts: 490, maxAltM: 12500, rcsM2: 30, sensors: ['AN/APY-10', 'AN/ALQ-240', 'Sonobuoys'], mounts: ['Mk54 (5)', 'AGM-84 (8)'] },
    { id: 'kilo-636', name: 'Project 636.3 Kilo', type: 'SSK', domain: 'Subsurface', country: 'RU', maxSpeedKts: 20, maxAltM: -300, rcsM2: 0, sensors: ['MGK-400EM'], mounts: ['53-65 (18)', '3M-54 Kalibr (4)'] },
    { id: 'b-2a', name: 'B-2A Spirit', type: 'Bomber', domain: 'Air', country: 'US', maxSpeedKts: 530, maxAltM: 15200, rcsM2: 0.0001, sensors: ['AN/APQ-181', 'ZSR-63'], mounts: ['JDAM (80)', 'B61-12 (16)'] },
];

/**
 * ProfileEditor: DB3000 browser and editor.
 * Left: filterable profile list. Right: editable detail pane.
 */
export class ProfileEditor extends Component {
    private listEl!: HTMLElement;
    private detailEl!: HTMLElement;
    private filterInput!: HTMLInputElement;
    private selectedProfile = new Signal<ProfileEntry | null>(null);
    private profiles: ProfileEntry[] = [];

    constructor() { super('div', 'profile-editor'); }

    protected styles() {
        return `
        .profile-editor { display:grid; grid-template-columns:320px 1fr; grid-template-rows:48px 1fr; grid-template-areas:"toolbar toolbar" "list detail"; height:100vh; background:var(--bg-base); }
        .pe-toolbar { grid-area:toolbar; display:flex; align-items:center; gap:var(--sp-3); padding:0 var(--sp-4); background:var(--bg-panel); border-bottom:1px solid var(--border-color); }
        .pe-toolbar__title { font-family:var(--font-mono); font-size:var(--text-lg); font-weight:700; color:var(--color-friendly); letter-spacing:0.08em; }
        .pe-list { grid-area:list; overflow-y:auto; background:var(--bg-panel); border-right:1px solid var(--border-color); }
        .pe-detail { grid-area:detail; overflow-y:auto; padding:var(--sp-4); }
        .pe-filter { background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:var(--sp-1) var(--sp-3); font-size:var(--text-sm); color:var(--text-main); width:200px; outline:none; }
        .pe-filter:focus { border-color:var(--color-friendly); }
        .pe-row { display:flex; align-items:center; gap:var(--sp-2); padding:var(--sp-2) var(--sp-3); cursor:pointer; border-bottom:1px solid var(--border-color); transition:background var(--transition-fast); border-left:3px solid transparent; }
        .pe-row:hover { background:var(--bg-hover); }
        .pe-row.is-selected { background:var(--bg-active); border-left-color:var(--color-friendly); }
        .pe-row__domain { font-size:var(--text-xs); padding:1px 6px; border-radius:8px; font-weight:500; text-transform:uppercase; }
        .pe-row__domain--air { background:rgba(0,212,255,0.15); color:var(--color-friendly); }
        .pe-row__domain--surface { background:rgba(48,209,88,0.15); color:var(--color-neutral); }
        .pe-row__domain--subsurface { background:rgba(191,90,242,0.15); color:var(--color-pending); }
        .pe-row__name { flex:1; font-size:var(--text-sm); color:var(--text-main); }
        .pe-row__type { font-size:var(--text-xs); color:var(--text-muted); font-family:var(--font-mono); }
        .pe-section { margin-bottom:var(--sp-5); }
        .pe-section__title { font-size:var(--text-xs); font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:var(--sp-2); padding-bottom:var(--sp-1); border-bottom:1px solid var(--border-color); }
        .pe-field { display:grid; grid-template-columns:140px 1fr; gap:var(--sp-2); align-items:center; padding:var(--sp-1) 0; }
        .pe-field__label { font-size:var(--text-xs); color:var(--text-muted); text-transform:uppercase; }
        .pe-field__input { background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:var(--sp-1) var(--sp-2); font-size:var(--text-sm); color:var(--text-main); font-family:var(--font-mono); }
        .pe-field__input:focus { border-color:var(--color-friendly); outline:none; }
        .pe-chips { display:flex; flex-wrap:wrap; gap:4px; }
        .pe-chip { font-size:var(--text-xs); padding:2px 8px; border-radius:10px; background:var(--bg-surface); border:1px solid var(--border-color); color:var(--text-main); font-family:var(--font-mono); }
        `;
    }

    protected render() {
        // Toolbar
        const toolbar = this.el('div', 'pe-toolbar');
        toolbar.appendChild(this.el('span', 'pe-toolbar__title', 'DB3000 PROFILE EDITOR'));

        const backBtn = document.createElement('button');
        backBtn.className = 'btn btn--ghost btn--sm';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', () => UIStore.activeView.set('menu'));

        this.filterInput = document.createElement('input');
        this.filterInput.className = 'pe-filter';
        this.filterInput.placeholder = 'Filter profiles...';
        this.filterInput.addEventListener('input', () => this.renderList());

        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn--primary btn--sm';
        addBtn.textContent = '+ New Profile';
        addBtn.addEventListener('click', () => this.createNewProfile());

        toolbar.append(backBtn, this.filterInput, addBtn);

        // List
        this.listEl = this.el('div', 'pe-list');

        // Detail
        this.detailEl = this.el('div', 'pe-detail');
        this.detailEl.appendChild(this.el('div', 'empty-state', 'Select a profile to edit'));

        this.element.append(toolbar, this.listEl, this.detailEl);
    }

    protected async onMount() {
        await this.loadProfiles();
        this.renderList();
        this.subscribe(this.selectedProfile, (p) => {
            if (p) this.renderDetail(p);
            else this.detailEl.replaceChildren(this.el('div', 'empty-state', 'Select a profile to edit'));
        });
    }

    private async loadProfiles() {
        try {
            const data = await UIStore.client.scenario.fetchProfiles();
            this.profiles = data.units.map(([id, p]: [string, any]) => ({
                id,
                name: p.variantName || p.platformClass || id,
                type: p.type || 'Unknown',
                domain: p.kinematics?.type || 'Surface',
                country: 'US', // Default or extract if available
                maxSpeedKts: p.kinematics?.maxSpeedKts || 0,
                maxAltM: p.kinematics?.maxAltM || 0,
                rcsM2: p.signatures?.rcsM2 || 0,
                sensors: (p.sensors || []).map((s: any) => s.id),
                mounts: (p.combat?.mounts || []).map((m: any) => m.id)
            }));
            this.renderList();
        } catch (err) {
            console.error('Failed to load profiles', err);
        }
    }

    private renderList() {
        const filter = this.filterInput.value.toLowerCase();
        const filtered = this.profiles.filter(p =>
            p.name.toLowerCase().includes(filter) ||
            p.type.toLowerCase().includes(filter) ||
            p.domain.toLowerCase().includes(filter) ||
            p.country.toLowerCase().includes(filter)
        );

        this.listEl.replaceChildren();
        for (const p of filtered) {
            const row = this.el('div', 'pe-row');
            const selected = this.selectedProfile.get();
            if (selected?.id === p.id) row.classList.add('is-selected');

            const domain = this.el('span', `pe-row__domain pe-row__domain--${p.domain.toLowerCase()}`);
            domain.textContent = p.domain.slice(0, 3).toUpperCase();
            row.appendChild(domain);
            row.appendChild(this.el('span', 'pe-row__name', p.name));
            row.appendChild(this.el('span', 'pe-row__type', p.type));

            row.addEventListener('click', () => {
                this.selectedProfile.set(p);
                this.renderList();
            });
            this.listEl.appendChild(row);
        }
    }

    private renderDetail(p: ProfileEntry) {
        this.detailEl.replaceChildren();

        // Identity section
        this.detailEl.appendChild(this.section('Identity', [
            this.editField('Name', p.name, v => p.name = v),
            this.editField('Type', p.type, v => p.type = v),
            this.editField('Domain', p.domain, v => p.domain = v),
            this.editField('Country', p.country, v => p.country = v),
        ]));

        // Performance
        this.detailEl.appendChild(this.section('Performance', [
            this.editField('Max Speed (kts)', String(p.maxSpeedKts), v => p.maxSpeedKts = Number(v)),
            this.editField('Max Altitude (m)', String(p.maxAltM), v => p.maxAltM = Number(v)),
            this.editField('RCS (m²)', String(p.rcsM2), v => p.rcsM2 = Number(v)),
        ]));

        // Sensors
        this.detailEl.appendChild(this.section('Sensors', [this.chipList(p.sensors)]));

        // Mounts & Weapons
        this.detailEl.appendChild(this.section('Mounts & Weapons', [this.chipList(p.mounts)]));

        // Actions
        const actions = this.el('div');
        actions.style.display = 'flex';
        actions.style.gap = 'var(--sp-2)';
        actions.style.marginTop = 'var(--sp-4)';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn--primary';
        saveBtn.textContent = 'Save Profile';
        saveBtn.addEventListener('click', async () => {
            // Reconstruct the technical profile for the engine
            const technicalProfile: any = {
                variantName: p.name,
                type: p.type,
                kinematics: {
                    type: p.domain,
                    maxSpeedKts: p.maxSpeedKts,
                    maxAltM: p.maxAltM
                },
                signatures: {
                    baseRCS: p.rcsM2
                }
            };
            await UIStore.client.scenario.saveProfile(p.id, technicalProfile);
            alert('Profile saved to server.');
            this.renderList();
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn--danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
            this.profiles = this.profiles.filter(x => x.id !== p.id);
            this.selectedProfile.set(null);
            this.renderList();
        });

        actions.append(saveBtn, deleteBtn);
        this.detailEl.appendChild(actions);
    }

    private section(title: string, children: HTMLElement[]): HTMLElement {
        const sec = this.el('div', 'pe-section');
        sec.appendChild(this.el('div', 'pe-section__title', title));
        children.forEach(c => sec.appendChild(c));
        return sec;
    }

    private editField(label: string, value: string, onChange: (v: string) => void): HTMLElement {
        const row = this.el('div', 'pe-field');
        row.appendChild(this.el('span', 'pe-field__label', label));
        const input = document.createElement('input');
        input.className = 'pe-field__input';
        input.value = value;
        input.addEventListener('change', () => onChange(input.value));
        row.appendChild(input);
        return row;
    }

    private chipList(items: string[]): HTMLElement {
        const wrap = this.el('div', 'pe-chips');
        for (const item of items) {
            wrap.appendChild(this.el('span', 'pe-chip', item));
        }
        return wrap;
    }

    private createNewProfile() {
        const p: ProfileEntry = {
            id: `custom-${Date.now()}`, name: 'New Platform', type: 'Unknown', domain: 'Surface',
            country: '??', maxSpeedKts: 0, maxAltM: 0, rcsM2: 1,
            sensors: [], mounts: []
        };
        this.profiles.unshift(p);
        this.selectedProfile.set(p);
        this.renderList();
    }
}
