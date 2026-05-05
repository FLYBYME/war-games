import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { Side } from '../../../sdk/schemas/domain.js';

/**
 * MatchSelector: Allows users to view and join active matches or create new ones.
 */
export class MatchSelector extends Component {
    private matchContainer!: HTMLElement;

    constructor() { super('div', 'match-selector'); }

    protected styles() {
        return `
        .match-selector { padding: var(--sp-4); max-width: 600px; margin: 40px auto; background: var(--bg-panel); border: 1px solid var(--border-color); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); }
        .ms-title { font-size: var(--text-xl); font-weight: 700; color: var(--text-main); margin-bottom: var(--sp-4); text-align: center; letter-spacing: -0.02em; }
        .ms-list { display: flex; flex-direction: column; gap: var(--sp-2); margin-bottom: var(--sp-4); }
        .ms-item { display: flex; align-items: center; justify-content: space-between; padding: var(--sp-3) var(--sp-4); background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); transition: all var(--transition-fast); cursor: pointer; }
        .ms-item:hover { border-color: var(--color-friendly); background: var(--bg-hover); transform: translateY(-1px); }
        .ms-item__info { display: flex; flex-direction: column; }
        .ms-item__id { font-weight: 600; color: var(--text-main); font-size: var(--text-sm); }
        .ms-item__stats { font-size: var(--text-xs); color: var(--text-dim); font-family: var(--font-mono); }
        .ms-item__badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(0,212,255,0.1); color: var(--color-friendly); text-transform: uppercase; font-weight: 700; }
        .ms-actions { display: flex; gap: var(--sp-2); }
        .ms-input { flex: 1; background: var(--bg-base); border: 1px solid var(--border-color); color: var(--text-main); padding: 8px 12px; border-radius: var(--radius-md); outline: none; font-size: var(--text-sm); }
        .ms-input:focus { border-color: var(--color-friendly); }
        `;
    }

    protected render() {
        this.element.innerHTML = `
            <div class="ms-title">TACTICAL OPERATIONS CENTER</div>
            <div class="ms-list" id="match-list">
                <div class="ms-item__stats" style="text-align:center; padding: 20px;">Fetching active operations...</div>
            </div>
            <div class="ms-actions">
                <input type="text" id="new-match-id" class="ms-input" placeholder="Enter New Match ID..." />
                <button id="create-match-btn" class="btn btn--primary">Initialize Ops</button>
            </div>
        `;

        this.matchContainer = this.element.querySelector('#match-list') as HTMLElement;
        
        const createBtn = this.element.querySelector('#create-match-btn') as HTMLButtonElement;
        const input = this.element.querySelector('#new-match-id') as HTMLInputElement;

        createBtn.addEventListener('click', () => {
            const id = input.value.trim();
            if (id) this.joinMatch(id);
        });

        this.fetchMatches();
    }

    private async fetchMatches() {
        try {
            const res = await fetch('/api/matches');
            const matches = await res.json();
            this.rebuildList(matches);
        } catch (err) {
            console.error('Failed to fetch matches', err);
        }
    }

    private rebuildList(matches: any[]) {
        this.matchContainer.innerHTML = '';
        if (matches.length === 0) {
            this.matchContainer.innerHTML = '<div class="ms-item__stats" style="text-align:center; padding: 20px;">No active matches found.</div>';
            return;
        }

        for (const match of matches) {
            const item = this.el('div', 'ms-item');
            
            const info = this.el('div', 'ms-item__info');
            info.innerHTML = `
                <div class="ms-item__id">${match.id}</div>
                <div class="ms-item__stats">Tick: ${match.tick} | Entities: ${match.entityCount}</div>
            `;
            
            const right = this.el('div', undefined);
            Object.assign(right.style, { display: 'flex', alignItems: 'center', gap: '12px' });
            
            if (match.id !== 'default') {
                const delBtn = this.el('button', 'btn btn--ghost', '🗑️');
                Object.assign(delBtn.style, { padding: '4px 8px', fontSize: '14px', opacity: '0.6' });
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`Delete match "${match.id}"?`)) {
                        this.deleteMatch(match.id);
                    }
                });
                delBtn.addEventListener('mouseenter', () => delBtn.style.opacity = '1');
                delBtn.addEventListener('mouseleave', () => delBtn.style.opacity = '0.6');
                right.appendChild(delBtn);
            }
            
            const badge = this.el('div', 'ms-item__badge', 'Active');
            right.appendChild(badge);

            item.appendChild(info);
            item.appendChild(right);
            
            item.addEventListener('click', () => this.joinMatch(match.id));
            this.matchContainer.appendChild(item);
        }
    }

    private async deleteMatch(matchId: string) {
        try {
            const res = await fetch(`/api/matches/${encodeURIComponent(matchId)}`, { method: 'DELETE' });
            if (res.ok) {
                this.fetchMatches();
            } else {
                const data = await res.json();
                alert(`Failed to delete match: ${data.error}`);
            }
        } catch (err) {
            console.error('Failed to delete match', err);
        }
    }

    private joinMatch(matchId: string) {
        console.log(`Joining Match: ${matchId}`);
        UIStore.joinMatch(Side.Blue, matchId);
        UIStore.activeView.set('tactical');
    }
}
