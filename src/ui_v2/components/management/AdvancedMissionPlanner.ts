import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { sdkClient } from '../../framework/Client';
import { MissionType } from '../../../sdk/schemas';

/**
 * AdvancedMissionPlanner: UI for complex multi-unit missions (Strike, Patrol, etc).
 */
export class AdvancedMissionPlanner extends Component {
    private missionTypeSelect!: HTMLSelectElement;
    private targetSelect!: HTMLSelectElement;
    private unitListEl!: HTMLElement;

    constructor() {
        super('div', 'mission-planner', 'mission-planner');
    }

    protected styles(): string {
        return `
            .mission-planner {
                padding: var(--sp-4);
                background: var(--bg-panel);
                border: 1px solid var(--border-color);
                display: flex;
                flex-direction: column;
                gap: var(--sp-4);
            }
            .form-group {
                display: flex;
                flex-direction: column;
                gap: var(--sp-2);
            }
            .form-label { font-size: var(--text-xs); color: var(--text-muted); }
            select, button {
                background: var(--bg-active);
                border: 1px solid var(--border-color);
                color: var(--text-main);
                padding: var(--sp-2);
                font-size: var(--text-sm);
            }
            button.primary {
                background: var(--color-friendly);
                color: white;
                font-weight: 600;
                margin-top: var(--sp-2);
            }
        `;
    }

    protected render(): void {
        this.element.innerHTML = `
            <div class="form-group">
                <span class="form-label">MISSION TYPE</span>
                <select id="mission-type">
                    <option value="${MissionType.Patrol}">Patrol</option>
                    <option value="${MissionType.Strike}">Strike</option>
                    <option value="${MissionType.ASW}">ASW</option>
                </select>
            </div>
            <div class="form-group">
                <span class="form-label">ASSIGN UNITS</span>
                <div id="mission-unit-list" style="max-height: 100px; overflow-y: auto; background: rgba(0,0,0,0.2); padding: 4px;">
                    <!-- Checkboxes populate here -->
                </div>
            </div>
            <div class="form-group">
                <span class="form-label">TARGET / AREA</span>
                <select id="mission-target">
                    <option value="">None / Geographic</option>
                </select>
            </div>
            <button class="primary" id="btn-assign-mission">CREATE MISSION</button>
        `;

        this.missionTypeSelect = this.element.querySelector('#mission-type') as HTMLSelectElement;
        this.targetSelect = this.element.querySelector('#mission-target') as HTMLSelectElement;
        this.unitListEl = this.element.querySelector('#mission-unit-list') as HTMLElement;

        const btn = this.element.querySelector('#btn-assign-mission') as HTMLButtonElement;
        this.listen(btn, 'click', () => this.handleCreateMission());

        // Reactive sync
        this.subscribe(UIStore.viewState, () => this.sync());
    }

    private sync() {
        const vs = UIStore.viewState.get();
        if (!vs) return;

        // Sync Units
        this.unitListEl.innerHTML = '';
        vs.units.forEach(u => {
            const label = document.createElement('label');
            label.style.display = 'flex';
            label.style.gap = '8px';
            label.style.fontSize = '12px';
            label.innerHTML = `<input type="checkbox" value="${u.id}"> ${u.id}`;
            this.unitListEl.appendChild(label);
        });

        // Sync Targets (Tracks)
        const currentTarget = this.targetSelect.value;
        this.targetSelect.innerHTML = '<option value="">Geographic Area</option>';
        vs.tracks.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = `${t.id} (${t.classification})`;
            if (t.id === currentTarget) opt.selected = true;
            this.targetSelect.appendChild(opt);
        });
    }

    private async handleCreateMission() {
        const type = this.missionTypeSelect.value as MissionType;
        const targetId = this.targetSelect.value;
        const selectedUnits = Array.from(this.unitListEl.querySelectorAll('input:checked')).map(i => (i as HTMLInputElement).value);

        if (selectedUnits.length === 0) return;

        console.log(`Creating mission: ${type} for units ${selectedUnits.join(', ')}`);

        for (const unitId of selectedUnits) {
            try {
                const params: Record<string, unknown> = {};
                if (targetId) params.targetId = targetId;

                await sdkClient.dispatch({ type: 'SetMission', entityId: unitId, mission: { missionType: type, ...params } } as unknown as any);
            } catch (err: unknown) {
                const error = err as Error;
                console.error(`Failed to assign mission to ${unitId}`, error);
            }
        }
    }
}
