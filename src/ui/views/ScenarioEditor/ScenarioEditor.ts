import { Component } from '../../framework/Component';
import { Signal } from '../../framework/Signal';
import { UIStore } from '../../framework/UIStore';

import { ScenarioManifest, ScenarioEntity, Side, EntityProfile } from '../../shared/types.js';

interface ScenarioSummary {
    filename: string;
    name: string;
    description: string;
    entityCount: number;
}

/**
 * ScenarioEditor: Real scenario manager backed by the server.
 * Left: scenario file list from data/scenarios/. 
 * Center: entity editor.
 * Right: entity list with add/remove.
 * 
 * All changes persist to the server via the SDK.
 */
export class ScenarioEditor extends Component {
    private listEl!: HTMLElement;
    private centerEl!: HTMLElement;
    private entityListEl!: HTMLElement;
    private statusEl!: HTMLElement;
    private selectedScenario = new Signal<ScenarioSummary | null>(null);
    private currentManifest: ScenarioManifest | null = null;
    private scenarios: ScenarioSummary[] = [];
    private availableProfiles: { id: string; name: string }[] = [];
    private selectedEntityIdx = new Signal<number>(-1);

    constructor() { super('div', 'scenario-editor'); }

    protected styles() {
        return `
        .scenario-editor { display:grid; grid-template-columns:280px 1fr 300px; grid-template-rows:48px 1fr 32px; grid-template-areas:"se-toolbar se-toolbar se-toolbar" "se-list se-center se-entities" "se-status se-status se-status"; height:100vh; background:var(--bg-base); }
        .se-toolbar { grid-area:se-toolbar; display:flex; align-items:center; gap:var(--sp-3); padding:0 var(--sp-4); background:var(--bg-panel); border-bottom:1px solid var(--border-color); }
        .se-toolbar__title { font-family:var(--font-mono); font-size:var(--text-lg); font-weight:700; color:var(--accent-warning); letter-spacing:0.08em; }
        .se-list { grid-area:se-list; overflow-y:auto; background:var(--bg-panel); border-right:1px solid var(--border-color); }
        .se-center { grid-area:se-center; overflow-y:auto; padding:var(--sp-4); }
        .se-entities { grid-area:se-entities; overflow-y:auto; background:var(--bg-panel); border-left:1px solid var(--border-color); padding:var(--sp-3); }
        .se-status { grid-area:se-status; display:flex; align-items:center; padding:0 var(--sp-4); background:var(--bg-panel); border-top:1px solid var(--border-color); font-size:var(--text-xs); color:var(--text-muted); font-family:var(--font-mono); }
        .se-row { display:flex; align-items:center; gap:var(--sp-2); padding:var(--sp-2) var(--sp-3); cursor:pointer; border-bottom:1px solid var(--border-color); transition:background var(--transition-fast); border-left:3px solid transparent; }
        .se-row:hover { background:var(--bg-hover); }
        .se-row.is-selected { background:var(--bg-active); border-left-color:var(--accent-warning); }
        .se-row__name { flex:1; font-size:var(--text-sm); color:var(--text-main); }
        .se-row__count { font-size:var(--text-xs); color:var(--text-muted); font-family:var(--font-mono); }
        .se-section { margin-bottom:var(--sp-5); }
        .se-section__title { font-size:var(--text-xs); font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:var(--sp-2); padding-bottom:var(--sp-1); border-bottom:1px solid var(--border-color); }
        .se-field { display:grid; grid-template-columns:120px 1fr; gap:var(--sp-2); align-items:center; padding:var(--sp-1) 0; }
        .se-field__label { font-size:var(--text-xs); color:var(--text-muted); text-transform:uppercase; }
        .se-field__input { background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:var(--sp-1) var(--sp-2); font-size:var(--text-sm); color:var(--text-main); font-family:var(--font-mono); }
        .se-field__input:focus { border-color:var(--accent-warning); outline:none; }
        .se-field__select { background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:var(--sp-1) var(--sp-2); font-size:var(--text-sm); color:var(--text-main); }
        .se-entity-card { background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:var(--sp-2) var(--sp-3); margin-bottom:var(--sp-2); cursor:pointer; transition:background var(--transition-fast); }
        .se-entity-card:hover { background:var(--bg-hover); }
        .se-entity-card.is-selected { border-color:var(--accent-warning); background:var(--bg-active); }
        .se-entity-card__name { font-size:var(--text-sm); font-weight:500; color:var(--text-main); }
        .se-entity-card__meta { font-size:var(--text-xs); color:var(--text-muted); font-family:var(--font-mono); margin-top:2px; }
        .se-entity-card__side--blue { border-left:3px solid var(--color-friendly); }
        .se-entity-card__side--red { border-left:3px solid var(--color-hostile); }
        .se-entity-card__side--green { border-left:3px solid var(--color-neutral); }
        .se-empty { display:flex; align-items:center; justify-content:center; height:100%; color:var(--text-dim); font-size:var(--text-sm); }
        `;
    }

