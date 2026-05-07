import { UIStore } from '../../framework/UIStore';
import { Component } from '../../framework/Component';
import { logger } from '../../framework/Logger';
import { Side } from '../../../sdk/schemas/domain.js';

interface MatchInfo {
    id: string;
    tick: number;
    entityCount: number;
}

interface ScenarioSummary {
    filename: string;
    name: string;
    description: string;
    entityCount: number;
}

/**
 * MatchManager: Controls simulation matches and scenario loading.
 */
export class MatchManager extends Component {
    private matchListEl!: HTMLElement;
    private scenarioListEl!: HTMLElement;
    private timer: ReturnType<typeof setInterval> | undefined;

    constructor() {
        super('div', 'match-manager', 'match-manager');
    }

    protected styles(): string {
        return `
            .match-manager {
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                height: 100%;
                background: #1e1e1e;
                color: #ddd;
            }
            .section-title {
                font-size: 10px;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 4px;
            }
            .item-list {
                flex: 1;
                overflow-y: auto;
                border: 1px solid #333;
                background: #111;
            }
            .list-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 10px;
                border-bottom: 1px solid #222;
                font-size: 12px;
            }
            .match-id { font-weight: bold; color: #00d1ff; }
            .match-stats { font-size: 10px; color: #666; }
            .btn-delete {
                background: #442222;
                border: 1px solid #663333;
                color: #ffaaaa;
                padding: 2px 6px;
                font-size: 9px;
                cursor: pointer;
            }
            .btn-delete:hover { background: #662222; }
            .btn-load {
                background: #224422;
                border: 1px solid #336633;
                color: #aaffaa;
                padding: 2px 6px;
                font-size: 9px;
                cursor: pointer;
            }
            .btn-load:hover { background: #226622; }
        `;
    }

    protected render(): void {
        this.element.appendChild(this.el('div', 'section-title', 'Active Matches'));
        this.matchListEl = this.el('div', 'item-list', '', 'match-list');
        this.element.appendChild(this.matchListEl);

        this.element.appendChild(this.el('div', 'section-title', 'Available Scenarios'));
        this.scenarioListEl = this.el('div', 'item-list', '', 'scenario-list');
        this.element.appendChild(this.scenarioListEl);
    }

    protected onMount(): void {
        this.refresh();
        this.timer = setInterval(() => this.refresh(), 3000);
    }

    protected onUnmount(): void {
        if (this.timer) clearInterval(this.timer);
    }

    private async refresh() {
        try {
            const [matchResp, scenarioResp] = await Promise.all([
                fetch('/api/matches'),
                fetch('/api/matches/scenarios')
            ]);

            const matches: MatchInfo[] = await matchResp.json();
            const scenarios: ScenarioSummary[] = await scenarioResp.json();

            this.updateMatchList(matches);
            this.updateScenarioList(scenarios);
        } catch (err) {
            logger.error('Failed to refresh MatchManager', { err });
        }
    }

    private updateMatchList(matches: MatchInfo[]) {
        this.matchListEl.innerHTML = '';
        matches.forEach(m => {
            const row = this.el('div', 'list-row');
            const info = this.el('div');
            info.appendChild(this.el('div', 'match-id', m.id));
            info.appendChild(this.el('div', 'match-stats', `Tick: ${m.tick} | Entities: ${m.entityCount}`));

            const actions = this.el('div', 'match-actions');

            // JOIN Button
            const joinBtn = this.el('button', 'btn-load join-match-btn', 'JOIN', `join-match-${m.id}`);
            this.listen(joinBtn, 'click', () => {
                UIStore.joinMatch(Side.Blue, m.id);
            });
            actions.appendChild(joinBtn);

            if (m.id !== 'default') {
                const delBtn = this.el('button', 'btn-delete delete-match-btn', 'DELETE', `delete-match-${m.id}`);
                this.listen(delBtn, 'click', () => this.deleteMatch(m.id));
                actions.appendChild(delBtn);
            }

            row.appendChild(info);
            row.appendChild(actions);
            this.matchListEl.appendChild(row);
        });
    }

    private updateScenarioList(scenarios: ScenarioSummary[]) {
        this.scenarioListEl.innerHTML = '';
        scenarios.forEach(s => {
            const row = this.el('div', 'list-row');
            const info = this.el('div');
            info.appendChild(this.el('div', 'scenario-name', s.name));
            info.appendChild(this.el('div', 'match-stats', s.description || 'No description'));

            row.appendChild(info);

            const loadBtn = this.el('button', 'btn-load load-scenario-btn', 'LOAD & JOIN', `load-scenario-${s.filename}`);
            this.listen(loadBtn, 'click', () => this.loadScenario(s.filename));
            row.appendChild(loadBtn);

            this.scenarioListEl.appendChild(row);
        });
    }

    private async deleteMatch(id: string) {
        if (!confirm(`Delete match ${id}?`)) return;
        try {
            await fetch(`/api/matches/${id}`, { method: 'DELETE' });
            if (UIStore.currentMatchId.get() === id) {
                UIStore.joinMatch(Side.Blue, 'default');
            }
            this.refresh();
        } catch (err) {
            logger.error('Delete match failed', { err });
        }
    }

    private async loadScenario(filename: string) {
        try {
            const resp = await fetch('/api/matches/scenarios/load', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });
            const result = await resp.json();
            if (result.success) {
                UIStore.joinMatch(Side.Blue, result.matchId);
                this.refresh();
            }
        } catch (err) {
            logger.error('Load scenario failed', { err });
        }
    }
}
