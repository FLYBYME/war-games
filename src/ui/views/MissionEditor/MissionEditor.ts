import { Component } from '../../framework/Component';
import { Signal } from '../../framework/Signal';
import { UIStore } from '../../framework/UIStore';

type MissionType = 'Patrol' | 'Strike' | 'ASW' | 'CAP' | 'SEAD' | 'Escort' | 'Recon' | 'Custom' | 'VBSS' | 'Minelaying' | 'MCM';
type Side = 'Blue' | 'Red' | 'Green';

interface Waypoint {
    lat: number;
    lon: number;
    alt: number;
    speedKts: number;
    action: string;
}

interface UnitAssignment {
    profileId: string;
    name: string;
    side: Side;
    count: number;
}

interface MissionDef {
    id: string;
    name: string;
    type: MissionType;
    side: Side;
    units: UnitAssignment[];
    waypoints: Waypoint[];
    triggerCondition: string;
    notes: string;
}

const SAMPLE_MISSIONS: MissionDef[] = [
    {
        id: 'csn-patrol', name: 'CSG Patrol — WestPac', type: 'Patrol', side: 'Blue',
        units: [
            { profileId: 'ddg-51', name: 'USS Arleigh Burke', side: 'Blue', count: 2 },
            { profileId: 'f-16c', name: 'CAP Flight', side: 'Blue', count: 4 },
        ],
        waypoints: [
            { lat: 34.0, lon: -118.5, alt: 0, speedKts: 15, action: 'Transit' },
            { lat: 33.5, lon: -119.0, alt: 0, speedKts: 12, action: 'Patrol' },
        ],
        triggerCondition: 'On scenario start',
        notes: 'Standard patrol route off San Clemente Island.'
    },
    {
        id: 'red-strike', name: 'Flanker Strike Package', type: 'Strike', side: 'Red',
        units: [
            { profileId: 'su-30', name: 'Flanker Flight', side: 'Red', count: 4 },
        ],
        waypoints: [
            { lat: 35.0, lon: -120.0, alt: 8000, speedKts: 500, action: 'Ingress' },
            { lat: 34.2, lon: -118.8, alt: 100, speedKts: 600, action: 'Attack' },
            { lat: 35.5, lon: -121.0, alt: 10000, speedKts: 450, action: 'Egress' },
        ],
        triggerCondition: 'Tick 500',
        notes: 'Low-level ingress strike profile.'
    },
];

/**
 * MissionEditor: Scenario and mission planner.
 * Left: mission list. Center: waypoint & unit editor. Right: unit assignments.
 */
export class MissionEditor extends Component {
    private listEl!: HTMLElement;
    private centerEl!: HTMLElement;
    private assignEl!: HTMLElement;
    private selectedMission = new Signal<MissionDef | null>(null);
    private missions: MissionDef[] = [...SAMPLE_MISSIONS];
    private availableProfiles: any[] = [];

    constructor() { super('div', 'mission-editor'); }

