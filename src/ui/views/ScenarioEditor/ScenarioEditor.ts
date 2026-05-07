import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

/**
 * ScenarioEditor: UI for creating and saving simulation scenarios.
 */
export class ScenarioEditor extends Component {
    constructor() {
        super('div', 'scenario-editor');
    }

    protected render(): void {
        this.element.innerHTML = `
            <div class="panel-header">Scenario Workshop</div>
            <div class="panel-content">
                <div class="workshop-grid">
                    <div class="workshop-sidebar">
                        <div class="section-title">Active Matches</div>
                        <div id="active-matches-list"></div>
                    </div>
                    <div class="workshop-main">
                        <button class="btn-primary" id="btn-export-scenario">Export Truth Snapshot</button>
                    </div>
                </div>
            </div>
        `;

        const btn = this.element.querySelector('#btn-export-scenario') as HTMLButtonElement;
        this.listen(btn, 'click', () => {
            console.log('Exporting scenario manifest...');
        });
    }

    onMount(): void {
        this.subscribe(UIStore.matches, (matches: { id: string, entityCount: number }[]) => {
            const list = this.element.querySelector('#active-matches-list')!;
            list.innerHTML = matches.map(m => `
                <div class="match-item">
                    ${m.id} (${m.entityCount} units)
                </div>
            `).join('');
        });
    }
}
