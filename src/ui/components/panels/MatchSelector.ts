import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { sdkClient } from '../../framework/Client';
import { Side } from '../../../sdk/schemas';

/**
 * MatchSelector: UI for listing, joining, and creating sim matches.
 */
export class MatchSelector extends Component {
    private listEl!: HTMLElement;

    constructor() {
        super('div', 'match-selector', 'match-selector');
    }

    protected styles(): string {
        return `
            .match-selector { padding: var(--sp-4); background: var(--bg-panel); border: 1px solid var(--border-color); }
            .match-row { display: flex; justify-content: space-between; padding: var(--sp-2) 0; border-bottom: 1px solid var(--border-color); }
            .btn-join { background: var(--color-friendly); color: white; border: none; padding: 4px 8px; cursor: pointer; }
        `;
    }

    protected render(): void {
        this.element.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 10px;">ACTIVE MATCHES</div>
            <div id="match-list"></div>
            <button id="btn-new-match" style="margin-top: 10px; width: 100%;">CREATE NEW MATCH</button>
        `;

        this.listEl = this.element.querySelector('#match-list') as HTMLElement;
        const newBtn = this.element.querySelector('#btn-new-match') as HTMLButtonElement;
        
        this.listen(newBtn, 'click', () => this.handleCreateMatch());

        this.subscribe(UIStore.matches, () => this.sync());
    }

    protected onMount(): void {
        this.refresh();
    }

    private async refresh() {
        try {
            const matches = await sdkClient.listMatches();
            UIStore.matches.set(matches);
        } catch (e) {
            console.error('Refresh matches failed', e);
        }
    }

    private sync() {
        const matches = UIStore.matches.get();
        this.listEl.innerHTML = '';
        
        matches.forEach(m => {
            const row = this.el('div', 'match-row');
            row.innerHTML = `
                <div>
                    <div style="font-weight: 600;">${m.id}</div>
                    <div style="font-size: 10px; color: var(--text-muted);">Tick: ${m.tick} | Units: ${m.entityCount}</div>
                </div>
                <button class="btn-join" data-id="${m.id}">JOIN</button>
            `;
            
            const btn = row.querySelector('.btn-join') as HTMLButtonElement;
            this.listen(btn, 'click', () => {
                UIStore.currentMatchId.set(m.id);
                sdkClient.joinMatch(Side.Blue, m.id);
            });
            
            this.listEl.appendChild(row);
        });
    }

    private async handleCreateMatch() {
        const name = prompt('Match ID:', `match-${Date.now()}`);
        if (!name) return;

        try {
            await sdkClient.apiFetch('/api/scenarios/load', {
                method: 'POST',
                body: JSON.stringify({ filename: 'naval-surface-duel', matchId: name })
            });
            this.refresh();
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Create match failed', error);
        }
    }
}