    protected styles() {
        return `
        .mission-editor { display:grid; grid-template-columns:280px 1fr 300px; grid-template-rows:48px 1fr; grid-template-areas:"me-toolbar me-toolbar me-toolbar" "me-list me-center me-assign"; height:100vh; background:var(--bg-base); }
        .me-toolbar { grid-area:me-toolbar; display:flex; align-items:center; gap:var(--sp-3); padding:0 var(--sp-4); background:var(--bg-panel); border-bottom:1px solid var(--border-color); }
        .me-toolbar__title { font-family:var(--font-mono); font-size:var(--text-lg); font-weight:700; color:var(--accent-warning); letter-spacing:0.08em; }
        .me-list { grid-area:me-list; overflow-y:auto; background:var(--bg-panel); border-right:1px solid var(--border-color); }
        .me-center { grid-area:me-center; overflow-y:auto; padding:var(--sp-4); }
        .me-assign { grid-area:me-assign; overflow-y:auto; background:var(--bg-panel); border-left:1px solid var(--border-color); padding:var(--sp-3); }
        .me-row { display:flex; align-items:center; gap:var(--sp-2); padding:var(--sp-2) var(--sp-3); cursor:pointer; border-bottom:1px solid var(--border-color); transition:background var(--transition-fast); border-left:3px solid transparent; }
        .me-row:hover { background:var(--bg-hover); }
        .me-row.is-selected { background:var(--bg-active); border-left-color:var(--accent-warning); }
        .me-row__side { font-size:var(--text-xs); padding:1px 6px; border-radius:8px; font-weight:600; }
        .me-row__side--blue { background:rgba(0,212,255,0.15); color:var(--color-friendly); }
        .me-row__side--red { background:rgba(255,45,85,0.15); color:var(--color-hostile); }
        .me-row__side--green { background:rgba(48,209,88,0.15); color:var(--color-neutral); }
        .me-row__name { flex:1; font-size:var(--text-sm); color:var(--text-main); }
        .me-row__type { font-size:var(--text-xs); color:var(--text-muted); font-family:var(--font-mono); }
        .me-section { margin-bottom:var(--sp-5); }
        .me-section__title { font-size:var(--text-xs); font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:var(--sp-2); padding-bottom:var(--sp-1); border-bottom:1px solid var(--border-color); }
        .me-field { display:grid; grid-template-columns:120px 1fr; gap:var(--sp-2); align-items:center; padding:var(--sp-1) 0; }
        .me-field__label { font-size:var(--text-xs); color:var(--text-muted); text-transform:uppercase; }
        .me-field__input { background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:var(--sp-1) var(--sp-2); font-size:var(--text-sm); color:var(--text-main); font-family:var(--font-mono); }
        .me-field__input:focus { border-color:var(--accent-warning); outline:none; }
        .me-field__select { background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:var(--sp-1) var(--sp-2); font-size:var(--text-sm); color:var(--text-main); }
        .me-wp { display:grid; grid-template-columns:50px 80px 80px 70px 70px 1fr 30px; gap:4px; align-items:center; padding:var(--sp-1) 0; font-size:var(--text-xs); border-bottom:1px solid rgba(30,41,59,0.3); }
        .me-wp__idx { color:var(--text-dim); font-weight:600; }
        .me-wp__input { background:var(--bg-surface); border:1px solid var(--border-color); border-radius:2px; padding:2px 4px; font-size:var(--text-xs); color:var(--text-main); font-family:var(--font-mono); text-align:right; }
        .me-wp__del { cursor:pointer; color:var(--accent-danger); font-size:var(--text-sm); text-align:center; }
        .me-unit-card { background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:var(--sp-2) var(--sp-3); margin-bottom:var(--sp-2); }
        .me-unit-card__name { font-size:var(--text-sm); font-weight:500; color:var(--text-main); }
        .me-unit-card__meta { font-size:var(--text-xs); color:var(--text-muted); font-family:var(--font-mono); margin-top:2px; }
        `;
    }

    protected render() {
        // Toolbar
        const toolbar = this.el('div', 'me-toolbar');
        toolbar.appendChild(this.el('span', 'me-toolbar__title', 'MISSION EDITOR'));

        const backBtn = document.createElement('button');
        backBtn.className = 'btn btn--ghost btn--sm';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', () => UIStore.activeView.set('menu'));

        const newBtn = document.createElement('button');
        newBtn.className = 'btn btn--primary btn--sm';
        newBtn.textContent = '+ New Mission';
        newBtn.addEventListener('click', () => this.createMission());

        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn btn--ghost btn--sm';
        exportBtn.textContent = 'Push to Server';
        exportBtn.addEventListener('click', async () => {
            // In a real app, we'd translate these MissionDefs into a full World JSON
            // For now, we'll just export the raw world from the server to confirm sync
            const world = await UIStore.client.scenario.exportScenario();
            console.log('Server World State:', world);
            alert('Scenario exported from server. See console.');
        });

        const importBtn = document.createElement('button');
        importBtn.className = 'btn btn--ghost btn--sm';
        importBtn.textContent = 'Pull from Server';
        importBtn.addEventListener('click', async () => {
            // Hydrate editor from server state
            const world = await UIStore.client.scenario.exportScenario();
            this.missions = this.translateWorldToMissions(world);
            this.renderMissionList();
            this.selectedMission.set(null);
        });

        toolbar.append(backBtn, newBtn, exportBtn, importBtn);

        this.listEl = this.el('div', 'me-list');
        this.centerEl = this.el('div', 'me-center');
        this.centerEl.appendChild(this.el('div', 'empty-state', 'Select a mission to edit'));
        this.assignEl = this.el('div', 'me-assign');

        this.element.append(toolbar, this.listEl, this.centerEl, this.assignEl);
    }