    protected render() {
        // Toolbar
        const toolbar = this.el('div', 'se-toolbar');
        toolbar.appendChild(this.el('span', 'se-toolbar__title', 'SCENARIO EDITOR'));

        const backBtn = document.createElement('button');
        backBtn.className = 'btn btn--ghost btn--sm';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', () => UIStore.activeView.set('menu'));

        const newBtn = document.createElement('button');
        newBtn.className = 'btn btn--primary btn--sm';
        newBtn.textContent = '+ New Scenario';
        newBtn.addEventListener('click', () => this.createNewScenario());

        const loadBtn = document.createElement('button');
        loadBtn.className = 'btn btn--ghost btn--sm';
        loadBtn.style.marginLeft = 'auto';
        loadBtn.textContent = '⚡ Load into Engine';
        loadBtn.addEventListener('click', () => this.loadIntoEngine());

        toolbar.append(backBtn, newBtn, loadBtn);

        this.listEl = this.el('div', 'se-list');
        this.centerEl = this.el('div', 'se-center');
        this.centerEl.appendChild(this.el('div', 'se-empty', 'Select or create a scenario'));
        this.entityListEl = this.el('div', 'se-entities');
        this.statusEl = this.el('div', 'se-status');
        this.statusEl.textContent = 'Ready';

        this.element.append(toolbar, this.listEl, this.centerEl, this.entityListEl, this.statusEl);
    }

    protected async onMount() {
        await this.loadData();
        this.renderScenarioList();
        this.subscribe(this.selectedScenario, async (s) => {
            if (s) {
                await this.loadManifest(s.filename);
            } else {
                this.currentManifest = null;
                this.centerEl.replaceChildren(this.el('div', 'se-empty', 'Select or create a scenario'));
                this.entityListEl.replaceChildren();
            }
        });
        this.subscribe(this.selectedEntityIdx, (idx) => {
            if (this.currentManifest && idx >= 0 && idx < this.currentManifest.entities.length) {
                this.renderEntityDetail(this.currentManifest.entities[idx], idx);
            }
        });
    }

    private async loadData() {
        try {
            const [scenarios, profileData] = await Promise.all([
                UIStore.client.scenario.listScenarios(),
                UIStore.client.scenario.fetchProfiles()
            ]);
            this.scenarios = scenarios;
            this.availableProfiles = profileData.units.map(([id, p]: [string, any]) => ({
                id,
                name: p.variantName || p.platformClass || id
            }));
            this.setStatus(`Loaded ${scenarios.length} scenarios, ${this.availableProfiles.length} profiles`);
        } catch (err) {
            console.error('Failed to load data', err);
            this.setStatus('ERROR: Server unreachable');
        }
    }

    private async loadManifest(filename: string) {
        try {
            this.currentManifest = await UIStore.client.scenario.getScenario(filename);
            this.renderManifestEditor();
            this.renderEntityCards();
            this.selectedEntityIdx.set(-1);
            this.setStatus(`Loaded: ${filename}`);
        } catch (err) {
            this.setStatus(`ERROR: ${err}`);
        }
    }

    private renderScenarioList() {
        this.listEl.replaceChildren();
        const header = this.el('div', 'panel__header', 'SCENARIOS');
        this.listEl.appendChild(header);

        if (this.scenarios.length === 0) {
            this.listEl.appendChild(this.el('div', 'se-empty', 'No scenarios on server'));
            return;
        }

        for (const s of this.scenarios) {
            const row = this.el('div', 'se-row');
            const selected = this.selectedScenario.get();
            if (selected?.filename === s.filename) row.classList.add('is-selected');

            row.appendChild(this.el('span', 'se-row__name', s.name));
            row.appendChild(this.el('span', 'se-row__count', `${s.entityCount} units`));

            row.addEventListener('click', () => {
                this.selectedScenario.set(s);
                this.renderScenarioList();
            });
            this.listEl.appendChild(row);
        }
    }

