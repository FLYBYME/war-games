import { sdkClient } from '../../framework/Client.js';
import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { Side } from '../../../sdk/schemas/domain.js';

/**
 * ScenarioManager: Save/load/export scenario JSON files.
 */
export class ScenarioManager extends Component {
    private fileList!: HTMLElement;
    private scenarios: any[] = [];

    constructor() { super('div', 'scenario-mgr'); }

    protected styles() {
        return `
        .scenario-mgr { padding:var(--sp-3); }
        .sm-title { font-size:var(--text-xs); font-weight:600; color:var(--text-muted); text-transform:uppercase; margin-bottom:var(--sp-2); display:flex; justify-content:space-between; align-items:center; }
        .sm-list { max-height: 300px; overflow-y: auto; }
        .sm-row { display:flex; align-items:center; gap:var(--sp-2); padding:var(--sp-2) var(--sp-3); border:1px solid var(--border-color); border-radius:var(--radius-md); margin-bottom:var(--sp-2); background:var(--bg-surface); cursor:pointer; transition:all var(--transition-fast); }
        .sm-row:hover { border-color:var(--border-light); background:var(--bg-hover); }
        .sm-row__name { flex:1; font-size:var(--text-sm); color:var(--text-main); font-weight:500; }
        .sm-row__meta { font-size:var(--text-xs); color:var(--text-dim); font-family:var(--font-mono); margin-right: var(--sp-3); }
        .sm-actions { display:flex; gap:4px; margin-top:var(--sp-3); }
        `;
    }

    protected render() {
        const header = this.el('div', 'sm-title');
        header.appendChild(this.el('span', undefined, 'SCENARIO MANAGER'));
        const newBtn = document.createElement('button');
        newBtn.className = 'btn btn--primary btn--sm';
        newBtn.textContent = '+ New';
        header.appendChild(newBtn);
        this.element.appendChild(header);

        this.fileList = this.el('div', 'sm-list');
        this.element.appendChild(this.fileList);

        const actions = this.el('div', 'sm-actions');
        const importBtn = document.createElement('button');
        importBtn.className = 'btn btn--ghost btn--sm';
        importBtn.textContent = 'Import JSON';
        importBtn.addEventListener('click', () => this.importScenario());

        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn btn--ghost btn--sm';
        exportBtn.textContent = 'Export All';
        exportBtn.addEventListener('click', () => {
            sdkClient.scenario.exportScenario();
        });

        actions.append(importBtn, exportBtn);
        this.element.appendChild(actions);
    }

    private async fetchScenarios() {
        try {
            const response = await fetch('/api/scenarios');
            this.scenarios = await response.json();
            this.rebuildList();
        } catch (err) {
            console.error('Failed to fetch scenarios', err);
        }
    }

    private rebuildList() {
        this.fileList.replaceChildren();
        if (this.scenarios.length === 0) {
            this.fileList.appendChild(this.el('div', 'sm-row__meta', 'No scenarios found on server.'));
            return;
        }

        for (const s of this.scenarios) {
            const row = this.el('div', 'sm-row');
            row.appendChild(this.el('span', 'sm-row__name', s.name));
            row.appendChild(this.el('span', 'sm-row__meta', `${s.entityCount} units`));

            const loadBtn = document.createElement('button');
            loadBtn.className = 'btn btn--primary btn--sm';
            loadBtn.textContent = 'Load';
            loadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.loadScenario(s.filename);
            });
            row.appendChild(loadBtn);
            this.fileList.appendChild(row);
        }
    }

    private async loadScenario(filename: string) {
        try {
            const response = await fetch('/api/scenarios/load', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    filename, 
                    matchId: UIStore.currentMatchId.get() 
                })
            });
            const result = await response.json();
            if (result.success) {
                console.log(`Scenario loaded: ${result.name} in match ${result.matchId}`);
                if (result.matchId) {
                    UIStore.joinMatch(Side.Blue, result.matchId);
                    UIStore.activeView.set('tactical');
                }
            }
        } catch (err) {
            console.error('Failed to load scenario', err);
        }
    }

    protected onMount() {
        sdkClient.events.on('state:viewState', this.onMessage);
        this.fetchScenarios();
    }

    protected onUnmount() {
        sdkClient.events.off('state:viewState', this.onMessage);
    }

    private onMessage = (msg: any) => {
        if (msg.type === 'SCENARIO_EXPORTED') {
            const data = JSON.stringify(msg.payload, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scenario-${new Date().toISOString().slice(0, 19)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }

    private importScenario() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', () => {
            const file = input.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result as string);
                    sdkClient.dispatch({ type: 'IMPORT_SCENARIO', payload: data } as any);
                } catch { /* ignore bad files */ }
            };
            reader.readAsText(file);
        });
        input.click();
    }
}