    protected async onMount() {
        await this.loadProfiles();
        this.renderMissionList();
        this.subscribe(this.selectedMission, m => {
            if (m) {
                this.renderMissionDetail(m);
                this.renderAssignments(m);
            } else {
                this.centerEl.replaceChildren(this.el('div', 'empty-state', 'Select a mission to edit'));
                this.assignEl.replaceChildren();
            }
        });
    }

    private async loadProfiles() {
        try {
            const data = await UIStore.client.scenario.fetchProfiles();
            this.availableProfiles = data.units.map(([id, p]: [string, any]) => ({
                id,
                name: p.variantName || p.platformClass || id
            }));
        } catch (err) {
            console.error('Failed to load profiles', err);
        }
    }

    private translateWorldToMissions(world: any): MissionDef[] {
        // Mock translation: each side becomes a mission for now
        const missions: MissionDef[] = [];
        const sides = ['Blue', 'Red', 'Green'] as Side[];
        
        for (const side of sides) {
            const sideEntities = world.entities.filter((e: any) => e.side === side);
            if (sideEntities.length === 0) continue;

            missions.push({
                id: `server-${side}-${Date.now()}`,
                name: `Server ${side} Force`,
                type: 'Custom',
                side: side,
                units: sideEntities.map((e: any) => ({
                    profileId: e.profileId || 'unknown',
                    name: e.id,
                    side: side,
                    count: 1
                })),
                waypoints: [],
                triggerCondition: 'Server Sync',
                notes: `Imported from live server state. Contains ${sideEntities.length} entities.`
            });
        }
        return missions;
    }

    private renderMissionList() {
        this.listEl.replaceChildren();
        const header = this.el('div', 'panel__header', 'MISSIONS');
        this.listEl.appendChild(header);

        for (const m of this.missions) {
            const row = this.el('div', 'me-row');
            const selected = this.selectedMission.get();
            if (selected?.id === m.id) row.classList.add('is-selected');

            const side = this.el('span', `me-row__side me-row__side--${m.side.toLowerCase()}`);
            side.textContent = m.side;
            row.appendChild(side);
            row.appendChild(this.el('span', 'me-row__name', m.name));
            row.appendChild(this.el('span', 'me-row__type', m.type));

            row.addEventListener('click', () => {
                this.selectedMission.set(m);
                this.renderMissionList();
            });
            this.listEl.appendChild(row);
        }
    }

    private renderMissionDetail(m: MissionDef) {
        this.centerEl.replaceChildren();

        // Info section
        this.centerEl.appendChild(this.section('Mission Info', [
            this.editField('Name', m.name, v => { m.name = v; this.renderMissionList(); }),
            this.selectField('Type', m.type, ['Patrol', 'Strike', 'ASW', 'CAP', 'SEAD', 'Escort', 'Recon', 'Custom', 'VBSS', 'Minelaying', 'MCM'], v => m.type = v as MissionType),
            this.selectField('Side', m.side, ['Blue', 'Red', 'Green'], v => { m.side = v as Side; this.renderMissionList(); }),
            this.editField('Trigger', m.triggerCondition, v => m.triggerCondition = v),
        ]));

        // Waypoints section
        const wpSection = this.el('div', 'me-section');
        const wpTitle = this.el('div', 'me-section__title');
        wpTitle.style.display = 'flex';
        wpTitle.style.justifyContent = 'space-between';
        const wpLabel = this.el('span', undefined, 'WAYPOINTS');
        const addWpBtn = document.createElement('button');
        addWpBtn.className = 'btn btn--ghost btn--sm';
        addWpBtn.textContent = '+ Add';
        addWpBtn.addEventListener('click', () => {
            m.waypoints.push({ lat: 0, lon: 0, alt: 0, speedKts: 300, action: 'Transit' });
            this.renderMissionDetail(m);
        });
        wpTitle.append(wpLabel, addWpBtn);
        wpSection.appendChild(wpTitle);

        // Header row
        const wpHeader = this.el('div', 'me-wp');
        ['#', 'Lat', 'Lon', 'Alt(m)', 'Spd(kts)', 'Action', ''].forEach(h => {
            wpHeader.appendChild(this.el('span', 'me-wp__idx', h));
        });
        wpSection.appendChild(wpHeader);

        m.waypoints.forEach((wp, idx) => {
            const row = this.el('div', 'me-wp');
            row.appendChild(this.el('span', 'me-wp__idx', `WP${idx + 1}`));
            row.appendChild(this.wpInput(String(wp.lat), v => wp.lat = Number(v)));
            row.appendChild(this.wpInput(String(wp.lon), v => wp.lon = Number(v)));
            row.appendChild(this.wpInput(String(wp.alt), v => wp.alt = Number(v)));
            row.appendChild(this.wpInput(String(wp.speedKts), v => wp.speedKts = Number(v)));
            row.appendChild(this.wpInput(wp.action, v => wp.action = v));

            const del = this.el('span', 'me-wp__del', '✕');
            del.addEventListener('click', () => {
                m.waypoints.splice(idx, 1);
                this.renderMissionDetail(m);
            });
            row.appendChild(del);
            wpSection.appendChild(row);
        });

        this.centerEl.appendChild(wpSection);

        // Notes
        this.centerEl.appendChild(this.section('Notes', [
            this.textAreaField(m.notes, v => m.notes = v),
        ]));

        // Actions
        const actions = this.el('div');
        actions.style.display = 'flex';
        actions.style.gap = 'var(--sp-2)';

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn--danger btn--sm';
        delBtn.textContent = 'Delete Mission';
        delBtn.addEventListener('click', () => {
            this.missions = this.missions.filter(x => x.id !== m.id);
            this.selectedMission.set(null);
            this.renderMissionList();
        });
        actions.appendChild(delBtn);
        this.centerEl.appendChild(actions);
    }

