import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { Side } from '../../../sdk/schemas/domain.js';

/**
 * MissionPanel: Manages tactical mission assignments (CAP, Strike, etc.)
 */
export class MissionPanel extends Component {
    private listContainer!: HTMLElement;

    constructor() {
        super('div', 'mission-panel');
    }

    protected styles(): string {
        return `
            .mission-panel { padding: var(--sp-3); display: flex; flex-direction: column; gap: var(--sp-4); height: 100%; box-sizing: border-box; }
            .mission-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: var(--sp-2); }
            .mission-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--sp-3); cursor: pointer; transition: all var(--transition-fast); }
            .mission-card:hover { border-color: var(--color-friendly); background: var(--bg-hover); }
            .mission-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--sp-2); }
            .mission-name { font-weight: 700; color: var(--color-friendly); font-size: var(--text-sm); }
            .mission-type { font-size: 9px; background: var(--bg-active); padding: 2px 6px; border-radius: 2px; text-transform: uppercase; font-weight: 600; color: var(--text-muted); }
            .mission-status { font-size: 10px; color: var(--text-dim); margin-bottom: var(--sp-2); font-style: italic; }
            .mission-units { display: flex; gap: 4px; flex-wrap: wrap; }
            .unit-tag { font-size: 9px; background: rgba(0,212,255,0.05); color: var(--color-friendly); border: 1px solid rgba(0,212,255,0.2); padding: 1px 4px; border-radius: 2px; font-family: var(--font-mono); }
            .create-mission-btn { width: 100%; background: var(--color-friendly); color: #000; border: none; padding: var(--sp-3); border-radius: var(--radius-sm); font-weight: 700; cursor: pointer; text-transform: uppercase; font-size: var(--text-xs); letter-spacing: 0.05em; transition: opacity var(--transition-fast); }
            .create-mission-btn:hover { opacity: 0.9; }
            .empty-state { text-align: center; color: var(--text-dim); padding: var(--sp-6) var(--sp-4); border: 1px dashed var(--border-color); border-radius: var(--radius-md); font-size: var(--text-xs); font-style: italic; }
        `;
    }

    protected render(): void {
        this.element.innerHTML = '';
        const createBtn = this.el('button', 'create-mission-btn', 'Create New Mission');
        createBtn.onclick = () => this.showCreateMissionDialog();
        
        this.listContainer = this.el('div', 'mission-list');
        
        this.element.appendChild(createBtn);
        this.element.appendChild(this.listContainer);

        this.refreshMissions();
        this.subscribe(UIStore.viewState, () => this.refreshMissions());
    }

    private refreshMissions() {
        if (!this.listContainer) return;
        const vs = UIStore.viewState.get();
        if (!vs) return;

        // Group units by mission
        const missionGroups = new Map<string, { units: string[], type: string, status: string }>();
        
        vs.units.forEach(u => {
            if (u.mission) {
                const missionId = u.mission.type + '-' + u.side; // Placeholder for actual mission ID if available
                if (!missionGroups.has(missionId)) {
                    missionGroups.set(missionId, { units: [], type: u.mission.type, status: u.mission.status });
                }
                missionGroups.get(missionId)!.units.push(u.id);
            }
        });

        this.listContainer.innerHTML = '';
        if (missionGroups.size === 0) {
            this.listContainer.innerHTML = `<div class="empty-state">No active missions. Assign units to create one.</div>`;
            return;
        }

        missionGroups.forEach((data, id) => {
            const card = this.el('div', 'mission-card');
            const header = this.el('div', 'mission-header');
            header.appendChild(this.el('div', 'mission-name', id));
            header.appendChild(this.el('div', 'mission-type', data.type));
            
            const status = this.el('div', 'mission-status', `Status: ${data.status}`);
            
            const units = this.el('div', 'mission-units');
            data.units.forEach(uid => {
                units.appendChild(this.el('span', 'unit-tag', uid.substring(0, 8)));
            });

            card.appendChild(header);
            card.appendChild(status);
            card.appendChild(units);
            
            card.onclick = () => UIStore.selectedEntityId.set(data.units[0]);
            this.listContainer.appendChild(card);
        });
    }

    private async showCreateMissionDialog() {
        const selectedId = UIStore.selectedEntityId.get();
        if (!selectedId) {
            alert('Please select a unit first to assign to a mission.');
            return;
        }

        const type = prompt('Mission Type (Patrol, Strike, ASW, Escort):', 'Patrol');
        if (!type) return;

        try {
            await UIStore.client.tools.execute('assign_mission', UIStore.currentMatchId.get() || 'default', Side.Blue, {
                unitId: selectedId,
                missionType: type
            });
        } catch (err: any) {
            alert(`Mission assignment failed: ${err.message}`);
        }
    }
}