    private renderManifestEditor() {
        const m = this.currentManifest;
        if (!m) return;

        this.centerEl.replaceChildren();

        // Info section
        this.centerEl.appendChild(this.section('Scenario Info', [
            this.editField('Name', m.name, v => { m.name = v; }),
            this.editField('Description', m.description || '', v => { m.description = v; }),
            this.editField('Origin Lat', String(m.origin?.lat || 0), v => {
                if (!m.origin) m.origin = { lat: 0, lon: 0 };
                m.origin.lat = Number(v);
            }),
            this.editField('Origin Lon', String(m.origin?.lon || 0), v => {
                if (!m.origin) m.origin = { lat: 0, lon: 0 };
                m.origin.lon = Number(v);
            }),
        ]));

        // Actions
        const actions = this.el('div');
        actions.style.display = 'flex';
        actions.style.gap = 'var(--sp-2)';
        actions.style.marginTop = 'var(--sp-4)';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn--primary';
        saveBtn.textContent = '💾 Save to Server';
        saveBtn.addEventListener('click', () => this.saveScenario());

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn--danger';
        deleteBtn.textContent = '🗑️ Delete';
        deleteBtn.addEventListener('click', () => this.deleteScenario());

        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn btn--ghost';
        exportBtn.textContent = '📋 Copy JSON';
        exportBtn.addEventListener('click', () => {
            const json = JSON.stringify(m, null, 2);
            navigator.clipboard?.writeText(json);
            this.setStatus('Copied to clipboard');
        });

        actions.append(saveBtn, deleteBtn, exportBtn);
        this.centerEl.appendChild(actions);

        // Selected entity detail appears below
        const detailSection = this.el('div', 'se-section');
        detailSection.id = 'entity-detail';
        this.centerEl.appendChild(detailSection);
    }

    private renderEntityDetail(e: ScenarioEntity, idx: number) {
        const detailEl = this.centerEl.querySelector('#entity-detail') as HTMLElement;
        if (!detailEl) return;
        detailEl.replaceChildren();

        detailEl.appendChild(this.el('div', 'se-section__title', `ENTITY #${idx + 1}`));

        detailEl.appendChild(this.editField('ID', e.id || '', v => { e.id = v; }));
        detailEl.appendChild(this.selectField('Profile', e.profileId || '',
            this.availableProfiles.map(p => p.id),
            v => { e.profileId = v; this.renderEntityCards(); }
        ));
        detailEl.appendChild(this.selectField('Side', e.side,
            ['Blue', 'Red', 'Green', 'Neutral'],
            v => { e.side = v as Side; this.renderEntityCards(); }
        ));
        const pos = (e.pos || [0, 0, 0]) as [number, number, number];
        detailEl.appendChild(this.editField('X (m)', String(pos[0]), v => { pos[0] = Number(v); e.pos = pos; }));
        detailEl.appendChild(this.editField('Y (m)', String(pos[1]), v => { pos[1] = Number(v); e.pos = pos; }));
        detailEl.appendChild(this.editField('Z (m)', String(pos[2]), v => { pos[2] = Number(v); e.pos = pos; }));
        detailEl.appendChild(this.editField('Heading', String(e.heading || 0), v => { e.heading = Number(v); }));

        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn--danger btn--sm';
        removeBtn.style.marginTop = 'var(--sp-2)';
        removeBtn.textContent = 'Remove Entity';
        removeBtn.addEventListener('click', () => {
            this.currentManifest!.entities.splice(idx, 1);
            this.selectedEntityIdx.set(-1);
            this.renderEntityCards();
            detailEl.replaceChildren();
        });
        detailEl.appendChild(removeBtn);
    }

    private renderEntityCards() {
        const m = this.currentManifest;
        if (!m) return;

        this.entityListEl.replaceChildren();
        this.entityListEl.appendChild(this.el('div', 'se-section__title', `ENTITIES (${m.entities.length})`));

        for (let i = 0; i < m.entities.length; i++) {
            const e = m.entities[i];
            const sideClass = `se-entity-card__side--${e.side.toLowerCase()}`;
            const card = this.el('div', `se-entity-card ${sideClass}`);
            if (i === this.selectedEntityIdx.get()) card.classList.add('is-selected');

            const profileName = this.availableProfiles.find(p => p.id === e.profileId)?.name || e.profileId;
            card.appendChild(this.el('div', 'se-entity-card__name', e.id || `Entity #${i + 1}`));
            const posStr = Array.isArray(e.pos) ? e.pos.join(', ') : e.pos ? `${e.pos.x}, ${e.pos.y}, ${e.pos.z}` : '0, 0, 0';
            card.appendChild(this.el('div', 'se-entity-card__meta', `${profileName} · ${e.side} · [${posStr}]`));

            card.addEventListener('click', () => {
                this.selectedEntityIdx.set(i);
                this.renderEntityCards();
            });
            this.entityListEl.appendChild(card);
        }

        // Add entity button
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn--ghost btn--sm';
        addBtn.style.width = '100%';
        addBtn.style.marginTop = 'var(--sp-2)';
        addBtn.textContent = '+ Add Entity';
        addBtn.addEventListener('click', () => {
            const defaultProfile = this.availableProfiles[0]?.id || 'unit-frigate';
            m.entities.push({
                profileId: defaultProfile,
                pos: [0, 0, 20],
                heading: 0,
                side: Side.Blue
            });
            this.renderEntityCards();
            this.selectedEntityIdx.set(m.entities.length - 1);
        });
        this.entityListEl.appendChild(addBtn);
    }

