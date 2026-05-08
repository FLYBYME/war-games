import { Component } from '../../framework/Component';
import { UIStore, ViewUnit } from '../../framework/UIStore';
import { sdkClient } from '../../framework/Client';
import { MissionType } from '../../../sdk/schemas';

/**
 * MissionPanel: Level 3 mission control for the selected unit.
 */
export class MissionPanel extends Component {
    constructor() {
        super('div', 'mission-panel', 'mission-panel');
    }

    protected styles(): string {
        return `
            .mission-panel { padding: 15px; background: #111; color: #ddd; }
            .mission-header { font-weight: bold; font-size: 12px; margin-bottom: 10px; color: #888; }
            .mission-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
            button { background: #222; border: 1px solid #333; color: #fff; padding: 6px; font-size: 11px; cursor: pointer; }
            button:hover { background: #333; }
            button.active { background: #00d1ff22; border-color: #00d1ff; color: #00d1ff; }
        `;
    }

    protected render(): void {
        this.element.innerHTML = `
            <div class="mission-header">MISSION CONTROL</div>
            <div class="mission-grid">
                <button id="btn-mission-patrol">PATROL</button>
                <button id="btn-mission-strike">STRIKE</button>
                <button id="btn-mission-asw">ASW</button>
                <button id="btn-mission-rtb">RTB</button>
            </div>
            <div id="mission-status" style="margin-top: 15px; font-size: 10px; color: #666;">
                Status: IDLE
            </div>
        `;

        this.listen(this.element.querySelector('#btn-mission-patrol')!, 'click', () => this.assignMission(MissionType.Patrol));
        this.listen(this.element.querySelector('#btn-mission-strike')!, 'click', () => this.assignMission(MissionType.Strike));
        
        this.subscribe(UIStore.viewState, () => this.sync());
    }

    private sync() {
        const entity = UIStore.getSelectedEntity();
        const statusEl = this.element.querySelector('#mission-status')!;
        
        if (entity && 'logState' in entity) {
            statusEl.textContent = `Status: ${(entity as ViewUnit).logState.toUpperCase()}`;
        } else {
            statusEl.textContent = 'Status: N/A';
        }
    }

    private async assignMission(type: MissionType) {
        const id = UIStore.selectedEntityId.get();
        if (!id) return;

        try {
            await sdkClient.dispatch({ type: 'SetMission', entityId: id, mission: { type: type as any, params: {} } as any });
            console.log(`Assigned mission ${type} to ${id}`);
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Mission assignment failed', error);
        }
    }
}