    private renderAssignments(m: MissionDef) {
        this.assignEl.replaceChildren();
        this.assignEl.appendChild(this.el('div', 'me-section__title', 'UNIT ASSIGNMENTS'));

        for (const u of m.units) {
            const card = this.el('div', 'me-unit-card');
            card.appendChild(this.el('div', 'me-unit-card__name', u.name));
            card.appendChild(this.el('div', 'me-unit-card__meta', `${u.profileId} × ${u.count} [${u.side}]`));
            this.assignEl.appendChild(card);
        }

        const addUnitBtn = document.createElement('button');
        addUnitBtn.className = 'btn btn--ghost btn--sm';
        addUnitBtn.style.width = '100%';
        addUnitBtn.textContent = '+ Add Unit';
        addUnitBtn.addEventListener('click', () => {
            m.units.push({ profileId: 'custom', name: 'New Unit', side: m.side, count: 1 });
            this.renderAssignments(m);
        });
        this.assignEl.appendChild(addUnitBtn);
    }

    private createMission() {
        const m: MissionDef = {
            id: `mission-${Date.now()}`, name: 'New Mission', type: 'Patrol', side: 'Blue',
            units: [], waypoints: [], triggerCondition: 'Manual', notes: ''
        };
        this.missions.unshift(m);
        this.selectedMission.set(m);
        this.renderMissionList();
    }

    private section(title: string, children: HTMLElement[]): HTMLElement {
        const sec = this.el('div', 'me-section');
        sec.appendChild(this.el('div', 'me-section__title', title));
        children.forEach(c => sec.appendChild(c));
        return sec;
    }

    private editField(label: string, value: string, onChange: (v: string) => void): HTMLElement {
        const row = this.el('div', 'me-field');
        row.appendChild(this.el('span', 'me-field__label', label));
        const input = document.createElement('input');
        input.className = 'me-field__input';
        input.value = value;
        input.addEventListener('change', () => onChange(input.value));
        row.appendChild(input);
        return row;
    }

    private selectField(label: string, value: string, options: string[], onChange: (v: string) => void): HTMLElement {
        const row = this.el('div', 'me-field');
        row.appendChild(this.el('span', 'me-field__label', label));
        const sel = document.createElement('select');
        sel.className = 'me-field__select';
        for (const opt of options) {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            if (opt === value) o.selected = true;
            sel.appendChild(o);
        }
        sel.addEventListener('change', () => onChange(sel.value));
        row.appendChild(sel);
        return row;
    }

    private wpInput(value: string, onChange: (v: string) => void): HTMLInputElement {
        const input = document.createElement('input');
        input.className = 'me-wp__input';
        input.value = value;
        input.addEventListener('change', () => onChange(input.value));
        return input;
    }

    private textAreaField(value: string, onChange: (v: string) => void): HTMLElement {
        const ta = document.createElement('textarea');
        ta.className = 'me-field__input';
        ta.value = value;
        ta.rows = 3;
        ta.style.width = '100%';
        ta.style.resize = 'vertical';
        ta.addEventListener('change', () => onChange(ta.value));
        return ta;
    }
}