    // ─── Actions ─────────────────────────────────────────────

    private async saveScenario() {
        const selected = this.selectedScenario.get();
        if (!selected || !this.currentManifest) return;

        this.setStatus('Saving...');
        try {
            const result = await UIStore.client.scenario.saveScenario(selected.filename, this.currentManifest);
            if (result.success) {
                this.setStatus(`Saved: ${selected.filename}`);
                await this.loadData();
                this.renderScenarioList();
            } else {
                this.setStatus('ERROR: Save failed');
            }
        } catch (err) {
            this.setStatus(`ERROR: ${err}`);
        }
    }

    private async deleteScenario() {
        const selected = this.selectedScenario.get();
        if (!selected) return;

        if (!confirm(`Delete "${selected.name}"?`)) return;

        this.setStatus('Deleting...');
        try {
            await UIStore.client.scenario.deleteScenario(selected.filename);
            this.selectedScenario.set(null);
            await this.loadData();
            this.renderScenarioList();
            this.setStatus('Scenario deleted');
        } catch (err) {
            this.setStatus(`ERROR: ${err}`);
        }
    }

    private async loadIntoEngine() {
        const selected = this.selectedScenario.get();
        if (!selected) {
            this.setStatus('Select a scenario first');
            return;
        }

        this.setStatus('Loading into engine...');
        try {
            const result = await UIStore.client.scenario.loadScenarioIntoEngine(selected.filename);
            if (result.success) {
                this.setStatus(`Loaded "${result.name}" — ${result.entityCount} entities spawned`);
                if (result.matchId) {
                    UIStore.joinMatch(Side.Blue, result.matchId);
                }
                UIStore.activeView.set('tactical');
            } else {
                this.setStatus('ERROR: Engine rejected scenario');
            }
        } catch (err) {
            this.setStatus(`ERROR: ${err}`);
        }
    }

    private async createNewScenario() {
        const filename = `scenario-${Date.now()}.json`;
        const manifest: ScenarioManifest = {
            name: 'New Scenario',
            description: '',
            origin: { lat: 24.5, lon: 120.5 },
            entities: []
        };

        this.setStatus('Creating...');
        try {
            await UIStore.client.scenario.saveScenario(filename, manifest);
            await this.loadData();
            this.renderScenarioList();
            // Select the new one
            const newEntry = this.scenarios.find(s => s.filename === filename);
            if (newEntry) this.selectedScenario.set(newEntry);
            this.setStatus('New scenario created');
        } catch (err) {
            this.setStatus(`ERROR: ${err}`);
        }
    }

    // ─── Helpers ──────────────────────────────────────────────

    private setStatus(msg: string) {
        if (this.statusEl) this.statusEl.textContent = msg;
    }

    private section(title: string, children: HTMLElement[]): HTMLElement {
        const sec = this.el('div', 'se-section');
        sec.appendChild(this.el('div', 'se-section__title', title));
        children.forEach(c => sec.appendChild(c));
        return sec;
    }

    private editField(label: string, value: string, onChange: (v: string) => void): HTMLElement {
        const row = this.el('div', 'se-field');
        row.appendChild(this.el('span', 'se-field__label', label));
        const input = document.createElement('input');
        input.className = 'se-field__input';
        input.value = value;
        input.addEventListener('change', () => onChange(input.value));
        row.appendChild(input);
        return row;
    }

    private selectField(label: string, value: string, options: string[], onChange: (v: string) => void): HTMLElement {
        const row = this.el('div', 'se-field');
        row.appendChild(this.el('span', 'se-field__label', label));
        const sel = document.createElement('select');
        sel.className = 'se-field__select';
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
}
