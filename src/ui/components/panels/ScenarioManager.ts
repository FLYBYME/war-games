import { Component } from '../../framework/Component';
import { sdkClient } from '../../framework/Client';
import { UIStore } from '../../framework/UIStore';
import { Side } from '../../../sdk/schemas';

interface ScenarioSummary {
    filename: string;
    name: string;
    description: string;
    entityCount: number;
}

/**
 * ScenarioManager: Specialized UI for managing scenario files.
 */
export class ScenarioManager extends Component {
    private scenarioList: ScenarioSummary[] = [];

    constructor() {
        super('div', 'scenario-manager', 'scenario-manager');
    }

    protected styles(): string {
        return `
            .scenario-manager { padding: var(--sp-4); background: var(--bg-panel); border: 1px solid var(--border-color); }
            .scenario-row { display: flex; justify-content: space-between; padding: var(--sp-2) 0; border-bottom: 1px solid var(--border-color); }
            .btn-load { background: var(--accent-info); color: white; border: none; padding: 4px 8px; cursor: pointer; }
        `;
    }

    protected render(): void {
        this.element.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 10px;">AVAILABLE SCENARIOS</div>
            <div id="scenario-list"></div>
        `;

        this.refresh();
    }

    private async refresh() {
        try {
            const scenarios = await sdkClient.scenario.listScenarios();
            this.scenarioList = scenarios;
            this.sync();
        } catch (e) {
            console.error('Refresh scenarios failed', e);
        }
    }

    private sync() {
        const listEl = this.element.querySelector('#scenario-list')!;
        listEl.innerHTML = '';
        
        this.scenarioList.forEach(s => {
            const row = this.el('div', 'scenario-row');
            row.innerHTML = `
                <div>
                    <div style="font-weight: 600;">${s.name}</div>
                    <div style="font-size: 10px; color: var(--text-muted);">${s.description || 'No description'} | Entities: ${s.entityCount}</div>
                </div>
                <button class="btn-load" data-filename="${s.filename}">LOAD</button>
            `;
            
            const btn = row.querySelector('.btn-load') as HTMLButtonElement;
            this.listen(btn, 'click', () => this.handleLoad(s.filename));
            
            listEl.appendChild(row);
        });
    }

    private async handleLoad(filename: string) {
        try {
            const result = await sdkClient.scenario.loadScenarioIntoEngine(filename);
            if (result.success && result.matchId) {
                UIStore.currentMatchId.set(result.matchId);
                sdkClient.joinMatch(Side.Blue, result.matchId);
            }
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Load scenario failed', error);
        }
    }
}
